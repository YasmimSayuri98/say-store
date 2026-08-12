const express = require('express');
const prisma = require('../prisma');
const { round4 } = require('../utils/money');
const { situacaoEstoque } = require('../services/estoqueService');
const router = express.Router();

function inicioDoMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
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

    const desde = inicioDoMes();
    const enviosMes = await prisma.registroEnvio.findMany({ where: { dataEnvio: { gte: desde } }, include: { itens: true } });
    let custoMateriaisMes = 0, produtosEnviadosMes = 0;
    for (const e of enviosMes) {
      custoMateriaisMes = round4(custoMateriaisMes + e.custoTotalMateriais);
      for (const it of e.itens) produtosEnviadosMes += it.quantidade;
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
      custoMateriaisMes,
      produtosEnviadosMes,
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
