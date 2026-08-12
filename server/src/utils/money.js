// Utilitários de precisão numérica.
// Cálculos internos usam 4 casas decimais; exibição monetária usa 2 (no front-end).

function round4(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 0;
  return Math.round(Number(n) * 10000) / 10000;
}

function round2(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 0;
  return Math.round(Number(n) * 100) / 100;
}

// Custo médio ponderado
// novoCusto = ((qtdAnterior * custoAnterior) + valorNovaCompra) / (qtdAnterior + qtdComprada)
function custoMedioPonderado(qtdAnterior, custoAnterior, qtdComprada, valorNovaCompra) {
  const qtdTotal = round4(qtdAnterior + qtdComprada);
  if (qtdTotal <= 0) return 0;
  const valorTotal = round4(qtdAnterior * custoAnterior) + round4(valorNovaCompra);
  return round4(valorTotal / qtdTotal);
}

module.exports = { round4, round2, custoMedioPonderado };
