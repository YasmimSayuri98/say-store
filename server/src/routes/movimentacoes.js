const express = require('express');
const prisma = require('../prisma');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { materialId, categoriaId, tipo, dataInicial, dataFinal, produtoId } = req.query;
    const where = {};
    if (materialId) where.materialId = Number(materialId);
    if (tipo) where.tipo = tipo;
    if (produtoId) where.produtoId = Number(produtoId);
    if (categoriaId) where.material = { categoriaId: Number(categoriaId) };
    if (dataInicial || dataFinal) {
      where.criadoEm = {};
      if (dataInicial) where.criadoEm.gte = new Date(dataInicial);
      if (dataFinal) { const d = new Date(dataFinal); d.setHours(23,59,59,999); where.criadoEm.lte = d; }
    }
    const movs = await prisma.movimentacaoEstoque.findMany({
      where,
      include: { material: { include: { unidade: true, categoria: true } } },
      orderBy: { criadoEm: 'desc' },
    });
    res.json(movs);
  } catch (e) { next(e); }
});

module.exports = router;
