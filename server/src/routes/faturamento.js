const express = require('express');
const prisma = require('../prisma');
const { round4 } = require('../utils/money');
const router = express.Router();

// Relatório de faturamento e lucro, separado por plataforma (Shopee, TikTok, etc.).
// Aceita filtro de período por ?de=YYYY-MM-DD&ate=YYYY-MM-DD.
router.get('/', async (req, res, next) => {
  try {
    const { de, ate } = req.query;
    const where = {};
    if (de || ate) {
      where.dataEnvio = {};
      if (de) where.dataEnvio.gte = new Date(de);
      if (ate) {
        const fim = new Date(ate);
        fim.setHours(23, 59, 59, 999);
        where.dataEnvio.lte = fim;
      }
    }

    const [envios, plataformas] = await Promise.all([
      prisma.registroEnvio.findMany({ where, include: { itens: true, plataforma: true } }),
      prisma.plataformaVenda.findMany({ orderBy: { nome: 'asc' } }),
    ]);

    // Inicializa um grupo por plataforma + um grupo "sem plataforma".
    const grupos = new Map();
    const novoGrupo = (id, nome) => ({
      plataformaId: id, plataformaNome: nome,
      envios: 0, unidades: 0,
      faturamentoBruto: 0, totalTaxas: 0, custoTotalProdutos: 0, custoTotalMateriais: 0, lucro: 0,
    });
    for (const pl of plataformas) grupos.set(pl.id, novoGrupo(pl.id, pl.nome));
    grupos.set(null, novoGrupo(null, 'Sem plataforma'));

    const totalGeral = novoGrupo('total', 'Total geral');

    for (const e of envios) {
      const chave = e.plataformaId != null ? e.plataformaId : null;
      const g = grupos.get(chave) || grupos.get(null);
      const unidades = e.itens.reduce((s, it) => s + it.quantidade, 0);
      g.envios += 1;
      g.unidades = round4(g.unidades + unidades);
      g.faturamentoBruto = round4(g.faturamentoBruto + e.faturamentoBruto);
      g.totalTaxas = round4(g.totalTaxas + e.totalTaxas);
      g.custoTotalProdutos = round4(g.custoTotalProdutos + e.custoTotalProdutos);
      g.custoTotalMateriais = round4(g.custoTotalMateriais + e.custoTotalMateriais);
      g.lucro = round4(g.lucro + e.lucro);

      totalGeral.envios += 1;
      totalGeral.unidades = round4(totalGeral.unidades + unidades);
      totalGeral.faturamentoBruto = round4(totalGeral.faturamentoBruto + e.faturamentoBruto);
      totalGeral.totalTaxas = round4(totalGeral.totalTaxas + e.totalTaxas);
      totalGeral.custoTotalProdutos = round4(totalGeral.custoTotalProdutos + e.custoTotalProdutos);
      totalGeral.custoTotalMateriais = round4(totalGeral.custoTotalMateriais + e.custoTotalMateriais);
      totalGeral.lucro = round4(totalGeral.lucro + e.lucro);
    }

    const comMargem = (g) => ({
      ...g,
      margem: g.faturamentoBruto > 0 ? round4((g.lucro / g.faturamentoBruto) * 100) : 0,
    });

    // Mantém plataformas na lista mesmo sem envios; oculta "sem plataforma" se vazio.
    const porPlataforma = [];
    for (const pl of plataformas) porPlataforma.push(comMargem(grupos.get(pl.id)));
    const semPlataforma = grupos.get(null);
    if (semPlataforma.envios > 0) porPlataforma.push(comMargem(semPlataforma));

    res.json({ porPlataforma, total: comMargem(totalGeral) });
  } catch (e) { next(e); }
});

module.exports = router;
