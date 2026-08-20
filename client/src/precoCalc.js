// Fórmulas de precificação espelhadas do back-end (precoService), para feedback ao vivo.
// Tabelas de taxas por faixa de preço (fixo em R$ + %). max = teto inclusivo da faixa.
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

// Aceita tanto { nome } (plataforma) quanto { plataformaNome } (linha da precificação).
export function tabelaFaixa(pl) {
  const nome = (pl?.plataformaNome || pl?.nome || '').toLowerCase();
  if (nome.includes('shopee')) return FAIXAS_SHOPEE;
  if (nome.includes('tiktok')) return FAIXAS_TIKTOK;
  return null;
}
export function usaFaixa(pl) { return !!tabelaFaixa(pl); }
function faixaDe(tabela, preco) { for (const f of tabela) if (preco <= f.max) return f; return tabela[tabela.length - 1]; }

export function taxaDe(pl, preco) {
  const tabela = tabelaFaixa(pl);
  if (tabela) { const f = faixaDe(tabela, preco); return { perc: f.perc, fixo: f.fixo }; }
  return { perc: ((Number(pl.comissaoPercentual) || 0) + (Number(pl.percentualFreteGratis) || 0)) / 100, fixo: Number(pl.taxaFixaPorItem) || 0 };
}

// Preço sugerido para atingir a margem alvo (% sobre o preço). null se margem+taxa ≥ 100%.
export function precoSugerido(custoFinal, pl, margem) {
  const m = (Number(margem) || 0) / 100;
  const tabela = tabelaFaixa(pl);
  if (tabela) {
    let anterior = 0;
    for (const f of tabela) {
      const denom = 1 - f.perc - m;
      if (denom > 0) { const p = Math.round(((custoFinal + f.fixo) / denom) * 100) / 100; if (p > anterior && p <= f.max) return p; }
      anterior = f.max;
    }
    return null;
  }
  const denom = 1 - (((Number(pl.comissaoPercentual) || 0) + (Number(pl.percentualFreteGratis) || 0)) / 100) - m;
  if (denom <= 0) return null;
  return Math.round(((custoFinal + (Number(pl.taxaFixaPorItem) || 0)) / denom) * 100) / 100;
}

// Financeiro de uma unidade vendida por `preco`.
export function financeiro(preco, custoFinal, pl) {
  const p = Number(preco) || 0;
  const { perc, fixo } = taxaDe(pl, p);
  const taxas = p * perc + fixo;
  const lucro = p - taxas - custoFinal;
  const margemReal = p > 0 ? (lucro / p) * 100 : 0;
  return { taxas, lucro, margemReal };
}
