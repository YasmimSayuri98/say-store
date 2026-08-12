const { round2 } = require('../utils/money');

// Aplica uma movimentação financeira em uma conta, atualizando o saldo e
// registrando o histórico. Recebe um cliente prisma (idealmente dentro de transação).
// tipo: 'ENTRADA' soma; 'SAIDA' subtrai.
async function aplicarMovimentacao(db, { contaId, tipo, origem, valor, descricao, data, saqueId, parcelaId }) {
  const conta = await db.contaFinanceira.findUnique({ where: { id: Number(contaId) } });
  if (!conta) throw Object.assign(new Error('Conta financeira não encontrada.'), { status: 404 });
  const v = round2(valor);
  if (!(v > 0)) throw Object.assign(new Error('Valor deve ser maior que zero.'), { status: 400 });

  const delta = tipo === 'SAIDA' ? -v : v;
  const saldoApos = round2(conta.saldoAtual + delta);
  await db.contaFinanceira.update({ where: { id: conta.id }, data: { saldoAtual: saldoApos } });
  await db.movimentacaoFinanceira.create({
    data: {
      contaId: conta.id, tipo, origem, valor: v,
      descricao: descricao || null,
      data: data ? new Date(data) : new Date(),
      saldoApos,
      saqueId: saqueId || null,
      parcelaId: parcelaId || null,
    },
  });
  return saldoApos;
}

async function getConfig(db) {
  let cfg = await db.configuracaoFinanceira.findUnique({ where: { id: 1 } });
  if (!cfg) {
    cfg = await db.configuracaoFinanceira.create({ data: { id: 1, percentualLucroPadrao: 0 } });
  }
  return cfg;
}

module.exports = { aplicarMovimentacao, getConfig };
