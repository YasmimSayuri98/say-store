const express = require('express');
const prisma = require('../prisma');
const { round4 } = require('../utils/money');
const router = express.Router();

// Monta o custo estimado de uma embalagem (Σ material × custo médio atual).
function comCusto(embalagem) {
  const itens = embalagem.itens.map((it) => ({
    id: it.id,
    materialId: it.materialId,
    materialNome: it.material.nome,
    unidadeSigla: it.material.unidade.sigla,
    quantidade: it.quantidade,
    custoUnitario: it.material.custoMedio,
    custoNaEmbalagem: round4(it.quantidade * it.material.custoMedio),
    estoqueDisponivel: it.material.quantidade,
  }));
  const custoEstimado = itens.reduce((s, i) => round4(s + i.custoNaEmbalagem), 0);
  return { ...embalagem, itens, custoEstimado };
}

const includeItens = { itens: { include: { material: { include: { unidade: true } } } } };

router.get('/', async (req, res, next) => {
  try {
    const { ativo } = req.query;
    const where = {};
    if (ativo === 'true') where.ativo = true;
    if (ativo === 'false') where.ativo = false;
    const embalagens = await prisma.embalagem.findMany({ where, include: includeItens, orderBy: { nome: 'asc' } });
    res.json(embalagens.map(comCusto));
  } catch (e) { next(e); }
});

// Valida e normaliza os itens (materiais + quantidades) de uma embalagem.
async function validarItens(itens) {
  if (!Array.isArray(itens) || itens.length === 0) throw Object.assign(new Error('Adicione ao menos um material à embalagem.'), { status: 400 });
  const ids = [];
  for (const it of itens) {
    const materialId = Number(it.materialId);
    if (!materialId) throw Object.assign(new Error('Material obrigatório em item da embalagem.'), { status: 400 });
    if (!(Number(it.quantidade) > 0)) throw Object.assign(new Error('Quantidade deve ser maior que zero.'), { status: 400 });
    const mat = await prisma.material.findUnique({ where: { id: materialId } });
    if (!mat) throw Object.assign(new Error('Material inexistente na embalagem.'), { status: 400 });
    if (!mat.ativo) throw Object.assign(new Error(`Material inativo não pode ser usado: ${mat.nome}.`), { status: 400 });
    ids.push(materialId);
  }
  if (new Set(ids).size !== ids.length) throw Object.assign(new Error('Material duplicado na embalagem.'), { status: 400 });
  return itens.map((it) => ({ materialId: Number(it.materialId), quantidade: round4(it.quantidade) }));
}

router.post('/', async (req, res, next) => {
  try {
    const nome = (req.body.nome || '').trim();
    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
    const existe = await prisma.embalagem.findUnique({ where: { nome } });
    if (existe) return res.status(409).json({ erro: 'Já existe uma embalagem com esse nome.' });
    const itens = await validarItens(req.body.itens);
    const embalagem = await prisma.embalagem.create({
      data: { nome, itens: { create: itens } },
      include: includeItens,
    });
    res.status(201).json(comCusto(embalagem));
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existente = await prisma.embalagem.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ erro: 'Embalagem não encontrada.' });
    const nome = (req.body.nome || '').trim();
    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
    const colisao = await prisma.embalagem.findFirst({ where: { nome, NOT: { id } } });
    if (colisao) return res.status(409).json({ erro: 'Já existe outra embalagem com esse nome.' });
    const itens = await validarItens(req.body.itens);

    const embalagem = await prisma.$transaction(async (tx) => {
      await tx.itemEmbalagem.deleteMany({ where: { embalagemId: id } });
      await tx.embalagem.update({ where: { id }, data: { nome, itens: { create: itens } } });
      return tx.embalagem.findUnique({ where: { id }, include: includeItens });
    });
    res.json(comCusto(embalagem));
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const embalagem = await prisma.embalagem.update({ where: { id: Number(req.params.id) }, data: { ativo: !!req.body.ativo } });
    res.json(embalagem);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const emUso = await prisma.usoEmbalagem.count({ where: { embalagemId: id } });
    if (emUso > 0) return res.status(409).json({ erro: 'Esta embalagem já foi usada em envios. Você pode inativá-la em vez de excluir.' });
    await prisma.itemEmbalagem.deleteMany({ where: { embalagemId: id } });
    await prisma.embalagem.delete({ where: { id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
