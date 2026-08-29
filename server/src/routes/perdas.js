const express = require('express');
const prisma = require('../prisma');
const { round4 } = require('../utils/money');
const router = express.Router();

const TIPOS = ['TESTE', 'ERRO_PRODUCAO'];

// Lista as perdas (mais recentes primeiro).
router.get('/', async (req, res, next) => {
  try {
    const perdas = await prisma.perda.findMany({
      include: { produto: true, material: { include: { unidade: true } } },
      orderBy: { criadoEm: 'desc' },
    });
    res.json(perdas);
  } catch (e) { next(e); }
});

// Registra uma perda: desconta o material do estoque (bloqueia se faltar) e guarda o custo.
router.post('/', async (req, res, next) => {
  try {
    const b = req.body;
    const tipo = TIPOS.includes(b.tipo) ? b.tipo : null;
    const materialId = Number(b.materialId);
    const quantidade = round4(b.quantidade);
    const produtoId = b.produtoId ? Number(b.produtoId) : null;
    const nomeProdutoTeste = b.nomeProdutoTeste ? String(b.nomeProdutoTeste).trim() : null;

    if (!tipo) return res.status(400).json({ erro: 'Tipo de perda inválido (teste ou erro de produção).' });
    if (!materialId) return res.status(400).json({ erro: 'Selecione o material.' });
    if (!(quantidade > 0)) return res.status(400).json({ erro: 'Quantidade deve ser maior que zero.' });
    if (!produtoId && !nomeProdutoTeste) return res.status(400).json({ erro: 'Informe o produto (cadastrado) ou o nome do produto testado.' });

    const perda = await prisma.$transaction(async (tx) => {
      const material = await tx.material.findUnique({ where: { id: materialId } });
      if (!material) throw Object.assign(new Error('Material não encontrado.'), { status: 404 });
      if (material.quantidade < quantidade) {
        throw Object.assign(new Error(`Estoque insuficiente de ${material.nome}: disponível ${material.quantidade}, necessário ${quantidade}.`), { status: 409 });
      }
      const qtdAnterior = material.quantidade;
      const qtdResultante = round4(qtdAnterior - quantidade);
      await tx.material.update({ where: { id: materialId }, data: { quantidade: qtdResultante } });

      const rotulo = tipo === 'TESTE' ? 'Teste' : 'Erro de produção';
      const nomeRef = produtoId ? '' : (nomeProdutoTeste ? ` (${nomeProdutoTeste})` : '');
      await tx.movimentacaoEstoque.create({
        data: {
          materialId, tipo: 'SAIDA_PERDA',
          quantidadeAnterior: qtdAnterior, quantidadeMovimentada: quantidade, quantidadeResultante: qtdResultante,
          motivo: `${rotulo}${nomeRef}`, produtoId: produtoId || undefined,
        },
      });

      const custoTotal = round4(quantidade * (material.custoMedio || 0));
      return tx.perda.create({
        data: {
          tipo, produtoId, nomeProdutoTeste, materialId, quantidade, custoTotal,
          motivo: b.motivo ? String(b.motivo).trim() : null,
        },
        include: { produto: true, material: { include: { unidade: true } } },
      });
    });
    res.status(201).json(perda);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

// Exclui uma perda e devolve o material ao estoque.
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.$transaction(async (tx) => {
      const perda = await tx.perda.findUnique({ where: { id } });
      if (!perda) throw Object.assign(new Error('Perda não encontrada.'), { status: 404 });
      const material = await tx.material.findUnique({ where: { id: perda.materialId } });
      if (material) {
        const qtdAnterior = material.quantidade;
        const qtdResultante = round4(qtdAnterior + perda.quantidade);
        await tx.material.update({ where: { id: material.id }, data: { quantidade: qtdResultante } });
        await tx.movimentacaoEstoque.create({
          data: {
            materialId: material.id, tipo: 'ENTRADA_ESTORNO_PERDA',
            quantidadeAnterior: qtdAnterior, quantidadeMovimentada: perda.quantidade, quantidadeResultante: qtdResultante,
            motivo: `Estorno de perda #${perda.id}`,
          },
        });
      }
      await tx.perda.delete({ where: { id } });
    });
    res.status(204).end();
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

module.exports = router;
