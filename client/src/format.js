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

// Prazo de envio: lido no fuso de Brasília. Vale para o prazo que vem da Shopee (um horário real,
// ex.: hoje 23:59 BRT — em UTC já seria o dia seguinte) e para pedidos manuais (guardados ao
// meio-dia UTC, que em Brasília continua o mesmo dia). Assim o dia bate com o que a Shopee mostra.
export function dataDia(v) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('pt-BR', { timeZone: TZ });
}

// Dia (YYYY-MM-DD) de um valor num fuso específico, para comparar prazos.
export function diaISO(v, tz) {
  return new Date(v).toLocaleDateString('en-CA', { timeZone: tz });
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
