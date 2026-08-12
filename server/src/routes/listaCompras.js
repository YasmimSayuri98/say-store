const express = require('express');
const prisma = require('../prisma');
const { situacaoEstoque } = require('../services/estoqueService');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const materiais = await prisma.material.findMany({
      where: { ativo: true },
      include: { categoria: true, unidade: true, entradas: { orderBy: { dataCompra: 'desc' }, take: 1, include: { fornecedor: true } } },
      orderBy: { nome: 'asc' },
    });
    const lista = materiais
      .filter((m) => m.quantidade <= m.quantidadeMinima)
      .map((m) => {
        const ultima = m.entradas[0] || null;
        return {
          id: m.id, nome: m.nome, categoria: m.categoria.nome, unidade: m.unidade.sigla,
          quantidade: m.quantidade, quantidadeMinima: m.quantidadeMinima,
          situacao: situacaoEstoque(m.quantidade, m.quantidadeMinima),
          custoUltimaCompra: ultima ? ultima.custoUnitario : null,
          fornecedorUltimaCompra: ultima && ultima.fornecedor ? ultima.fornecedor.nome : null,
        };
      });
    res.json(lista);
  } catch (e) { next(e); }
});

module.exports = router;
