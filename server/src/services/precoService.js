const { round2, round4 } = require('../utils/money');

// Custo final de um produto = custo dos materiais (ficha técnica) + custos extras
// (energia, mão de obra, embalagem não rastreada, etc.).
function custoFinalProduto(produto) {
  return round4((produto.custoAtualMateriais || 0) + (produto.custosExtras || 0));
}

// Tabelas de taxas por faixa de preço de venda (fixo em R$ + percentual).
// max é o teto inclusivo da faixa; a última faixa cobre qualquer valor acima.
const FAIXAS_SHOPEE = [
  { max: 79.999999, fixo: 4, perc: 0.20 },
  { max: 99.999999, fixo: 16, perc: 0.14 },
  { max: 199.999999, fixo: 20, perc: 0.14 },
  { max: 499.999999, fixo: 26, perc: 0.14 },
  { max: Infinity, fixo: 26, perc: 0.14 },
];
const FAIXAS_TIKTOK = [
  { max: 49.999999, fixo: 4, perc: 0.10 },
  { max: Infinity, fixo: 6, perc: 0.06 },
];

// Retorna a tabela de faixas da plataforma (Shopee/TikTok), ou null se usa taxa fixa configurada.
function tabelaFaixa(plataforma) {
  const nome = (plataforma && plataforma.nome ? plataforma.nome : '').toLowerCase();
  if (nome.includes('shopee')) return FAIXAS_SHOPEE;
  if (nome.includes('tiktok')) return FAIXAS_TIKTOK;
  return null;
}
function faixaDe(tabela, preco) {
  for (const f of tabela) if (preco <= f.max) return f;
  return tabela[tabela.length - 1];
}

// A plataforma usa tabela de faixas (Shopee/TikTok).
function usaFaixa(plataforma) { return !!tabelaFaixa(plataforma); }

// Percentual total de taxas incidentes sobre o preço de venda (comissão + frete grátis), em fração.
function fracaoPercentualPlataforma(plataforma) {
  return round4(((plataforma.comissaoPercentual || 0) + (plataforma.percentualFreteGratis || 0)) / 100);
}

// Retorna { perc (fração), fixo (R$) } da plataforma para um dado preço de venda.
// Shopee/TikTok: pela tabela de faixas. Demais: pela configuração fixa da plataforma.
function taxaDaPlataforma(plataforma, preco) {
  const tabela = tabelaFaixa(plataforma);
  if (tabela) {
    const f = faixaDe(tabela, preco);
    return { perc: f.perc, fixo: f.fixo };
  }
  return { perc: fracaoPercentualPlataforma(plataforma), fixo: plataforma.taxaFixaPorItem || 0 };
}

// Preço de venda sugerido para atingir uma margem de lucro alvo (% sobre o preço de venda).
//
// lucro = margem × preço  →  preço − (preço × p) − taxaFixa − custo = margem × preço
//   preço = (custo + taxaFixa) / (1 − p − margem)
//
// Em plataforma com faixas, resolve dentro de cada faixa e usa a que "fecha" naquela faixa.
// Retorna null quando (taxas% + margem%) ≥ 100% (impossível atingir a margem).
function precoSugerido(custoFinal, plataforma, margemPercentual) {
  const m = round4((margemPercentual || 0) / 100);

  const tabela = tabelaFaixa(plataforma);
  if (tabela) {
    let anterior = 0;
    for (const f of tabela) {
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

module.exports = { custoFinalProduto, fracaoPercentualPlataforma, precoSugerido, financeiroUnitario, usaFaixa };
