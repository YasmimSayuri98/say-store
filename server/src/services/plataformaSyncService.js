const prisma = require('../prisma');
const { normalizarPrazoLimite } = require('../utils/data');
const shopeeAdapter = require('./platformAdapters/shopeeAdapter');
const tiktokAdapter = require('./platformAdapters/tiktokAdapter');

const ADAPTERS = { SHOPEE: shopeeAdapter, TIKTOK: tiktokAdapter };

// Lê a config de uma plataforma, valida que está completa e renova o token se estiver perto de expirar.
async function obterConfigValida(plataformaId) {
  const cfg = await prisma.integracaoPlataforma.findUnique({ where: { plataformaId } });
  if (!cfg || !cfg.tipo || !cfg.appId || !cfg.appSecret || !cfg.lojaId || !cfg.accessToken) {
    throw Object.assign(
      new Error('Integração não configurada para esta plataforma. Preencha as credenciais em Plataformas → Integração de pedidos.'),
      { status: 400 }
    );
  }
  const adapter = ADAPTERS[cfg.tipo];
  if (!adapter) throw Object.assign(new Error(`Tipo de integração desconhecido: ${cfg.tipo}.`), { status: 400 });

  const prestesAExpirar = !cfg.accessTokenExpiraEm || cfg.accessTokenExpiraEm.getTime() - Date.now() < 5 * 60 * 1000;
  const cfgAtual = prestesAExpirar && cfg.refreshToken ? await adapter.renovarToken(cfg) : cfg;
  return { cfg: cfgAtual, adapter };
}

// Sincroniza os pedidos de UMA plataforma. Idempotente: nunca duplica pedido (numeroPedido único)
// nem item (pedidoId+skuPlataforma único), e nunca sobrescreve um item já sincronizado
// (preserva o campo `produzido`).
async function sincronizarPlataforma(plataformaId) {
  const { cfg, adapter } = await obterConfigValida(plataformaId);
  const pedidosBrutos = await adapter.buscarPedidos(cfg, { desde: cfg.ultimaSincronizacao });

  let pedidosNovos = 0;
  let itensNovos = 0;
  const semCorrespondencia = new Set();

  for (const p of pedidosBrutos) {
    if (!p.numeroPedido) continue;
    // Normaliza o prazo para o dia-limite (o dia que a plataforma mostra), à prova de fuso/cache.
    const prazo = normalizarPrazoLimite(p.prazoEnvio);
    const existiaPedido = await prisma.pedidoPlataforma.findUnique({ where: { numeroPedido: p.numeroPedido } });
    const pedido = await prisma.pedidoPlataforma.upsert({
      where: { numeroPedido: p.numeroPedido },
      create: {
        plataformaId, numeroPedido: p.numeroPedido, status: p.status,
        prazoEnvio: prazo, dataPedido: p.dataPedido,
      },
      update: { status: p.status, prazoEnvio: prazo },
    });
    if (!existiaPedido) pedidosNovos++;

    for (const item of p.itens) {
      const jaExiste = await prisma.itemPedidoPlataforma.findUnique({
        where: { pedidoId_skuPlataforma: { pedidoId: pedido.id, skuPlataforma: item.sku } },
      });
      if (jaExiste) continue;

      const produto = await prisma.produto.findUnique({ where: { sku: item.sku } });
      if (!produto) semCorrespondencia.add(item.sku);

      await prisma.itemPedidoPlataforma.create({
        data: {
          pedidoId: pedido.id, produtoId: produto ? produto.id : null,
          skuPlataforma: item.sku, nomePlataforma: item.nome, quantidade: item.quantidade,
        },
      });
      itensNovos++;
    }
  }

  await prisma.integracaoPlataforma.update({ where: { plataformaId }, data: { ultimaSincronizacao: new Date() } });
  return { pedidosNovos, itensNovos, semCorrespondencia: [...semCorrespondencia] };
}

// Sincroniza todas as plataformas com integração ativa. Usado pelo job periódico em background.
async function sincronizarTodasAtivas() {
  const ativas = await prisma.integracaoPlataforma.findMany({ where: { ativo: true } });
  const resultados = [];
  for (const cfg of ativas) {
    try {
      const r = await sincronizarPlataforma(cfg.plataformaId);
      resultados.push({ plataformaId: cfg.plataformaId, ok: true, ...r });
    } catch (e) {
      resultados.push({ plataformaId: cfg.plataformaId, ok: false, erro: e.message });
    }
  }
  return resultados;
}

// Baixa as etiquetas oficiais (PDF) de uma lista de pedidos de uma plataforma. Só Shopee por ora.
async function baixarEtiquetas(plataformaId, orderSns) {
  const { cfg, adapter } = await obterConfigValida(plataformaId);
  if (typeof adapter.baixarEtiquetas !== 'function') {
    throw Object.assign(new Error('Esta plataforma ainda não suporta baixar etiqueta pela API.'), { status: 400 });
  }
  return adapter.baixarEtiquetas(cfg, orderSns);
}

module.exports = { sincronizarPlataforma, sincronizarTodasAtivas, obterConfigValida, baixarEtiquetas };
