const express = require('express');
const prisma = require('../prisma');
const { round2 } = require('../utils/money');
const { parseDataDia } = require('../utils/data');
const { aplicarMovimentacao } = require('../services/financeiroService');
const router = express.Router();

// Gera parcelas iguais mensais a partir de um primeiro vencimento,
// ajustando a última para fechar exatamente o valor total.
function gerarParcelas(valorTotal, numero, primeiroVencimento) {
  const total = round2(valorTotal);
  const n = Math.max(1, Number(numero) || 1);
  const base = round2(total / n);
  const parcelas = [];
  const dataBase = parseDataDia(primeiroVencimento);
  let acumulado = 0;
  for (let i = 0; i < n; i++) {
    const venc = new Date(dataBase);
    venc.setMonth(venc.getMonth() + i);
    const valor = i === n - 1 ? round2(total - acumulado) : base;
    acumulado = round2(acumulado + valor);
    parcelas.push({ numero: i + 1, valor, vencimento: venc });
  }
  return parcelas;
}

router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query; // pendentes | pagas
    const contas = await prisma.contaPagar.findMany({
      include: { parcelas: { include: { contaFinanceira: true }, orderBy: { numero: 'asc' } } },
      orderBy: { criadoEm: 'desc' },
    });
    let lista = contas;
    if (status === 'pendentes') lista = contas.filter((c) => c.parcelas.some((p) => !p.pago));
    if (status === 'pagas') lista = contas.filter((c) => c.parcelas.every((p) => p.pago));
    res.json(lista);
  } catch (e) { next(e); }
});

// Todas as parcelas (para projeção e agenda), com filtros opcionais.
router.get('/parcelas', async (req, res, next) => {
  try {
    const { pago } = req.query;
    const where = {};
    if (pago === 'true') where.pago = true;
    if (pago === 'false') where.pago = false;
    const parcelas = await prisma.parcelaConta.findMany({
      where,
      include: { contaPagar: true, contaFinanceira: true },
      orderBy: { vencimento: 'asc' },
    });
    res.json(parcelas);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const b = req.body;
    if (!b.descricao || !b.descricao.trim()) return res.status(400).json({ erro: 'Descrição é obrigatória.' });
    const valorTotal = round2(b.valorTotal || 0);
    if (!(valorTotal > 0)) return res.status(400).json({ erro: 'Valor total deve ser maior que zero.' });

    let parcelas;
    if (Array.isArray(b.parcelas) && b.parcelas.length > 0) {
      // Parcelas informadas manualmente
      parcelas = b.parcelas.map((p, i) => {
        if (!p.vencimento) throw Object.assign(new Error(`Vencimento obrigatório na parcela ${i + 1}.`), { status: 400 });
        return { numero: i + 1, valor: round2(p.valor || 0), vencimento: parseDataDia(p.vencimento) };
      });
      const soma = round2(parcelas.reduce((s, p) => s + p.valor, 0));
      if (soma !== valorTotal) return res.status(400).json({ erro: `A soma das parcelas (${soma}) difere do valor total (${valorTotal}).` });
    } else {
      if (!b.primeiroVencimento) return res.status(400).json({ erro: 'Informe o primeiro vencimento.' });
      parcelas = gerarParcelas(valorTotal, b.numeroParcelas || 1, b.primeiroVencimento);
    }

    const conta = await prisma.contaPagar.create({
      data: {
        descricao: b.descricao.trim(),
        categoria: b.categoria || null,
        formaPagamento: b.formaPagamento && b.formaPagamento.trim() ? b.formaPagamento.trim() : null,
        valorTotal,
        numeroParcelas: parcelas.length,
        observacao: b.observacao || null,
        parcelas: { create: parcelas },
      },
      include: { parcelas: true },
    });
    res.status(201).json(conta);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

// Editar os dados da conta (não mexe nas parcelas/valor — para isso, exclua e recadastre).
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const b = req.body;
    if (!b.descricao || !b.descricao.trim()) return res.status(400).json({ erro: 'Descrição é obrigatória.' });
    const existente = await prisma.contaPagar.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ erro: 'Conta não encontrada.' });
    const conta = await prisma.contaPagar.update({
      where: { id },
      data: {
        descricao: b.descricao.trim(),
        categoria: b.categoria && b.categoria.trim() ? b.categoria.trim() : null,
        formaPagamento: b.formaPagamento && b.formaPagamento.trim() ? b.formaPagamento.trim() : null,
        observacao: b.observacao && b.observacao.trim() ? b.observacao.trim() : null,
      },
      include: { parcelas: { include: { contaFinanceira: true }, orderBy: { numero: 'asc' } } },
    });
    res.json(conta);
  } catch (e) { next(e); }
});

// Editar uma parcela (valor e/ou vencimento). Não permite editar parcela já paga.
// Ao mudar o valor, o total da conta é recalculado (soma das parcelas).
router.put('/parcelas/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const parcela = await prisma.parcelaConta.findUnique({ where: { id } });
    if (!parcela) return res.status(404).json({ erro: 'Parcela não encontrada.' });
    if (parcela.pago) return res.status(400).json({ erro: 'Parcela já paga não pode ser editada. Estorne o pagamento primeiro.' });

    const data = {};
    if (req.body.valor != null && req.body.valor !== '') {
      const v = round2(req.body.valor);
      if (!(v > 0)) return res.status(400).json({ erro: 'Valor deve ser maior que zero.' });
      data.valor = v;
    }
    if (req.body.vencimento) data.vencimento = parseDataDia(req.body.vencimento);
    if (Object.keys(data).length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    const atualizada = await prisma.$transaction(async (tx) => {
      await tx.parcelaConta.update({ where: { id }, data });
      const parcelas = await tx.parcelaConta.findMany({ where: { contaPagarId: parcela.contaPagarId } });
      const total = round2(parcelas.reduce((s, p) => s + p.valor, 0));
      await tx.contaPagar.update({ where: { id: parcela.contaPagarId }, data: { valorTotal: total } });
      return tx.parcelaConta.findUnique({ where: { id } });
    });
    res.json(atualizada);
  } catch (e) { next(e); }
});

// Baixa (pagamento) de uma parcela: debita a conta financeira escolhida.
router.post('/parcelas/:id/pagar', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const contaFinanceiraId = Number(req.body.contaFinanceiraId);
    if (!contaFinanceiraId) return res.status(400).json({ erro: 'Selecione a conta de pagamento.' });

    const parcela = await prisma.parcelaConta.findUnique({ where: { id }, include: { contaPagar: true } });
    if (!parcela) return res.status(404).json({ erro: 'Parcela não encontrada.' });
    if (parcela.pago) return res.status(400).json({ erro: 'Parcela já está paga.' });

    await prisma.$transaction(async (tx) => {
      await aplicarMovimentacao(tx, {
        contaId: contaFinanceiraId, tipo: 'SAIDA', origem: 'PAGAMENTO_CONTA',
        valor: parcela.valor,
        descricao: `Pagamento: ${parcela.contaPagar.descricao} (parcela ${parcela.numero}/${parcela.contaPagar.numeroParcelas})`,
        data: req.body.dataPagamento || undefined, parcelaId: parcela.id,
      });
      await tx.parcelaConta.update({
        where: { id },
        data: { pago: true, dataPagamento: parseDataDia(req.body.dataPagamento) || new Date(), contaFinanceiraId },
      });
    });
    const atualizada = await prisma.parcelaConta.findUnique({ where: { id }, include: { contaFinanceira: true } });
    res.json(atualizada);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

// Estorna o pagamento de uma parcela: devolve o valor à conta.
router.post('/parcelas/:id/estornar', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const parcela = await prisma.parcelaConta.findUnique({ where: { id }, include: { contaPagar: true } });
    if (!parcela) return res.status(404).json({ erro: 'Parcela não encontrada.' });
    if (!parcela.pago) return res.status(400).json({ erro: 'Parcela não está paga.' });

    await prisma.$transaction(async (tx) => {
      if (parcela.contaFinanceiraId) {
        await aplicarMovimentacao(tx, {
          contaId: parcela.contaFinanceiraId, tipo: 'ENTRADA', origem: 'PAGAMENTO_CONTA',
          valor: parcela.valor,
          descricao: `Estorno: ${parcela.contaPagar.descricao} (parcela ${parcela.numero})`,
          parcelaId: parcela.id,
        });
      }
      await tx.parcelaConta.update({ where: { id }, data: { pago: false, dataPagamento: null, contaFinanceiraId: null } });
    });
    res.json({ ok: true });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const conta = await prisma.contaPagar.findUnique({ where: { id }, include: { parcelas: true } });
    if (!conta) return res.status(404).json({ erro: 'Conta não encontrada.' });
    if (conta.parcelas.some((p) => p.pago)) return res.status(409).json({ erro: 'Conta possui parcelas pagas. Estorne antes de excluir.' });
    await prisma.contaPagar.delete({ where: { id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
