const express = require('express');
const prisma = require('../prisma');
const { situacaoEstoque } = require('../services/estoqueService');
const { round4 } = require('../utils/money');
const router = express.Router();

function comSituacao(m) {
  return { ...m, situacao: situacaoEstoque(m.quantidade, m.quantidadeMinima) };
}

// Listar (com busca, filtro por categoria/status)
router.get('/', async (req, res, next) => {
  try {
    const { busca, categoriaId, ativo } = req.query;
    const where = {};
    if (busca) where.nome = { contains: busca };
    if (categoriaId) where.categoriaId = Number(categoriaId);
    if (ativo === 'true') where.ativo = true;
    if (ativo === 'false') where.ativo = false;
    const materiais = await prisma.material.findMany({
      where,
      include: { categoria: true, unidade: true, filamento: true },
      orderBy: { nome: 'asc' },
    });
    res.json(materiais.map(comSituacao));
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const m = await prisma.material.findUnique({
      where: { id: Number(req.params.id) },
      include: { categoria: true, unidade: true, filamento: true },
    });
    if (!m) return res.status(404).json({ erro: 'Material não encontrado.' });
    res.json(comSituacao(m));
  } catch (e) { next(e); }
});

function validarMaterial(body) {
  const erros = [];
  if (!body.nome || !body.nome.trim()) erros.push('Nome é obrigatório.');
  if (!body.categoriaId) erros.push('Categoria é obrigatória.');
  if (!body.unidadeId) erros.push('Unidade de medida é obrigatória.');
  if (body.quantidade != null && Number(body.quantidade) < 0) erros.push('Quantidade não pode ser negativa.');
  if (body.quantidadeMinima != null && Number(body.quantidadeMinima) < 0) erros.push('Quantidade mínima não pode ser negativa.');
  if (body.custoMedio != null && Number(body.custoMedio) < 0) erros.push('Custo médio não pode ser negativo.');
  return erros;
}

router.post('/', async (req, res, next) => {
  try {
    const erros = validarMaterial(req.body);
    if (erros.length) return res.status(400).json({ erro: erros.join(' ') });
    const b = req.body;
    const material = await prisma.material.create({
      data: {
        nome: b.nome.trim(),
        categoriaId: Number(b.categoriaId),
        unidadeId: Number(b.unidadeId),
        quantidade: round4(b.quantidade || 0),
        quantidadeMinima: round4(b.quantidadeMinima || 0),
        custoMedio: round4(b.custoMedio || 0),
        observacoes: b.observacoes || null,
        ativo: b.ativo != null ? !!b.ativo : true,
        filamento: b.filamento
          ? {
              create: {
                tipo: b.filamento.tipo || null,
                marca: b.filamento.marca || null,
                cor: b.filamento.cor || null,
                pesoOriginalRolo: b.filamento.pesoOriginalRolo != null ? round4(b.filamento.pesoOriginalRolo) : null,
                pesoDisponivel: b.filamento.pesoDisponivel != null ? round4(b.filamento.pesoDisponivel) : null,
                observacoes: b.filamento.observacoes || null,
              },
            }
          : undefined,
      },
      include: { categoria: true, unidade: true, filamento: true },
    });
    res.status(201).json(comSituacao(material));
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const erros = validarMaterial(req.body);
    if (erros.length) return res.status(400).json({ erro: erros.join(' ') });
    const b = req.body;
    const existente = await prisma.material.findUnique({ where: { id }, include: { filamento: true } });
    if (!existente) return res.status(404).json({ erro: 'Material não encontrado.' });

    const material = await prisma.material.update({
      where: { id },
      data: {
        nome: b.nome.trim(),
        categoriaId: Number(b.categoriaId),
        unidadeId: Number(b.unidadeId),
        quantidadeMinima: round4(b.quantidadeMinima || 0),
        observacoes: b.observacoes || null,
        // quantidade e custoMedio não são editados aqui: usar entrada/ajuste.
        filamento: b.filamento
          ? existente.filamento
            ? { update: {
                tipo: b.filamento.tipo || null, marca: b.filamento.marca || null, cor: b.filamento.cor || null,
                pesoOriginalRolo: b.filamento.pesoOriginalRolo != null ? round4(b.filamento.pesoOriginalRolo) : null,
                pesoDisponivel: b.filamento.pesoDisponivel != null ? round4(b.filamento.pesoDisponivel) : null,
                observacoes: b.filamento.observacoes || null } }
            : { create: {
                tipo: b.filamento.tipo || null, marca: b.filamento.marca || null, cor: b.filamento.cor || null,
                pesoOriginalRolo: b.filamento.pesoOriginalRolo != null ? round4(b.filamento.pesoOriginalRolo) : null,
                pesoDisponivel: b.filamento.pesoDisponivel != null ? round4(b.filamento.pesoDisponivel) : null,
                observacoes: b.filamento.observacoes || null } }
          : undefined,
      },
      include: { categoria: true, unidade: true, filamento: true },
    });
    res.json(comSituacao(material));
  } catch (e) { next(e); }
});

// Ativar/inativar
router.patch('/:id/status', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const material = await prisma.material.update({ where: { id }, data: { ativo: !!req.body.ativo } });
    res.json(material);
  } catch (e) { next(e); }
});

// Exclusão: apenas se não houver movimentações
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const movs = await prisma.movimentacaoEstoque.count({ where: { materialId: id } });
    if (movs > 0) return res.status(409).json({ erro: 'Material possui movimentações. Apenas inativação é permitida.' });
    const fichas = await prisma.itemFichaTecnica.count({ where: { materialId: id } });
    if (fichas > 0) return res.status(409).json({ erro: 'Material está em fichas técnicas. Apenas inativação é permitida.' });
    await prisma.filamentoDetalhe.deleteMany({ where: { materialId: id } });
    await prisma.material.delete({ where: { id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
