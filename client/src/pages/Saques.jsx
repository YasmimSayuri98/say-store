import { useEffect, useState } from 'react';
import { api } from '../api';
import { moeda, numero, data } from '../format';
import { useToast } from '../components/Toast';

export default function Saques() {
  const [plataformas, setPlataformas] = useState([]);
  const [contas, setContas] = useState([]);
  const [saques, setSaques] = useState([]);
  const [form, setForm] = useState({ plataformaId: '', valorBruto: '', percentualLucro: '', contaDestinoId: '', contaLucroId: '', dataSaque: '', observacao: '' });
  const toast = useToast();

  async function carregar() {
    const [pls, cts, cfg, sqs] = await Promise.all([
      api.get('/plataformas?ativo=true'),
      api.get('/contas-financeiras'),
      api.get('/financeiro/config'),
      api.get('/saques'),
    ]);
    setPlataformas(pls); setContas(cts); setSaques(sqs);
    setForm((f) => ({
      ...f,
      plataformaId: f.plataformaId || (pls[0] ? String(pls[0].id) : ''),
      percentualLucro: f.percentualLucro !== '' ? f.percentualLucro : String(cfg.percentualLucroPadrao ?? 0),
      contaDestinoId: f.contaDestinoId || (cfg.contaOperacionalPadraoId ? String(cfg.contaOperacionalPadraoId) : ''),
      contaLucroId: f.contaLucroId || (cfg.contaLucroPadraoId ? String(cfg.contaLucroPadraoId) : ''),
    }));
  }
  useEffect(() => { carregar(); }, []);

  const bruto = Number(form.valorBruto) || 0;
  const pct = Number(form.percentualLucro) || 0;
  const lucro = Math.round(bruto * (pct / 100) * 100) / 100;
  const liquido = Math.round((bruto - lucro) * 100) / 100;

  async function registrar() {
    try {
      if (!(bruto > 0)) return toast.erro('Informe o valor do saque.');
      await api.post('/saques', {
        plataformaId: form.plataformaId || undefined,
        valorBruto: bruto,
        percentualLucro: pct,
        contaDestinoId: form.contaDestinoId || undefined,
        contaLucroId: form.contaLucroId || undefined,
        data: form.dataSaque || undefined,
        observacao: form.observacao || undefined,
      });
      toast.sucesso('Saque registrado.');
      setForm((f) => ({ ...f, valorBruto: '', observacao: '', dataSaque: '' }));
      carregar();
    } catch (e) { toast.erro(e.message); }
  }

  return (
    <div>
      <h1 className="text-3xl font-display font-extrabold text-grafite-900 mb-1">Saques das plataformas</h1>
      <p className="text-grafite-800/60 mb-6 text-sm max-w-3xl">
        Registre o valor recebido de cada plataforma. Um percentual é automaticamente separado para a
        reserva de lucro (banco separado) e o restante entra na conta operacional.
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-display font-bold text-grafite-900 mb-3">Registrar saque</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Plataforma</label>
                <select className="input" value={form.plataformaId} onChange={(e) => setForm({ ...form, plataformaId: e.target.value })}>
                  <option value="">Sem plataforma</option>
                  {plataformas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div><label className="label">Valor recebido (R$)</label>
                <input type="number" step="0.01" className="input" value={form.valorBruto} onChange={(e) => setForm({ ...form, valorBruto: e.target.value })} autoFocus />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">% para lucro</label>
                <input type="number" step="0.01" className="input" value={form.percentualLucro} onChange={(e) => setForm({ ...form, percentualLucro: e.target.value })} />
              </div>
              <div><label className="label">Data</label>
                <input type="date" className="input" value={form.dataSaque} onChange={(e) => setForm({ ...form, dataSaque: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Entra na conta</label>
                <select className="input" value={form.contaDestinoId} onChange={(e) => setForm({ ...form, contaDestinoId: e.target.value })}>
                  {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div><label className="label">Reserva de lucro</label>
                <select className="input" value={form.contaLucroId} onChange={(e) => setForm({ ...form, contaLucroId: e.target.value })}>
                  <option value="">—</option>
                  {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>
            <div><label className="label">Observação</label><input className="input" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Opcional" /></div>
          </div>

          <div className="mt-4 rounded-xl bg-base-100 p-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-grafite-800/70">Reserva de lucro ({numero(pct)}%)</span><span className="font-semibold text-marca-600">{moeda(lucro)}</span></div>
            <div className="flex justify-between"><span className="text-grafite-800/70">Entra na conta operacional</span><span className="font-semibold text-green-700">{moeda(liquido)}</span></div>
            <div className="flex justify-between border-t pt-1.5"><span className="font-semibold">Total do saque</span><span className="font-bold">{moeda(bruto)}</span></div>
          </div>

          <button className="btn btn-primary w-full mt-4" onClick={registrar}>Registrar saque</button>
        </div>

        <div className="card overflow-x-auto">
          <h2 className="font-display font-bold text-grafite-900 mb-3">Histórico de saques</h2>
          <table className="w-full">
            <thead><tr>
              <th className="th">Data</th><th className="th">Plataforma</th>
              <th className="th text-right">Bruto</th><th className="th text-right">Lucro</th><th className="th text-right">Líquido</th>
            </tr></thead>
            <tbody>
              {saques.map((s) => (
                <tr key={s.id}>
                  <td className="td">{data(s.data)}</td>
                  <td className="td">{s.plataforma ? s.plataforma.nome : '—'}</td>
                  <td className="td text-right">{moeda(s.valorBruto)}</td>
                  <td className="td text-right text-marca-600">{moeda(s.valorLucro)}</td>
                  <td className="td text-right text-green-700">{moeda(s.valorLiquido)}</td>
                </tr>
              ))}
              {saques.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={5}>Nenhum saque registrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
