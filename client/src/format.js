export function moeda(v) {
  const n = Number(v || 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function moeda4(v) {
  const n = Number(v || 0);
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export function numero(v, casas = 2) {
  const n = Number(v || 0);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
}

export function data(v) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('pt-BR');
}

export function dataHora(v) {
  if (!v) return '-';
  return new Date(v).toLocaleString('pt-BR');
}

export function situacaoBadge(s) {
  if (s === 'NORMAL') return { cls: 'badge-normal', texto: 'Normal' };
  if (s === 'BAIXO') return { cls: 'badge-baixo', texto: 'Estoque baixo' };
  return { cls: 'badge-sem', texto: 'Sem estoque' };
}
