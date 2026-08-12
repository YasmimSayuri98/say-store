const express = require('express');
const prisma = require('../prisma');
const { round4 } = require('../utils/money');
const { sincronizarPlataforma } = require('../services/plataformaSyncService');
const router = express.Router();

const ADAPTERS = {
  SHOPEE: require('../services/platformAdapters/shopeeAdapter'),
  TIKTOK: require('../services/platformAdapters/tiktokAdapter'),
};

function mascarar(v) {
  if (!v) return null;
  const s = String(v);
  return s.length <= 4 ? '••••' : '•'.repeat(s.length - 4) + s.slice(-4);
}

function validar(b) {
  const erros = [];
  if (!b.nome || !b.nome.trim()) erros.push('Nome é obrigatório.');
  const nums = ['comissaoPercentual', 'taxaFixaPorItem', 'percentualFreteGratis'];
  for (const campo of nums) {
    if (b[campo] != null && (Number.isNaN(Number(b[campo])) || Number(b[campo]) < 0)) {
      erros.push(`Valor inválido em ${campo}.`);
    }
  }
  return erros;
}

router.get('/', async (req, res, next) => {
  try {
    const { ativo } = req.query;
    const where = {};
    if (ativo === 'true') where.ativo = true;
    if (ativo === 'false') where.ativo = false;
    const plataformas = await prisma.plataformaVenda.findMany({ where, orderBy: { nome: 'asc' } });
    res.json(plataformas);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const erros = validar(req.body);
    if (erros.length) return res.status(400).json({ erro: erros.join(' ') });
    const b = req.body;
    const existe = await prisma.plataformaVenda.findUnique({ where: { nome: b.nome.trim() } });
    if (existe) return res.status(409).json({ erro: 'Já existe uma plataforma com esse nome.' });
    const plataforma = await prisma.plataformaVenda.create({
      data: {
        nome: b.nome.trim(),
        comissaoPercentual: round4(b.comissaoPercentual || 0),
        taxaFixaPorItem: round4(b.taxaFixaPorItem || 0),
        percentualFreteGratis: round4(b.percentualFreteGratis || 0),
        ativo: b.ativo != null ? !!b.ativo : true,
      },
    });
    res.status(201).json(plataforma);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const erros = validar(req.body);
    if (erros.length) return res.status(400).json({ erro: erros.join(' ') });
    const b = req.body;
    const conflito = await prisma.plataformaVenda.findFirst({ where: { nome: b.nome.trim(), NOT: { id } } });
    if (conflito) return res.status(409).json({ erro: 'Já existe outra plataforma com esse nome.' });
    const plataforma = await prisma.plataformaVenda.update({
      where: { id },
      data: {
        nome: b.nome.trim(),
        comissaoPercentual: round4(b.comissaoPercentual || 0),
        taxaFixaPorItem: round4(b.taxaFixaPorItem || 0),
        percentualFreteGratis: round4(b.percentualFreteGratis || 0),
      },
    });
    res.json(plataforma);
  } catch (e) { next(e); }
});

// ---------- Integração de pedidos (Shopee / TikTok Shop) ----------

router.get('/:id/integracao', async (req, res, next) => {
  try {
    const plataformaId = Number(req.params.id);
    const cfg = await prisma.integracaoPlataforma.findUnique({ where: { plataformaId } });
    if (!cfg) return res.json({ configurado: false, ativo: false, tipo: null });
    res.json({
      configurado: !!(cfg.tipo && cfg.appId && cfg.appSecret && cfg.lojaId && cfg.accessToken),
      tipo: cfg.tipo,
      appId: cfg.appId,
      lojaId: cfg.lojaId,
      appSecretMascarado: mascarar(cfg.appSecret),
      accessTokenMascarado: mascarar(cfg.accessToken),
      refreshTokenMascarado: mascarar(cfg.refreshToken),
      ativo: cfg.ativo,
      ultimaSincronizacao: cfg.ultimaSincronizacao,
      accessTokenExpiraEm: cfg.accessTokenExpiraEm,
    });
  } catch (e) { next(e); }
});

// Campos de credencial só são atualizados quando enviados não-vazios, para permitir salvar
// outros campos (ex: ativo) sem precisar redigitar tokens já salvos.
router.put('/:id/integracao', async (req, res, next) => {
  try {
    const plataformaId = Number(req.params.id);
    const plataforma = await prisma.plataformaVenda.findUnique({ where: { id: plataformaId } });
    if (!plataforma) return res.status(404).json({ erro: 'Plataforma não encontrada.' });

    const { tipo, appId, appSecret, lojaId, accessToken, refreshToken, ativo } = req.body;
    if (tipo && !['SHOPEE', 'TIKTOK'].includes(tipo)) return res.status(400).json({ erro: 'Tipo de integração inválido.' });

    const existente = await prisma.integracaoPlataforma.findUnique({ where: { plataformaId } });
    if (!existente && !tipo) return res.status(400).json({ erro: 'Selecione o tipo de integração (Shopee ou TikTok Shop).' });

    const data = {};
    if (tipo) data.tipo = tipo;
    if (appId !== undefined && appId !== '') data.appId = appId;
    if (appSecret) data.appSecret = appSecret;
    if (lojaId !== undefined && lojaId !== '') data.lojaId = lojaId;
    if (accessToken) data.accessToken = accessToken;
    if (refreshToken) data.refreshToken = refreshToken;
    if (ativo !== undefined) data.ativo = !!ativo;

    const cfg = await prisma.integracaoPlataforma.upsert({
      where: { plataformaId },
      create: { plataformaId, tipo, ...data },
      update: data,
    });
    res.json({ ok: true, ativo: cfg.ativo, tipo: cfg.tipo });
  } catch (e) { next(e); }
});

// Gera o link de autorização da loja (o usuário abre, loga como dono da loja e aprova).
// Exige que Partner ID/App ID e Partner Key/App Secret já estejam salvos.
router.get('/:id/integracao/link-autorizacao', async (req, res, next) => {
  try {
    const plataformaId = Number(req.params.id);
    const cfg = await prisma.integracaoPlataforma.findUnique({ where: { plataformaId } });
    if (!cfg || !cfg.appId || !cfg.appSecret) {
      return res.status(400).json({ erro: 'Preencha e salve o Partner ID/App ID e o Partner Key/App Secret antes de conectar.' });
    }
    const redirectUri = req.query.redirect;
    if (!redirectUri) return res.status(400).json({ erro: 'Informe a URL de redirecionamento.' });
    const adapter = ADAPTERS[cfg.tipo];
    if (!adapter || !adapter.linkAutorizacao) {
      return res.status(400).json({ erro: 'Conexão automática ainda não disponível para este tipo de integração.' });
    }
    res.json({ url: adapter.linkAutorizacao(cfg, redirectUri) });
  } catch (e) { next(e); }
});

// Troca o `code` (e, no caso da Shopee, o `shop_id`) obtidos após a autorização pelos
// access_token/refresh_token definitivos — salva tudo automaticamente.
router.post('/:id/integracao/trocar-codigo', async (req, res, next) => {
  try {
    const plataformaId = Number(req.params.id);
    const cfg = await prisma.integracaoPlataforma.findUnique({ where: { plataformaId } });
    if (!cfg) return res.status(404).json({ erro: 'Integração não configurada.' });
    const { code, shopId } = req.body;
    if (!code) return res.status(400).json({ erro: 'Informe o código retornado pela autorização.' });
    const adapter = ADAPTERS[cfg.tipo];
    if (!adapter || !adapter.trocarCodigoPorToken) {
      return res.status(400).json({ erro: 'Conexão automática ainda não disponível para este tipo de integração.' });
    }
    const atualizado = await adapter.trocarCodigoPorToken(cfg, { code, shopId });
    res.json({ ok: true, lojaId: atualizado.lojaId });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

router.post('/:id/integracao/sync', async (req, res, next) => {
  try {
    const plataformaId = Number(req.params.id);
    const resultado = await sincronizarPlataforma(plataformaId);
    res.json(resultado);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const plataforma = await prisma.plataformaVenda.update({
      where: { id: Number(req.params.id) },
      data: { ativo: !!req.body.ativo },
    });
    res.json(plataforma);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const usada = await prisma.registroEnvio.count({ where: { plataformaId: id } });
    if (usada > 0) return res.status(409).json({ erro: 'Plataforma possui envios registrados. Apenas inativação é permitida.' });
    await prisma.precoProduto.deleteMany({ where: { plataformaId: id } });
    await prisma.plataformaVenda.delete({ where: { id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
