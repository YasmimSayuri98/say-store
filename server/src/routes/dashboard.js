const express = require('express');
const prisma = require('../prisma');
const { round4 } = require('../utils/money');
const { situacaoEstoque } = require('../services/estoqueService');
const router = express.Router();

function inicioDoMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Converte 'YYYY-MM-DD' no início do dia (local); retorna null se inválido.
function inicioDoDia(str) {
  if (!str) return null;
  const [y, m, d] = String(str).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}
// Converte 'YYYY-MM-DD' no fim do dia (local); retorna null se inválido.
function fimDoDia(str) {
  if (!str) return null;
  const [y, m, d] = String(str).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

router.get('/', async (req, res, next) => {
  try {
    const materiais = await prisma.material.findMany({
      where: { ativo: true },
      include: { categoria: true, unidade: true },
    });

    let valorTotal = 0, normal = 0, baixo = 0, semEstoque = 0;
    const urgentes = [];
    for (const m of materiais) {
      valorTotal = round4(valorTotal + round4(m.quantidade * m.custoMedio));
      const s = situacaoEstoque(m.quantidade, m.quantidadeMinima);
      if (s === 'NORMAL') normal++;
      else if (s === 'BAIXO') baixo++;
      else semEstoque++;
      if (s !== 'NORMAL') urgentes.push({ id: m.id, nome: m.nome, quantidade: m.quantidade, quantidadeMinima: m.quantidadeMinima, unidade: m.unidade.sigla, situacao: s });
    }

    const produtosCount = await prisma.produto.count({ where: { ativo: true } });

    // Período dos cards filtráveis por data. Padrão: mês atual até agora.
    const de = inicioDoDia(req.query.de) || inicioDoMes();
    const ate = fimDoDia(req.query.ate) || new Date();
    const enviosPeriodo = await prisma.registroEnvio.findMany({ where: { dataEnvio: { gte: de, lte: ate } }, include: { itens: true } });
    let custoMateriaisPeriodo = 0, produtosEnviadosPeriodo = 0, faturamentoPeriodo = 0, lucroPeriodo = 0, taxasPeriodo = 0;
    for (const e of enviosPeriodo) {
      custoMateriaisPeriodo = round4(custoMateriaisPeriodo + e.custoTotalMateriais);
      faturamentoPeriodo = round4(faturamentoPeriodo + e.faturamentoBruto);
      lucroPeriodo = round4(lucroPeriodo + e.lucro);
      taxasPeriodo = round4(taxasPeriodo + e.totalTaxas);
      for (const it of e.itens) produtosEnviadosPeriodo += it.quantidade;
    }

    // Perdas do período (teste e erro de produção), em valor e quantidade de lançamentos.
    const perdasPeriodo = await prisma.perda.findMany({ where: { criadoEm: { gte: de, lte: ate } } });
    let perdaTesteValor = 0, perdaErroValor = 0, perdaTesteQtd = 0, perdaErroQtd = 0;
    for (const pl of perdasPeriodo) {
      if (pl.tipo === 'TESTE') { perdaTesteValor = round4(perdaTesteValor + pl.custoTotal); perdaTesteQtd++; }
      else { perdaErroValor = round4(perdaErroValor + pl.custoTotal); perdaErroQtd++; }
    }

    const ultimasMovimentacoes = await prisma.movimentacaoEstoque.findMany({
      include: { material: { include: { unidade: true } } }, orderBy: { criadoEm: 'desc' }, take: 8,
    });
    const ultimosEnvios = await prisma.registroEnvio.findMany({
      include: { itens: { include: { produto: true } } }, orderBy: { dataEnvio: 'desc' }, take: 5,
    });

    // Saldos financeiros: disponível (contas operacionais) e lucro acumulado (reserva)
    const contas = await prisma.contaFinanceira.findMany({ where: { ativo: true } });
    let saldoDisponivel = 0, lucroAcumulado = 0;
    for (const c of contas) {
      if (c.tipo === 'RESERVA_LUCRO') lucroAcumulado = round4(lucroAcumulado + c.saldoAtual);
      else saldoDisponivel = round4(saldoDisponivel + c.saldoAtual);
    }

    res.json({
      valorTotalEstoque: valorTotal,
      saldoDisponivel,
      lucroAcumulado,
      materiaisCadastrados: materiais.length,
      materiaisBaixo: baixo,
      materiaisSemEstoque: semEstoque,
      materiaisNormal: normal,
      produtosCadastrados: produtosCount,
      // Métricas do período selecionado (filtráveis por data)
      periodo: {
        de: de.toISOString(),
        ate: ate.toISOString(),
        faturamento: faturamentoPeriodo,
        lucro: lucroPeriodo,
        taxas: taxasPeriodo,
        custoMateriais: custoMateriaisPeriodo,
        produtosEnviados: produtosEnviadosPeriodo,
        perdaTesteValor,
        perdaErroValor,
        perdaTotalValor: round4(perdaTesteValor + perdaErroValor),
        perdaTesteQtd,
        perdaErroQtd,
      },
      // Compat: mês atual (mantidos para não quebrar chamadas antigas)
      custoMateriaisMes: custoMateriaisPeriodo,
      produtosEnviadosMes: produtosEnviadosPeriodo,
      urgentes: urgentes.slice(0, 6),
      ultimasMovimentacoes,
      ultimosEnvios,
    });
  } catch (e) { next(e); }
});

// Valor financeiro detalhado do estoque
router.get('/valor', async (req, res, next) => {
  try {
    const materiais = await prisma.material.findMany({ where: { ativo: true }, include: { categoria: true, unidade: true } });
    let valorTotal = 0, normal = 0, baixo = 0, semEstoque = 0;
    const porCategoria = {};
    const detalhes = materiais.map((m) => {
      const valor = round4(m.quantidade * m.custoMedio);
      valorTotal = round4(valorTotal + valor);
      const s = situacaoEstoque(m.quantidade, m.quantidadeMinima);
      if (s === 'NORMAL') normal++; else if (s === 'BAIXO') baixo++; else semEstoque++;
      porCategoria[m.categoria.nome] = round4((porCategoria[m.categoria.nome] || 0) + valor);
      return { id: m.id, nome: m.nome, categoria: m.categoria.nome, unidade: m.unidade.sigla, quantidade: m.quantidade, custoMedio: m.custoMedio, valor, situacao: s };
    });
    res.json({ valorTotal, porCategoria, normal, baixo, semEstoque, detalhes });
  } catch (e) { next(e); }
});

module.exports = router;
