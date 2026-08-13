const express = require('express');
const prisma = require('../prisma');
const { round4 } = require('../utils/money');
const { recalcularCustoProduto } = require('../services/custoService');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { busca, ativo } = req.query;
    const where = {};
    if (busca) where.OR = [{ nome: { contains: busca } }, { sku: { contains: busca } }];
    if (ativo === 'true') where.ativo = true;
    if (ativo === 'false') where.ativo = false;
    const produtos = await prisma.produto.findMany({ where, orderBy: { nome: 'asc' } });
    res.json(produtos);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const produto = await prisma.produto.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        itensFicha: { include: { material: { include: { unidade: true } } } },
      },
    });
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });

    const ficha = produto.itensFicha.map((item) => ({
      id: item.id,
      materialId: item.materialId,
      materialNome: item.material.nome,
      unidadeSigla: item.material.unidade.sigla,
      quantidade: item.quantidade,
      custoUnitario: item.material.custoMedio,
      custoNoProduto: round4(item.quantidade * item.material.custoMedio),
    }));
    res.json({ ...produto, ficha });
  } catch (e) { next(e); }
});

function validarProduto(b) {
  const erros = [];
  if (!b.nome || !b.nome.trim()) erros.push('Nome é obrigatório.');
  if (!b.sku || !b.sku.trim()) erros.push('SKU é obrigatório.');
  return erros;
}

router.post('/', async (req, res, next) => {
  try {
    const erros = validarProduto(req.body);
    if (erros.length) return res.status(400).json({ erro: erros.join(' ') });
    const b = req.body;
    const existe = await prisma.produto.findUnique({ where: { sku: b.sku.trim() } });
    if (existe) return res.status(409).json({ erro: 'Já existe um produto com esse SKU.' });
    const produto = await prisma.produto.create({
      data: {
        nome: b.nome.trim(), sku: b.sku.trim(), descricao: b.descricao || null,
        ativo: b.ativo != null ? !!b.ativo : true, personalizado: !!b.personalizado,
      },
    });
    res.status(201).json(produto);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const erros = validarProduto(req.body);
    if (erros.length) return res.status(400).json({ erro: erros.join(' ') });
    const b = req.body;
    const conflito = await prisma.produto.findFirst({ where: { sku: b.sku.trim(), NOT: { id } } });
    if (conflito) return res.status(409).json({ erro: 'Já existe outro produto com esse SKU.' });
    const produto = await prisma.produto.update({
      where: { id },
      data: { nome: b.nome.trim(), sku: b.sku.trim(), descricao: b.descricao || null, personalizado: !!b.personalizado },
    });
    res.json(produto);
  } catch (e) { next(e); }
});

// Gera um SKU único a partir de uma base (ex.: "ABC-COPIA", "ABC-COPIA-2", ...).
async function gerarSkuUnico(db, base) {
  let candidato = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await db.produto.findUnique({ where: { sku: candidato } })) {
    n += 1;
    candidato = `${base}-${n}`;
  }
  return candidato;
}

// Duplica um produto (dados + ficha técnica) para facilitar cadastrar um produto parecido.
// O novo produto nasce com nome "(cópia)" e um SKU novo; a pessoa ajusta em seguida.
router.post('/:id/duplicar', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const original = await prisma.produto.findUnique({
      where: { id },
      include: { itensFicha: true },
    });
    if (!original) return res.status(404).json({ erro: 'Produto não encontrado.' });

    const novo = await prisma.$transaction(async (tx) => {
      const sku = await gerarSkuUnico(tx, `${original.sku}-COPIA`);
      const criado = await tx.produto.create({
        data: {
          nome: `${original.nome} (cópia)`,
          sku,
          descricao: original.descricao,
          ativo: true,
          personalizado: original.personalizado,
          custosExtras: original.custosExtras,
          margemLucroAlvo: original.margemLucroAlvo,
          itensFicha: {
            create: original.itensFicha.map((it) => ({ materialId: it.materialId, quantidade: it.quantidade })),
          },
        },
      });
      await recalcularCustoProduto(tx, criado.id);
      return criado;
    });

    const completo = await prisma.produto.findUnique({ where: { id: novo.id } });
    res.status(201).json(completo);
  } catch (e) { next(e); }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const produto = await prisma.produto.update({ where: { id: Number(req.params.id) }, data: { ativo: !!req.body.ativo } });
    res.json(produto);
  } catch (e) { next(e); }
});

// Substituir ficha técnica completa
router.put('/:id/ficha', async (req, res, next) => {
  try {
    const produtoId = Number(req.params.id);
    const itens = Array.isArray(req.body.itens) ? req.body.itens : [];
    // Validar materiais ativos e quantidades
    for (const it of itens) {
      if (!it.materialId) return res.status(400).json({ erro: 'Material obrigatório em item da ficha.' });
      if (!(Number(it.quantidade) > 0)) return res.status(400).json({ erro: 'Quantidade deve ser maior que zero na ficha.' });
      const mat = await prisma.material.findUnique({ where: { id: Number(it.materialId) } });
      if (!mat) return res.status(400).json({ erro: 'Material inexistente na ficha.' });
      if (!mat.ativo) return res.status(400).json({ erro: `Material inativo não pode ser adicionado: ${mat.nome}.` });
    }
    // Evitar duplicados
    const ids = itens.map((i) => Number(i.materialId));
    if (new Set(ids).size !== ids.length) return res.status(400).json({ erro: 'Material duplicado na ficha técnica.' });

    await prisma.$transaction(async (tx) => {
      await tx.itemFichaTecnica.deleteMany({ where: { produtoId } });
      for (const it of itens) {
        await tx.itemFichaTecnica.create({
          data: { produtoId, materialId: Number(it.materialId), quantidade: round4(it.quantidade) },
        });
      }
      await recalcularCustoProduto(tx, produtoId);
    });

    const produto = await prisma.produto.findUnique({
      where: { id: produtoId },
      include: { itensFicha: { include: { material: { include: { unidade: true } } } } },
    });
    res.json(produto);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const envios = await prisma.itemRegistroEnvio.count({ where: { produtoId: id } });
    if (envios > 0) return res.status(409).json({ erro: 'Produto possui registros de envio. Apenas inativação é permitida.' });
    await prisma.itemFichaTecnica.deleteMany({ where: { produtoId: id } });
    await prisma.produto.delete({ where: { id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
