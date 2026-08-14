const crypto = require('crypto');
const prisma = require('../../prisma');

const HOST = process.env.SHOPEE_API_HOST || 'https://partner.shopeemobile.com';
const STATUS_ALVO = ['READY_TO_SHIP', 'PROCESSED']; // pedidos pagos que ainda precisam ser produzidos/embalados
const JANELA_INICIAL_DIAS = 7;

// Base string: partner_id + path + timestamp [+ access_token + shop_id]. HMAC-SHA256 com a partner_key, hex.
function assinar(path, timestamp, cfg, comShop) {
  const base = comShop
    ? `${cfg.appId}${path}${timestamp}${cfg.accessToken}${cfg.lojaId}`
    : `${cfg.appId}${path}${timestamp}`;
  return crypto.createHmac('sha256', cfg.appSecret).update(base).digest('hex');
}

async function chamar(path, { method = 'GET', query = {}, body, comShop = true, cfg }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = assinar(path, timestamp, cfg, comShop);
  const params = new URLSearchParams({
    partner_id: String(cfg.appId),
    timestamp: String(timestamp),
    sign,
    ...(comShop ? { shop_id: String(cfg.lojaId), access_token: cfg.accessToken } : {}),
  });
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const res = await fetch(`${HOST}${path}?${params.toString()}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (data.error) {
    throw Object.assign(
      new Error(`Shopee API (${path}): ${data.error}${data.message ? ' - ' + data.message : ''}`),
      { status: 502, apiError: data }
    );
  }
  return data;
}

// Monta o link de autorização da loja: o usuário abre essa URL, loga como dono da loja Shopee,
// aprova o acesso, e a Shopee redireciona para `redirectUri?code=...&shop_id=...`.
function linkAutorizacao(cfg, redirectUri) {
  const path = '/api/v2/shop/auth_partner';
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = assinar(path, timestamp, cfg, false);
  const params = new URLSearchParams({
    partner_id: String(cfg.appId),
    timestamp: String(timestamp),
    sign,
    redirect: redirectUri,
  });
  return `${HOST}${path}?${params.toString()}`;
}

// Troca o `code` (obtido após a autorização) pelo access_token/refresh_token definitivos,
// e já grava o shop_id retornado. Usado uma única vez, logo após autorizar a loja.
async function trocarCodigoPorToken(cfg, { code, shopId }) {
  const data = await chamar('/api/v2/auth/token/get', {
    method: 'POST',
    cfg,
    comShop: false,
    body: { code, partner_id: Number(cfg.appId), shop_id: Number(shopId) },
  });
  const expiraEm = new Date(Date.now() + (data.expire_in || 0) * 1000);
  return prisma.integracaoPlataforma.update({
    where: { plataformaId: cfg.plataformaId },
    data: {
      accessToken: data.access_token, refreshToken: data.refresh_token,
      lojaId: String(shopId), accessTokenExpiraEm: expiraEm,
    },
  });
}

// Renova o access_token usando o refresh_token e persiste o resultado na IntegracaoPlataforma.
async function renovarToken(cfg) {
  const data = await chamar('/api/v2/auth/access_token/get', {
    method: 'POST',
    cfg,
    comShop: false,
    body: { refresh_token: cfg.refreshToken, partner_id: Number(cfg.appId), shop_id: Number(cfg.lojaId) },
  });
  const expiraEm = new Date(Date.now() + (data.expire_in || 0) * 1000);
  return prisma.integracaoPlataforma.update({
    where: { plataformaId: cfg.plataformaId },
    data: { accessToken: data.access_token, refreshToken: data.refresh_token, accessTokenExpiraEm: expiraEm },
  });
}

async function listarPedidosBrutos(cfg, { timeFrom, timeTo, cursor = '', pageSize = 50, orderStatus }) {
  return chamar('/api/v2/order/get_order_list', {
    cfg,
    query: {
      time_range_field: 'update_time',
      time_from: timeFrom,
      time_to: timeTo,
      page_size: pageSize,
      cursor,
      order_status: orderStatus,
    },
  });
}

async function detalharPedidosBrutos(cfg, orderSnList) {
  return chamar('/api/v2/order/get_order_detail', {
    cfg,
    query: {
      order_sn_list: orderSnList.join(','),
      response_optional_fields: 'item_list,ship_by_date,order_status,create_time',
    },
  });
}

// Lista todos os produtos/SKUs ativos da loja, no formato { sku, nome }. Percorre os itens,
// busca o nome de cada um e, quando o item tem variações (models), pega o SKU de cada variação.
async function buscarProdutos(cfg) {
  const itemIds = [];
  let offset = 0;
  let hasNext = true;
  while (hasNext) {
    const resp = await chamar('/api/v2/product/get_item_list', {
      cfg,
      query: { offset, page_size: 100, item_status: 'NORMAL' },
    });
    const items = (resp.response && resp.response.item) || [];
    for (const it of items) itemIds.push(it.item_id);
    hasNext = !!(resp.response && resp.response.has_next_page);
    if (resp.response && resp.response.next_offset != null) offset = resp.response.next_offset;
    else offset += items.length;
    if (items.length === 0) break;
  }

  const produtos = [];
  for (let i = 0; i < itemIds.length; i += 50) {
    const bloco = itemIds.slice(i, i + 50);
    if (bloco.length === 0) continue;
    const resp = await chamar('/api/v2/product/get_item_base_info', { cfg, query: { item_id_list: bloco.join(',') } });
    const lista = (resp.response && resp.response.item_list) || [];
    for (const item of lista) {
      if (item.has_model) {
        const mr = await chamar('/api/v2/product/get_model_list', { cfg, query: { item_id: item.item_id } });
        const models = (mr.response && mr.response.model) || [];
        for (const m of models) {
          if (m.model_sku) produtos.push({ sku: String(m.model_sku).trim(), nome: item.item_name });
        }
      } else if (item.item_sku) {
        produtos.push({ sku: String(item.item_sku).trim(), nome: item.item_name });
      }
    }
  }

  // Deduplica por SKU (a mesma variação pode aparecer mais de uma vez).
  const porSku = new Map();
  for (const p of produtos) if (p.sku && !porSku.has(p.sku)) porSku.set(p.sku, p);
  return [...porSku.values()];
}

// Busca pedidos no formato normalizado usado pelo plataformaSyncService, independente do canal.
async function buscarPedidos(cfg, { desde }) {
  const agora = new Date();
  const timeTo = Math.floor(agora.getTime() / 1000);
  const inicio = desde || new Date(agora.getTime() - JANELA_INICIAL_DIAS * 24 * 3600 * 1000);
  const timeFrom = Math.floor(inicio.getTime() / 1000);

  const orderSns = new Set();
  for (const status of STATUS_ALVO) {
    let cursor = '';
    let more = true;
    while (more) {
      const resp = await listarPedidosBrutos(cfg, { timeFrom, timeTo, cursor, orderStatus: status });
      const lista = (resp.response && resp.response.order_list) || [];
      for (const o of lista) orderSns.add(o.order_sn);
      cursor = (resp.response && resp.response.next_cursor) || '';
      more = !!(resp.response && resp.response.more) && !!cursor;
    }
  }

  const pedidosNormalizados = [];
  const lista = [...orderSns];
  for (let i = 0; i < lista.length; i += 50) {
    const bloco = lista.slice(i, i + 50);
    if (bloco.length === 0) continue;
    const resp = await detalharPedidosBrutos(cfg, bloco);
    const pedidos = (resp.response && resp.response.order_list) || [];
    for (const p of pedidos) {
      pedidosNormalizados.push({
        numeroPedido: p.order_sn,
        status: p.order_status,
        prazoEnvio: p.ship_by_date ? new Date(p.ship_by_date * 1000) : null,
        dataPedido: p.create_time ? new Date(p.create_time * 1000) : null,
        itens: (p.item_list || []).map((item) => ({
          sku: item.model_sku || item.item_sku,
          nome: item.item_name || item.model_sku || item.item_sku,
          quantidade: item.model_quantity_purchased ?? item.item_quantity_purchased ?? 1,
        })).filter((it) => !!it.sku),
      });
    }
  }
  return pedidosNormalizados;
}

module.exports = { tipo: 'SHOPEE', renovarToken, buscarPedidos, buscarProdutos, linkAutorizacao, trocarCodigoPorToken };
