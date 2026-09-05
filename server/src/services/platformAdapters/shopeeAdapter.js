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

// Igual a chamar(), mas retorna o corpo BINÁRIO (usado para baixar o PDF da etiqueta).
// Se a Shopee responder JSON (erro), lança com a mensagem.
async function chamarBinario(path, { method = 'POST', query = {}, body, cfg }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = assinar(path, timestamp, cfg, true);
  const params = new URLSearchParams({
    partner_id: String(cfg.appId), timestamp: String(timestamp), sign,
    shop_id: String(cfg.lojaId), access_token: cfg.accessToken,
  });
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const res = await fetch(`${HOST}${path}?${params.toString()}`, {
    method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const data = await res.json();
    throw Object.assign(
      new Error(`Shopee API (${path}): ${data.error || 'erro'}${data.message ? ' - ' + data.message : ''}`),
      { status: 502, apiError: data }
    );
  }
  return Buffer.from(await res.arrayBuffer());
}

// Baixa a etiqueta oficial (PDF) dos pedidos informados. Pré-requisito: o envio já ter sido
// arranjado na Shopee (ex.: pelo UpSeller) e o app ter a permissão de Logística habilitada.
// Fluxo: descobrir o tipo do documento -> criar -> aguardar ficar pronto -> baixar o PDF.
async function baixarEtiquetas(cfg, orderSns) {
  const sns = [...new Set((orderSns || []).filter(Boolean))];
  if (sns.length === 0) return null;

  // 1) Tipo de documento sugerido por pedido (ex.: NORMAL_AIR_WAYBILL / THERMAL_AIR_WAYBILL).
  const paramResp = await chamar('/api/v2/logistics/get_shipping_document_parameter', {
    method: 'POST', cfg, body: { order_list: sns.map((sn) => ({ order_sn: sn })) },
  });
  const infoList = (paramResp.response && (paramResp.response.result_list || paramResp.response.info_list)) || [];
  const tipoPorSn = new Map();
  for (const info of infoList) {
    const tipo = info.suggest_shipping_document_type
      || (Array.isArray(info.selectable_shipping_document_type) && info.selectable_shipping_document_type[0])
      || 'NORMAL_AIR_WAYBILL';
    tipoPorSn.set(info.order_sn, tipo);
  }
  const tipoPadrao = tipoPorSn.get(sns[0]) || 'NORMAL_AIR_WAYBILL';
  const orderList = sns.map((sn) => ({ order_sn: sn, shipping_document_type: tipoPorSn.get(sn) || tipoPadrao }));

  // 2) Solicita a geração do documento. Em caso de "all failed", a Shopee coloca o motivo real
  // de cada pedido em response.result_list — extraímos para uma mensagem clara.
  try {
    await chamar('/api/v2/logistics/create_shipping_document', { method: 'POST', cfg, body: { order_list: orderList } });
  } catch (e) {
    const results = e.apiError && e.apiError.response && e.apiError.response.result_list;
    if (Array.isArray(results) && results.length) {
      const motivos = results.map((x) => `pedido ${x.order_sn}: ${x.fail_error || x.fail_message || 'falha'}`).join(' | ');
      throw Object.assign(new Error(`Shopee recusou gerar a etiqueta (tipo ${tipoPadrao}) — ${motivos}`), { status: 502 });
    }
    throw e;
  }

  // 3) Aguarda ficar pronto (a Shopee gera de forma assíncrona).
  let pronto = false;
  for (let tentativa = 0; tentativa < 12 && !pronto; tentativa++) {
    await new Promise((r) => setTimeout(r, 1500));
    const r = await chamar('/api/v2/logistics/get_shipping_document_result', { method: 'POST', cfg, body: { order_list: orderList } });
    const results = (r.response && r.response.result_list) || [];
    const falhou = results.find((x) => x.status === 'FAILED');
    if (falhou) {
      throw Object.assign(new Error(`A Shopee não gerou a etiqueta do pedido ${falhou.order_sn}: ${falhou.fail_error || falhou.fail_message || 'falha na geração'}.`), { status: 502 });
    }
    pronto = results.length > 0 && results.every((x) => x.status === 'READY');
  }
  if (!pronto) throw Object.assign(new Error('A Shopee ainda está gerando as etiquetas. Aguarde alguns segundos e clique novamente.'), { status: 504 });

  // 4) Baixa o PDF (uma via para todos os pedidos do mesmo tipo).
  return chamarBinario('/api/v2/logistics/download_shipping_document', {
    method: 'POST', cfg, body: { shipping_document_type: tipoPadrao, order_list: sns.map((sn) => ({ order_sn: sn })) },
  });
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

module.exports = { tipo: 'SHOPEE', renovarToken, buscarPedidos, buscarProdutos, linkAutorizacao, trocarCodigoPorToken, baixarEtiquetas };
