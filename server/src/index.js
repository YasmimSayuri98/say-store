const express = require('express');
const cors = require('cors');

const app = express();
// CORS: se CORS_ORIGIN estiver definido, restringe àquela origem; senão, libera geral.
// Seguro liberar aqui porque a autenticação é por token no cabeçalho (não por cookie).
app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN } : {}));
app.use(express.json());

// Rotas públicas (sem autenticação): login e health-check.
app.use('/api/login', require('./routes/auth'));
app.get('/api/health', (req, res) => res.json({ ok: true }));

// A partir daqui, tudo exige token válido.
app.use('/api', require('./middleware/auth'));

app.use('/api/materiais', require('./routes/materiais'));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/unidades', require('./routes/unidades'));
app.use('/api/fornecedores', require('./routes/fornecedores'));
app.use('/api/entradas', require('./routes/entradas'));
app.use('/api/produtos', require('./routes/produtos'));
app.use('/api/envios', require('./routes/envios'));
app.use('/api/movimentacoes', require('./routes/movimentacoes'));
app.use('/api/ajustes', require('./routes/ajustes'));
app.use('/api/lista-compras', require('./routes/listaCompras'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/plataformas', require('./routes/plataformas'));
app.use('/api/precificacao', require('./routes/precificacao'));
app.use('/api/faturamento', require('./routes/faturamento'));
app.use('/api/contas-financeiras', require('./routes/contasFinanceiras'));
app.use('/api/saques', require('./routes/saques'));
app.use('/api/contas-pagar', require('./routes/contasPagar'));
app.use('/api/financeiro', require('./routes/financeiro'));
app.use('/api/producao', require('./routes/producao'));
app.use('/api/embalagens', require('./routes/embalagens'));
app.use('/api/notas', require('./routes/notas'));
app.use('/api/tarefas', require('./routes/tarefas'));

// Handler de erros
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.', detalhe: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));

// Sincronização periódica de pedidos de todas as plataformas com integração ativa.
const INTERVALO_SYNC_PLATAFORMAS_MS = 5 * 60 * 1000;
setInterval(async () => {
  try {
    const { sincronizarTodasAtivas } = require('./services/plataformaSyncService');
    const resultados = await sincronizarTodasAtivas();
    for (const r of resultados) {
      if (r.ok) console.log(`[plataforma ${r.plataformaId}] sincronização automática: ${r.pedidosNovos} pedido(s) novo(s), ${r.itensNovos} item(ns) novo(s).`);
      else console.error(`[plataforma ${r.plataformaId}] falha na sincronização automática:`, r.erro);
    }
  } catch (e) {
    console.error('[plataformas] falha na sincronização automática:', e.message);
  }
}, INTERVALO_SYNC_PLATAFORMAS_MS);

// Mantém as contas fixas com parcelas geradas continuamente (na subida e 1x por dia).
async function manterContasFixas() {
  try { await require('./routes/contasPagar').manterContasFixas(); }
  catch (e) { console.error('[contas fixas] falha ao manter:', e.message); }
}
manterContasFixas();
setInterval(manterContasFixas, 24 * 60 * 60 * 1000);

module.exports = app;
