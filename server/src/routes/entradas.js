const express = require('express');
const prisma = require('../prisma');
const { round4, custoMedioPonderado } = require('../utils/money');
const { parseDataDia } = require('../utils/data');
const { recalcularProdutosPorMaterial } = require('../services/custoService');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { materialId } = req.query;
    const where = {};
    if (materialId) where.materialId = Number(materialId);
    const entradas = await prisma.entradaEstoque.findMany({
      where,
      include: { material: { include: { unidade: true } }, fornecedor: true },
      orderBy: { dataCompra: 'desc' },
    });
    res.json(entradas);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const b = req.body;
    const materialId = Number(b.materialId);
    const quantidade = round4(b.quantidade);
    const valorTotal = round4(b.valorTotal);
    if (!materialId) return res.status(400).json({ erro: 'Material é obrigatório.' });
    if (!(quantidade > 0)) return res.status(400).json({ erro: 'Quantidade deve ser maior que zero.' });
    if (!(valorTotal >= 0)) return res.status(400).json({ erro: 'Valor total inválido.' });

    const resultado = await prisma.$transaction(async (tx) => {
      const material = await tx.material.findUnique({ where: { id: materialId } });
      if (!material) throw Object.assign(new Error('Material não encontrado.'), { status: 404 });

      const custoUnitario = round4(valorTotal / quantidade);
      const novoCustoMedio = custoMedioPonderado(material.quantidade, material.custoMedio, quantidade, valorTotal);
      const qtdAnterior = material.quantidade;
      const qtdResultante = round4(qtdAnterior + quantidade);

      const entrada = await tx.entradaEstoque.create({
        data: {
          materialId, quantidade, valorTotal, custoUnitario,
          custoMedioApos: novoCustoMedio,
          dataCompra: parseDataDia(b.dataCompra) || new Date(),
          fornecedorId: b.fornecedorId ? Number(b.fornecedorId) : null,
          observacao: b.observacao || null,
        },
      });

      await tx.material.update({
        where: { id: materialId },
        data: { quantidade: qtdResultante, custoMedio: novoCustoMedio },
      });

      await tx.movimentacaoEstoque.create({
        data: {
          materialId, tipo: 'ENTRADA_COMPRA',
          quantidadeAnterior: qtdAnterior,
          quantidadeMovimentada: quantidade,
          quantidadeResultante: qtdResultante,
          motivo: 'Entrada por compra',
          observacao: b.observacao || null,
        },
      });

      await recalcularProdutosPorMaterial(tx, materialId);
      return entrada;
    });

    res.status(201).json(resultado);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

module.exports = router;
