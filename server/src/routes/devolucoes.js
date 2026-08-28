const express = require('express');
const prisma = require('../prisma');
const { round4 } = require('../utils/money');
const router = express.Router();

// Lista as devoluções (mais recentes primeiro).
router.get('/', async (req, res, next) => {
  try {
    const devolucoes = await prisma.devolucao.findMany({
      include: { produto: true },
      orderBy: { criadoEm: 'desc' },
    });
    res.json(devolucoes);
  } catch (e) { next(e); }
});

// Registra uma devolução. Se aptoEstoque e houver produto, soma a quantidade ao estoque de
// produto pronto (Produto.estoque).
router.post('/', async (req, res, next) => {
  try {
    const b = req.body;
    const produtoId = b.produtoId ? Number(b.produtoId) : null;
    const quantidade = round4(b.quantidade);
    const aptoEstoque = !!b.aptoEstoque;
    if (!(quantidade > 0)) return res.status(400).json({ erro: 'Quantidade deve ser maior que zero.' });
    if (aptoEstoque && !produtoId) return res.status(400).json({ erro: 'Selecione o produto para devolver ao estoque.' });

    const devolucao = await prisma.$transaction(async (tx) => {
      let retornouEstoque = false;
      if (produtoId) {
        const p = await tx.produto.findUnique({ where: { id: produtoId } });
        if (!p) throw Object.assign(new Error('Produto não encontrado.'), { status: 404 });
        if (aptoEstoque) {
          await tx.produto.update({ where: { id: produtoId }, data: { estoque: round4(p.estoque + quantidade) } });
          retornouEstoque = true;
        }
      }
      return tx.devolucao.create({
        data: {
          produtoId,
          quantidade,
          aptoEstoque,
          retornouEstoque,
          numeroPedido: b.numeroPedido ? String(b.numeroPedido).trim() : null,
          motivo: b.motivo ? String(b.motivo).trim() : null,
        },
        include: { produto: true },
      });
    });
    res.status(201).json(devolucao);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

// Exclui um registro de devolução. Se ela havia retornado ao estoque, desfaz (remove a quantidade),
// desde que ainda haja estoque suficiente.
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.$transaction(async (tx) => {
      const d = await tx.devolucao.findUnique({ where: { id } });
      if (!d) throw Object.assign(new Error('Devolução não encontrada.'), { status: 404 });
      if (d.retornouEstoque && d.produtoId) {
        const p = await tx.produto.findUnique({ where: { id: d.produtoId } });
        if (p) {
          const novo = round4(p.estoque - d.quantidade);
          await tx.produto.update({ where: { id: d.produtoId }, data: { estoque: novo < 0 ? 0 : novo } });
        }
      }
      await tx.devolucao.delete({ where: { id } });
    });
    res.status(204).end();
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

module.exports = router;
