import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { moeda, data } from '../format';
import { useToast } from '../components/Toast';

function Cartao({ titulo, valor, cor, sub }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-grafite-800/50 mb-1">{titulo}</div>
      <div className={'text-2xl font-display font-bold ' + (cor || 'text-grafite-900')}>{valor}</div>
      {sub && <div className="text-xs text-grafite-800/50 mt-1">{sub}</div>}
    </div>
  );
}

export default function Financeiro() {
  const [r, setR] = useState(null);
  const [cfg, setCfg] = useState(null);
  const toast = useToast();

  async function carregar() {
    const dados = await api.get('/financeiro/resumo?meses=12');
    setR(dados);
    setCfg({
      percentualLucroPadrao: String(dados.config.percentualLucroPadrao ?? 0),
      contaOperacionalPadraoId: dados.config.contaOperacionalPadraoId ?? '',
      contaLucroPadraoId: dados.config.contaLucroPadraoId ?? '',
    });
  }
  useEffect(() => { carregar(); }, []);

  async function salvarConfig() {
    try {
      await api.put('/financeiro/config', {
        percentualLucroPadrao: Number(cfg.percentualLucroPadrao) || 0,
        contaOperacionalPadraoId: cfg.contaOperacionalPadraoId || null,
        contaLucroPadraoId: cfg.contaLucroPadraoId || null,
      });
      toast.sucesso('Configuração salva.');
      carregar();
    } catch (e) { toast.erro(e.message); }
  }

  if (!r || !cfg) return <p>Carregando...</p>;

  const maxSaldo = Math.max(1, ...r.projecao.map((p) => Math.abs(p.saldoProjetado)));

  return (
    <div>
      <h1 className="text-3xl font-display font-extrabold text-grafite-900 mb-1">Visão financeira</h1>
      <p className="text-grafite-800/60 mb-6 text-sm max-w-3xl">
        Saldos das contas, contas a pagar e a projeção de fluxo de caixa dos próximos meses.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Cartao titulo="Saldo disponível" valor={moeda(r.saldoDisponivel)} cor="text-green-700" sub="Banco Cora" />
        <Cartao titulo="Reserva de lucro" valor={moeda(r.saldoReservaLucro)} cor="text-marca-600" sub="Banco Inter" />
        <Cartao titulo="Contas a pagar" valor={moeda(r.contasPagar.totalPendente)} cor="text-grafite-900" sub={r.contasPagar.vencidoTotal > 0 ? `${moeda(r.contasPagar.vencidoTotal)} vencido` : 'Em dia'} />
        <Cartao titulo="A vencer em 30 dias" valor={moeda(r.contasPagar.aVencer30)} cor="text-amber-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Projeção de fluxo de caixa */}
        <div className="card lg:col-span-2 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-grafite-900">Projeção de fluxo de caixa</h2>
            <Link to="/contas-pagar" className="text-marca-600 text-sm hover:underline">Ver contas a pagar →</Link>
          </div>
          <table className="w-full">
            <thead><tr>
              <th className="th">Período</th>
              <th className="th text-right">A pagar</th>
              <th className="th text-right">Saldo projetado</th>
              <th className="th w-1/3">Evolução</th>
            </tr></thead>
            <tbody>
              {r.projecao.map((p) => (
                <tr key={p.chave} className={p.vencida ? 'bg-red-50' : ''}>
                  <td className="td font-medium">{p.label}{p.vencida && <span className="text-red-600 text-xs"> (atrasadas)</span>}</td>
                  <td className={'td text-right ' + (p.aPagar > 0 ? 'text-amber-600' : 'text-grafite-800/40')}>{p.aPagar > 0 ? '− ' + moeda(p.aPagar) : '—'}</td>
                  <td className={'td text-right font-semibold ' + (p.saldoProjetado >= 0 ? 'text-grafite-900' : 'text-red-600')}>{moeda(p.saldoProjetado)}</td>
                  <td className="td">
                    <div className="h-2 rounded-full bg-base-200 overflow-hidden">
                      <div className={'h-full rounded-full ' + (p.saldoProjetado >= 0 ? 'bg-green-500' : 'bg-red-500')}
                        style={{ width: Math.min(100, (Math.abs(p.saldoProjetado) / maxSaldo) * 100) + '%' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {r.projecao.some((p) => p.saldoProjetado < 0) && (
            <p className="text-red-600 text-sm mt-3 font-medium">⚠ O saldo projetado fica negativo em algum mês. Reforce o caixa ou renegocie parcelas.</p>
          )}
        </div>

        <div className="space-y-6">
          {/* Próximas parcelas */}
          <div className="card">
            <h2 className="font-display font-bold text-grafite-900 mb-3">Próximas contas</h2>
            {r.proximas.length === 0 ? (
              <p className="text-grafite-800/50 text-sm">Nenhuma conta pendente.</p>
            ) : (
              <ul className="space-y-2">
                {r.proximas.map((p) => (
                  <li key={p.id} className="flex justify-between items-center text-sm">
                    <div>
                      <div className="font-medium text-grafite-900">{p.descricao}</div>
                      <div className={'text-xs ' + (p.vencida ? 'text-red-600' : 'text-grafite-800/50')}>
                        {p.numeroParcelas > 1 ? `Parcela ${p.numero}/${p.numeroParcelas} · ` : ''}vence {data(p.vencimento)}{p.vencida ? ' (vencida)' : ''}
                      </div>
                    </div>
                    <span className="font-semibold">{moeda(p.valor)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Configuração */}
          <div className="card">
            <h2 className="font-display font-bold text-grafite-900 mb-3">Regra de lucro no saque</h2>
            <div className="space-y-3">
              <div>
                <label className="label">% direcionado ao lucro</label>
                <input type="number" step="0.01" className="input" value={cfg.percentualLucroPadrao}
                  onChange={(e) => setCfg({ ...cfg, percentualLucroPadrao: e.target.value })} />
              </div>
              <div>
                <label className="label">Conta que recebe o saque</label>
                <select className="input" value={cfg.contaOperacionalPadraoId} onChange={(e) => setCfg({ ...cfg, contaOperacionalPadraoId: e.target.value })}>
                  <option value="">—</option>
                  {r.contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Conta de reserva do lucro</label>
                <select className="input" value={cfg.contaLucroPadraoId} onChange={(e) => setCfg({ ...cfg, contaLucroPadraoId: e.target.value })}>
                  <option value="">—</option>
                  {r.contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <button className="btn btn-primary w-full" onClick={salvarConfig}>Salvar regra</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
