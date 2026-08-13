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

// Fuso fixo do negócio (Brasília). Fixamos o fuso na exibição para que as datas/horas
// apareçam sempre no horário de Brasília, independente do fuso do aparelho de quem acessa.
const TZ = 'America/Sao_Paulo';

export function data(v) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('pt-BR', { timeZone: TZ });
}

export function dataHora(v) {
  if (!v) return '-';
  return new Date(v).toLocaleString('pt-BR', { timeZone: TZ });
}

// Data de hoje (Brasília) no formato "YYYY-MM-DD", para preencher inputs type="date".
export function hojeISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

export function situacaoBadge(s) {
  if (s === 'NORMAL') return { cls: 'badge-normal', texto: 'Normal' };
  if (s === 'BAIXO') return { cls: 'badge-baixo', texto: 'Estoque baixo' };
  return { cls: 'badge-sem', texto: 'Sem estoque' };
}
