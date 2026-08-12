const { round2, round4 } = require('../utils/money');

// Custo final de um produto = custo dos materiais (ficha técnica) + custos extras
// (energia, mão de obra, embalagem não rastreada, etc.).
function custoFinalProduto(produto) {
  return round4((produto.custoAtualMateriais || 0) + (produto.custosExtras || 0));
}

// Percentual total de taxas incidentes sobre o preço de venda (comissão + frete grátis), em fração.
function fracaoPercentualPlataforma(plataforma) {
  return round4(((plataforma.comissaoPercentual || 0) + (plataforma.percentualFreteGratis || 0)) / 100);
}

// Preço de venda sugerido para atingir uma margem de lucro alvo (% sobre o preço de venda).
//
// Queremos que o lucro seja: lucro = margem × preço.
//   preço − (preço × p) − taxaFixa − custo = margem × preço
//   preço × (1 − p − margem) = custo + taxaFixa
//   preço = (custo + taxaFixa) / (1 − p − margem)
//
// Retorna null quando (taxas% + margem%) ≥ 100% (impossível atingir a margem).
function precoSugerido(custoFinal, plataforma, margemPercentual) {
  const p = fracaoPercentualPlataforma(plataforma);
  const m = round4((margemPercentual || 0) / 100);
  const denom = round4(1 - p - m);
  if (denom <= 0) return null;
  const taxaFixa = plataforma.taxaFixaPorItem || 0;
  return round2((custoFinal + taxaFixa) / denom);
}

// Detalhamento financeiro de UMA unidade vendida por um determinado preço.
function financeiroUnitario(precoVenda, custoFinal, plataforma) {
  const preco = round4(precoVenda || 0);
  const p = fracaoPercentualPlataforma(plataforma);
  const comissao = round4(preco * p);
  const taxaFixa = round4(plataforma.taxaFixaPorItem || 0);
  const taxas = round4(comissao + taxaFixa);
  const lucro = round4(preco - taxas - custoFinal);
  const margemReal = preco > 0 ? round2((lucro / preco) * 100) : 0;
  return { preco, comissao, taxaFixa, taxas, custoFinal, lucro, margemReal };
}

module.exports = { custoFinalProduto, fracaoPercentualPlataforma, precoSugerido, financeiroUnitario };
