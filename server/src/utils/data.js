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

module.exports = { parseDataDia };
