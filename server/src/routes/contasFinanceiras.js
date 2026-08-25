const express = require('express');
const prisma = require('../prisma');
const { round2 } = require('../utils/money');
const { aplicarMovimentacao } = require('../services/financeiroService');
const { senhaCorreta } = require('../auth');
const router = express.Router();

const TIPOS = ['CAIXA', 'BANCO', 'RESERVA_LUCRO', 'OUTRO'];

router.get('/', async (req, res, next) => {
  try {
    const contas = await prisma.contaFinanceira.findMany({ orderBy: { id: 'asc' } });
    res.json(contas);
  } catch (e) { next(e); }
});

// Extrato de uma conta
router.get('/:id/movimentacoes', async (req, res, next) => {
  try {
    const movs = await prisma.movimentacaoFinanceira.findMany({
      where: { contaId: Number(req.params.id) },
      orderBy: { data: 'desc' },
      take: 200,
    });
    res.json(movs);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const b = req.body;
    if (!b.nome || !b.nome.trim()) return res.status(400).json({ erro: 'Nome é obrigatório.' });
    const tipo = TIPOS.includes(b.tipo) ? b.tipo : 'OUTRO';
    const saldoInicial = round2(b.saldoInicial || 0);
    const existe = await prisma.contaFinanceira.findUnique({ where: { nome: b.nome.trim() } });
    if (existe) return res.status(409).json({ erro: 'Já existe uma conta com esse nome.' });

    const conta = await prisma.$transaction(async (tx) => {
      const c = await tx.contaFinanceira.create({ data: { nome: b.nome.trim(), tipo, saldoAtual: 0 } });
      if (saldoInicial > 0) {
        await aplicarMovimentacao(tx, { contaId: c.id, tipo: 'ENTRADA', origem: 'SALDO_INICIAL', valor: saldoInicial, descricao: 'Saldo inicial' });
      }
      return tx.contaFinanceira.findUnique({ where: { id: c.id } });
    });
    res.status(201).json(conta);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const b = req.body;
    if (!b.nome || !b.nome.trim()) return res.status(400).json({ erro: 'Nome é obrigatório.' });
    const conflito = await prisma.contaFinanceira.findFirst({ where: { nome: b.nome.trim(), NOT: { id } } });
    if (conflito) return res.status(409).json({ erro: 'Já existe outra conta com esse nome.' });
    const conta = await prisma.contaFinanceira.update({
      where: { id },
      data: { nome: b.nome.trim(), tipo: TIPOS.includes(b.tipo) ? b.tipo : undefined },
    });
    res.json(conta);
  } catch (e) { next(e); }
});

// Aporte (entrada), retirada (saída) ou ajuste manual do saldo
router.post('/:id/movimentar', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const b = req.body;
    const acao = b.acao; // APORTE, RETIRADA, DEFINIR
    const valor = round2(b.valor || 0);

    // Ajustar o saldo (DEFINIR) é uma ação sensível: exige a senha do sistema (admin), para que
    // funcionários possam usar o sistema sem poder alterar saldos manualmente.
    if (acao === 'DEFINIR' && !senhaCorreta(b.senha)) {
      return res.status(403).json({ erro: 'Senha do administrador incorreta. Ajuste de saldo bloqueado.' });
    }

    const conta = await prisma.contaFinanceira.findUnique({ where: { id } });
    if (!conta) return res.status(404).json({ erro: 'Conta não encontrada.' });

    await prisma.$transaction(async (tx) => {
      if (acao === 'DEFINIR') {
        const alvo = round2(b.valor || 0);
        const diff = round2(alvo - conta.saldoAtual);
        if (diff === 0) return;
        await aplicarMovimentacao(tx, {
          contaId: id, tipo: diff > 0 ? 'ENTRADA' : 'SAIDA', origem: 'AJUSTE',
          valor: Math.abs(diff), descricao: b.descricao || 'Ajuste de saldo',
        });
      } else if (acao === 'RETIRADA') {
        if (valor > conta.saldoAtual) throw Object.assign(new Error('Saldo insuficiente para a retirada.'), { status: 400 });
        await aplicarMovimentacao(tx, { contaId: id, tipo: 'SAIDA', origem: b.origem || 'AJUSTE', valor, descricao: b.descricao || 'Retirada' });
      } else {
        await aplicarMovimentacao(tx, { contaId: id, tipo: 'ENTRADA', origem: b.origem || 'APORTE', valor, descricao: b.descricao || 'Aporte' });
      }
    });
    const atualizada = await prisma.contaFinanceira.findUnique({ where: { id } });
    res.json(atualizada);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const conta = await prisma.contaFinanceira.update({ where: { id: Number(req.params.id) }, data: { ativo: !!req.body.ativo } });
    res.json(conta);
  } catch (e) { next(e); }
});

module.exports = router;
