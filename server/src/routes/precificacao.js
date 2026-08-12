const express = require('express');
const prisma = require('../prisma');
const { round4 } = require('../utils/money');
const { custoFinalProduto, precoSugerido, financeiroUnitario } = require('../services/precoService');
const router = express.Router();

// Matriz de precificação: para cada produto, o custo final e, em cada plataforma ativa,
// o preço sugerido (pela margem alvo), o preço praticado (salvo) e o resultado financeiro.
router.get('/', async (req, res, next) => {
  try {
    const [produtos, plataformas] = await Promise.all([
      prisma.produto.findMany({
        where: { ativo: true },
        orderBy: { nome: 'asc' },
        include: { precos: true },
      }),
      prisma.plataformaVenda.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
    ]);

    const linhas = produtos.map((p) => {
      const custoFinal = custoFinalProduto(p);
      const plataformasLinha = plataformas.map((pl) => {
        const precoSalvo = p.precos.find((x) => x.plataformaId === pl.id);
        const sugerido = precoSugerido(custoFinal, pl, p.margemLucroAlvo);
        const precoPraticado = precoSalvo ? precoSalvo.precoVenda : 0;
        const fin = financeiroUnitario(precoPraticado, custoFinal, pl);
        return {
          plataformaId: pl.id,
          plataformaNome: pl.nome,
          comissaoPercentual: pl.comissaoPercentual,
          taxaFixaPorItem: pl.taxaFixaPorItem,
          percentualFreteGratis: pl.percentualFreteGratis,
          precoSugerido: sugerido,
          precoVenda: precoPraticado,
          taxas: fin.taxas,
          lucro: fin.lucro,
          margemReal: fin.margemReal,
        };
      });
      return {
        produtoId: p.id,
        nome: p.nome,
        sku: p.sku,
        custoAtualMateriais: p.custoAtualMateriais,
        custosExtras: p.custosExtras,
        custoFinal,
        margemLucroAlvo: p.margemLucroAlvo,
        plataformas: plataformasLinha,
      };
    });

    res.json({ plataformas, produtos: linhas });
  } catch (e) { next(e); }
});

// Tolerância (em pontos percentuais) abaixo da margem alvo antes de considerar "margem baixa".
// Evita alertas causados apenas pelo arredondamento do preço sugerido (a 2 casas decimais),
// que por si só já deixa a margem real uma fração abaixo da alvo mesmo sem nenhum aumento de custo.
const TOLERANCIA_MARGEM_PP = 1;

// Alertas de margem: produtos com preço já definido em alguma plataforma cuja margem real
// (calculada com o custo atual dos materiais) caiu abaixo da margem de lucro alvo configurada
// para o produto. Disparado tipicamente após uma reposição de estoque que encareceu um material.
router.get('/alertas-margem', async (req, res, next) => {
  try {
    const [produtos, plataformas] = await Promise.all([
      prisma.produto.findMany({ where: { ativo: true, margemLucroAlvo: { gt: 0 } }, include: { precos: true } }),
      prisma.plataformaVenda.findMany({ where: { ativo: true } }),
    ]);
    const plataformasPorId = new Map(plataformas.map((pl) => [pl.id, pl]));

    const alertas = [];
    for (const p of produtos) {
      const custoFinal = custoFinalProduto(p);
      for (const preco of p.precos) {
        if (!(preco.precoVenda > 0)) continue;
        const plataforma = plataformasPorId.get(preco.plataformaId);
        if (!plataforma) continue;
        const fin = financeiroUnitario(preco.precoVenda, custoFinal, plataforma);
        if (fin.margemReal < p.margemLucroAlvo - TOLERANCIA_MARGEM_PP) {
          alertas.push({
            produtoId: p.id,
            produtoNome: p.nome,
            sku: p.sku,
            plataformaId: plataforma.id,
            plataformaNome: plataforma.nome,
            custoFinal,
            precoAtual: preco.precoVenda,
            margemAtual: fin.margemReal,
            margemAlvo: p.margemLucroAlvo,
            precoSugerido: precoSugerido(custoFinal, plataforma, p.margemLucroAlvo),
          });
        }
      }
    }
    alertas.sort((a, b) => a.margemAtual - b.margemAtual);
    res.json(alertas);
  } catch (e) { next(e); }
});

// Salva a precificação de um produto: custos extras, margem alvo e os preços por plataforma.
router.put('/:produtoId', async (req, res, next) => {
  try {
    const produtoId = Number(req.params.produtoId);
    const b = req.body;
    const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });

    if (b.custosExtras != null && (Number.isNaN(Number(b.custosExtras)) || Number(b.custosExtras) < 0))
      return res.status(400).json({ erro: 'Custos extras inválidos.' });
    if (b.margemLucroAlvo != null && (Number.isNaN(Number(b.margemLucroAlvo)) || Number(b.margemLucroAlvo) < 0))
      return res.status(400).json({ erro: 'Margem alvo inválida.' });

    const precos = Array.isArray(b.precos) ? b.precos : [];
    for (const pr of precos) {
      if (!pr.plataformaId) return res.status(400).json({ erro: 'Plataforma obrigatória em preço.' });
      if (pr.precoVenda != null && (Number.isNaN(Number(pr.precoVenda)) || Number(pr.precoVenda) < 0))
        return res.status(400).json({ erro: 'Preço de venda inválido.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.produto.update({
        where: { id: produtoId },
        data: {
          custosExtras: round4(b.custosExtras || 0),
          margemLucroAlvo: round4(b.margemLucroAlvo || 0),
        },
      });
      for (const pr of precos) {
        await tx.precoProduto.upsert({
          where: { produtoId_plataformaId: { produtoId, plataformaId: Number(pr.plataformaId) } },
          update: { precoVenda: round4(pr.precoVenda || 0) },
          create: { produtoId, plataformaId: Number(pr.plataformaId), precoVenda: round4(pr.precoVenda || 0) },
        });
      }
    });

    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
