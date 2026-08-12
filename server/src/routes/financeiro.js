const express = require('express');
const prisma = require('../prisma');
const { round2 } = require('../utils/money');
const { getConfig } = require('../services/financeiroService');
const router = express.Router();

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const chaveMes = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const rotuloMes = (d) => `${MESES[d.getMonth()]}/${d.getFullYear()}`;

router.get('/config', async (req, res, next) => {
  try { res.json(await getConfig(prisma)); } catch (e) { next(e); }
});

router.put('/config', async (req, res, next) => {
  try {
    const b = req.body;
    const p = b.percentualLucroPadrao;
    if (p != null && (Number.isNaN(Number(p)) || Number(p) < 0 || Number(p) > 100))
      return res.status(400).json({ erro: 'Percentual de lucro deve estar entre 0 e 100.' });
    await getConfig(prisma);
    const cfg = await prisma.configuracaoFinanceira.update({
      where: { id: 1 },
      data: {
        percentualLucroPadrao: p != null ? round2(p) : undefined,
        contaLucroPadraoId: b.contaLucroPadraoId != null ? Number(b.contaLucroPadraoId) || null : undefined,
        contaOperacionalPadraoId: b.contaOperacionalPadraoId != null ? Number(b.contaOperacionalPadraoId) || null : undefined,
      },
    });
    res.json(cfg);
  } catch (e) { next(e); }
});

// Visão financeira: saldos, contas a pagar e projeção de fluxo de caixa.
router.get('/resumo', async (req, res, next) => {
  try {
    const meses = Math.min(24, Math.max(1, Number(req.query.meses) || 12));
    const [contas, parcelasPendentes, cfg] = await Promise.all([
      prisma.contaFinanceira.findMany({ where: { ativo: true }, orderBy: { id: 'asc' } }),
      prisma.parcelaConta.findMany({ where: { pago: false }, include: { contaPagar: true }, orderBy: { vencimento: 'asc' } }),
      getConfig(prisma),
    ]);

    let saldoTotal = 0, saldoDisponivel = 0, saldoReservaLucro = 0;
    for (const c of contas) {
      saldoTotal = round2(saldoTotal + c.saldoAtual);
      if (c.tipo === 'RESERVA_LUCRO') saldoReservaLucro = round2(saldoReservaLucro + c.saldoAtual);
      else saldoDisponivel = round2(saldoDisponivel + c.saldoAtual);
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Buckets por mês + bucket de vencidas
    let vencidoTotal = 0;
    const porMes = new Map();
    for (const p of parcelasPendentes) {
      const venc = new Date(p.vencimento);
      if (venc < hoje) { vencidoTotal = round2(vencidoTotal + p.valor); continue; }
      const k = chaveMes(venc);
      const g = porMes.get(k) || { chave: k, label: rotuloMes(venc), aPagar: 0 };
      g.aPagar = round2(g.aPagar + p.valor);
      porMes.set(k, g);
    }

    // Linha do tempo: mês atual até `meses` à frente
    const projecao = [];
    let saldoCorrente = saldoDisponivel;
    if (vencidoTotal > 0) {
      saldoCorrente = round2(saldoCorrente - vencidoTotal);
      projecao.push({ chave: 'vencidas', label: 'Vencidas', aPagar: vencidoTotal, saldoProjetado: saldoCorrente, vencida: true });
    }
    const cursor = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    for (let i = 0; i < meses; i++) {
      const k = chaveMes(cursor);
      const aPagar = porMes.get(k)?.aPagar || 0;
      saldoCorrente = round2(saldoCorrente - aPagar);
      projecao.push({ chave: k, label: rotuloMes(cursor), aPagar, saldoProjetado: saldoCorrente });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const totalPendente = round2(parcelasPendentes.reduce((s, p) => s + p.valor, 0));
    const em30 = new Date(hoje); em30.setDate(em30.getDate() + 30);
    const aVencer30 = round2(parcelasPendentes.filter((p) => {
      const v = new Date(p.vencimento); return v >= hoje && v <= em30;
    }).reduce((s, p) => s + p.valor, 0));

    // Próximas 5 parcelas a vencer (agenda)
    const proximas = parcelasPendentes.slice(0, 5).map((p) => ({
      id: p.id, descricao: p.contaPagar.descricao, numero: p.numero,
      numeroParcelas: p.contaPagar.numeroParcelas, valor: p.valor, vencimento: p.vencimento,
      vencida: new Date(p.vencimento) < hoje,
    }));

    res.json({
      contas, saldoTotal, saldoDisponivel, saldoReservaLucro,
      contasPagar: { totalPendente, vencidoTotal, aVencer30 },
      proximas, projecao, config: cfg,
    });
  } catch (e) { next(e); }
});

module.exports = router;
