const crypto = require('crypto');
const prisma = require('../../prisma');

const HOST = process.env.TIKTOK_API_HOST || 'https://open-api.tiktokglobalshop.com';
const JANELA_INICIAL_DIAS = 7;
// Pedidos pagos que ainda precisam ser produzidos/embalados antes do envio.
// NOTA: valores de order_status ainda não confirmados contra uma resposta real da API —
// ajustar assim que houver credenciais reais (ver README da integração / mensagem ao usuário).
const STATUS_ALVO = ['AWAITING_SHIPMENT'];

// Assinatura TikTok Shop API: HMAC-SHA256 usando o app_secret como chave, sobre
// app_secret + path + (parâmetros de query ordenados alfabeticamente, concatenados "chave"+"valor")
// + body (se houver) + app_secret. Resultado em hex.
function assinar(path, query, body, cfg) {
  const chaves = Object.keys(query).sort();
  let base = path;
  for (const k of chaves) base += k + query[k];
  if (body) base += JSON.stringify(body);
  base = cfg.appSecret + base + cfg.appSecret;
  return crypto.createHmac('sha256', cfg.appSecret).update(base).digest('hex');
}

async function chamar(path, { method = 'GET', query = {}, body, comToken = true, cfg }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const queryCompleta = {
    app_key: cfg.appId,
    timestamp: String(timestamp),
    ...(comToken && cfg.lojaId ? { shop_cipher: cfg.lojaId } : {}),
  };
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') queryCompleta[k] = String(v);
  }
  const sign = assinar(path, queryCompleta, body, cfg);
  const params = new URLSearchParams({ ...queryCompleta, sign });
  const headers = { 'Content-Type': 'application/json' };
  if (comToken) headers['x-tts-access-token'] = cfg.accessToken;

  const res = await fetch(`${HOST}${path}?${params.toString()}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (data.code && data.code !== 0) {
    throw Object.assign(
      new Error(`TikTok Shop API (${path}): ${data.code} - ${data.message || ''}`),
      { status: 502, apiError: data }
    );
  }
  return data;
}

// Renova o access_token usando o refresh_token e persiste o resultado na IntegracaoPlataforma.
async function renovarToken(cfg) {
  const data = await chamar('/authorization/202309/token/refresh', {
    cfg,
    comToken: false,
    query: { app_key: cfg.appId, refresh_token: cfg.refreshToken, grant_type: 'refresh_token' },
  });
  const info = data.data || {};
  const expiraEm = info.access_token_expire_in ? new Date(info.access_token_expire_in * 1000) : null;
  return prisma.integracaoPlataforma.update({
    where: { plataformaId: cfg.plataformaId },
    data: { accessToken: info.access_token, refreshToken: info.refresh_token, accessTokenExpiraEm: expiraEm },
  });
}

// NOTA: nome exato do campo de prazo de envio (SLA) ainda não confirmado contra uma resposta
// real da API — a documentação pública não deixou isso claro. Isolado aqui para ajuste rápido.
function extrairPrazoEnvio(pedidoBruto) {
  const candidato = pedidoBruto.collection_due_time || pedidoBruto.rts_time || pedidoBruto.ttl || pedidoBruto.delivery_due_time;
  return candidato ? new Date(candidato * 1000) : null;
}

async function buscarPedidosBrutos(cfg, { timeFrom, timeTo, pageToken, status }) {
  return chamar('/order/202309/orders/search', {
    method: 'POST',
    cfg,
    query: { page_size: 50, ...(pageToken ? { page_token: pageToken } : {}) },
    body: {
      order_status: status,
      create_time_ge: timeFrom,
      create_time_lt: timeTo,
    },
  });
}

// Busca pedidos no formato normalizado usado pelo plataformaSyncService, independente do canal.
async function buscarPedidos(cfg, { desde }) {
  const agora = new Date();
  const timeTo = Math.floor(agora.getTime() / 1000);
  const inicio = desde || new Date(agora.getTime() - JANELA_INICIAL_DIAS * 24 * 3600 * 1000);
  const timeFrom = Math.floor(inicio.getTime() / 1000);

  const pedidosNormalizados = [];
  for (const status of STATUS_ALVO) {
    let pageToken;
    let temMais = true;
    while (temMais) {
      const resp = await buscarPedidosBrutos(cfg, { timeFrom, timeTo, pageToken, status });
      const info = resp.data || {};
      const pedidos = info.orders || [];
      for (const p of pedidos) {
        pedidosNormalizados.push({
          numeroPedido: p.id || p.order_id,
          status: p.status,
          prazoEnvio: extrairPrazoEnvio(p),
          dataPedido: p.create_time ? new Date(p.create_time * 1000) : null,
          itens: (p.line_items || p.item_list || []).map((item) => ({
            sku: item.seller_sku || item.sku_id,
            nome: item.product_name || item.seller_sku,
            quantidade: item.quantity ?? 1,
          })).filter((it) => !!it.sku),
        });
      }
      pageToken = info.next_page_token;
      temMais = !!pageToken;
    }
  }
  return pedidosNormalizados;
}

module.exports = { tipo: 'TIKTOK', renovarToken, buscarPedidos };
