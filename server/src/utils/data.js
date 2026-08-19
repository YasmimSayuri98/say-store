// Converte um valor de data vindo do formulário para armazenamento.
// Campos de "dia" (input type="date", ex.: "2026-08-13") são ancorados ao meio-dia UTC.
// Isso evita a troca de dia por fuso horário: meio-dia UTC continua sendo o mesmo dia
// em qualquer fuso entre UTC-11 e UTC+12 (inclui o horário de Brasília, UTC-3), então a
// data exibida é sempre a que a pessoa escolheu. Timestamps completos passam intactos.
function parseDataDia(v) {
  if (!v) return undefined;
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(`${s}T12:00:00.000Z`);
  return new Date(s);
}

// Normaliza o prazo de envio da plataforma (ship_by_date) para o DIA-limite, ancorado ao meio-dia
// UTC. O instante-limite costuma ser 23:59 do dia (ou 00:00 do dia seguinte); recuamos 1 segundo e
// pegamos o dia no fuso de Brasília, gravando ao meio-dia UTC. Assim o dia exibido bate com o que a
// plataforma mostra — em qualquer fuso e independente da versão do site (à prova de cache).
function normalizarPrazoLimite(prazo) {
  if (!prazo) return null;
  const menos1s = new Date(new Date(prazo).getTime() - 1000);
  const diaBR = menos1s.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // YYYY-MM-DD
  return new Date(`${diaBR}T12:00:00.000Z`);
}

module.exports = { parseDataDia, normalizarPrazoLimite };
