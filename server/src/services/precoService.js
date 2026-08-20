const { round2, round4 } = require('../utils/money');

// Custo final de um produto = custo dos materiais (ficha técnica) + custos extras
// (energia, mão de obra, embalagem não rastreada, etc.).
function custoFinalProduto(produto) {
  return round4((produto.custoAtualMateriais || 0) + (produto.custosExtras || 0));
}

// Tabela de taxas da Shopee por faixa de preço de venda (fixo em R$ + percentual).
// max é o teto inclusivo da faixa; a última faixa cobre qualquer valor acima.
const FAIXAS_SHOPEE = [
  { max: 79.999999, fixo: 4, perc: 0.20 },
  { max: 99.999999, fixo: 16, perc: 0.14 },
  { max: 199.999999, fixo: 20, perc: 0.14 },
  { max: 499.999999, fixo: 26, perc: 0.14 },
  { max: Infinity, fixo: 26, perc: 0.14 },
];

function faixaShopee(preco) {
  for (const f of FAIXAS_SHOPEE) if (preco <= f.max) return { fixo: f.fixo, perc: f.perc };
  return { fixo: 26, perc: 0.14 };
}

// A Shopee usa a tabela de faixas (detectada pelo nome da plataforma).
function usaFaixaShopee(plataforma) {
  return /shopee/i.test(plataforma && plataforma.nome ? plataforma.nome : '');
}

// Percentual total de taxas incidentes sobre o preço de venda (comissão + frete grátis), em fração.
function fracaoPercentualPlataforma(plataforma) {
  return round4(((plataforma.comissaoPercentual || 0) + (plataforma.percentualFreteGratis || 0)) / 100);
}

// Retorna { perc (fração), fixo (R$) } da plataforma para um dado preço de venda.
// Shopee: pela tabela de faixas. Demais: pela configuração fixa da plataforma.
function taxaDaPlataforma(plataforma, preco) {
  if (usaFaixaShopee(plataforma)) {
    const f = faixaShopee(preco);
    return { perc: f.perc, fixo: f.fixo };
  }
  return { perc: fracaoPercentualPlataforma(plataforma), fixo: plataforma.taxaFixaPorItem || 0 };
}

// Preço de venda sugerido para atingir uma margem de lucro alvo (% sobre o preço de venda).
//
// lucro = margem × preço  →  preço − (preço × p) − taxaFixa − custo = margem × preço
//   preço = (custo + taxaFixa) / (1 − p − margem)
//
// Na Shopee (taxa por faixa), resolve dentro de cada faixa e usa a que "fecha" naquela faixa.
// Retorna null quando (taxas% + margem%) ≥ 100% (impossível atingir a margem).
function precoSugerido(custoFinal, plataforma, margemPercentual) {
  const m = round4((margemPercentual || 0) / 100);

  if (usaFaixaShopee(plataforma)) {
    let anterior = 0;
    for (const f of FAIXAS_SHOPEE) {
      const denom = round4(1 - f.perc - m);
      if (denom > 0) {
        const p = round2((custoFinal + f.fixo) / denom);
        if (p > anterior && p <= f.max) return p;
      }
      anterior = f.max;
    }
    return null;
  }

  const p = fracaoPercentualPlataforma(plataforma);
  const denom = round4(1 - p - m);
  if (denom <= 0) return null;
  const taxaFixa = plataforma.taxaFixaPorItem || 0;
  return round2((custoFinal + taxaFixa) / denom);
}

// Detalhamento financeiro de UMA unidade vendida por um determinado preço.
function financeiroUnitario(precoVenda, custoFinal, plataforma) {
  const preco = round4(precoVenda || 0);
  const { perc, fixo } = taxaDaPlataforma(plataforma, preco);
  const comissao = round4(preco * perc);
  const taxaFixa = round4(fixo);
  const taxas = round4(comissao + taxaFixa);
  const lucro = round4(preco - taxas - custoFinal);
  const margemReal = preco > 0 ? round2((lucro / preco) * 100) : 0;
  return { preco, comissao, taxaFixa, taxas, custoFinal, lucro, margemReal, percentualTaxa: round2(perc * 100) };
}

module.exports = { custoFinalProduto, fracaoPercentualPlataforma, precoSugerido, financeiroUnitario, usaFaixaShopee };
