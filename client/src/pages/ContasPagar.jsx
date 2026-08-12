import { useEffect, useState } from 'react';
import { api } from '../api';
import { moeda, data } from '../format';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function ContasPagar() {
  const [contas, setContas] = useState([]);
  const [contasFin, setContasFin] = useState([]);
  const [filtro, setFiltro] = useState('pendentes');
  const [novaAberto, setNovaAberto] = useState(false);
  const [nova, setNova] = useState({ descricao: '', categoria: '', valorTotal: '', numeroParcelas: '1', primeiroVencimento: '', observacao: '' });
  const [pagar, setPagar] = useState(null); // { parcela, contaFinanceiraId, dataPagamento }
  const toast = useToast();

  async function carregar() {
    const q = filtro && filtro !== 'todas' ? '?status=' + filtro : '';
    const [cp, cf] = await Promise.all([api.get('/contas-pagar' + q), api.get('/contas-financeiras')]);
    setContas(cp); setContasFin(cf);
  }
  useEffect(() => { carregar(); }, [filtro]);

  const nParc = Math.max(1, Number(nova.numeroParcelas) || 1);
  const valorParcela = (Number(nova.valorTotal) || 0) / nParc;

  async function criar() {
    try {
      await api.post('/contas-pagar', {
        descricao: nova.descricao, categoria: nova.categoria || undefined,
        valorTotal: Number(nova.valorTotal) || 0,
        numeroParcelas: nParc, primeiroVencimento: nova.primeiroVencimento,
        observacao: nova.observacao || undefined,
      });
      toast.sucesso('Conta cadastrada.');
      setNovaAberto(false);
      setNova({ descricao: '', categoria: '', valorTotal: '', numeroParcelas: '1', primeiroVencimento: '', observacao: '' });
      carregar();
    } catch (e) { toast.erro(e.message); }
  }

  async function confirmarPagar() {
    try {
      await api.post('/contas-pagar/parcelas/' + pagar.parcela.id + '/pagar', {
        contaFinanceiraId: Number(pagar.contaFinanceiraId), dataPagamento: pagar.dataPagamento || undefined,
      });
      toast.sucesso('Parcela paga e saldo debitado.');
      setPagar(null); carregar();
    } catch (e) { toast.erro(e.message); }
  }

  async function estornar(parcela) {
    try { await api.post('/contas-pagar/parcelas/' + parcela.id + '/estornar', {}); toast.sucesso('Pagamento estornado.'); carregar(); }
    catch (e) { toast.erro(e.message); }
  }

  async function excluir(conta) {
    try { await api.del('/contas-pagar/' + conta.id); toast.sucesso('Conta excluída.'); carregar(); }
    catch (e) { toast.erro(e.message); }
  }

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const situacaoParcela = (p) => {
    if (p.pago) return { cls: 'badge-normal', txt: 'Paga' };
    if (new Date(p.vencimento) < hoje) return { cls: 'badge-sem', txt: 'Vencida' };
    return { cls: 'badge-baixo', txt: 'Pendente' };
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-display font-extrabold text-grafite-900">Contas a pagar</h1>
        <button className="btn btn-primary" onClick={() => { setNova((n) => ({ ...n, primeiroVencimento: new Date().toISOString().slice(0, 10) })); setNovaAberto(true); }}>+ Nova conta</button>
      </div>

      <div className="flex gap-2 mb-4">
        {[['pendentes', 'Pendentes'], ['pagas', 'Quitadas'], ['todas', 'Todas']].map(([v, l]) => (
          <button key={v} className={'btn btn-sm ' + (filtro === v ? 'btn-primary' : 'btn-secondary')} onClick={() => setFiltro(v)}>{l}</button>
        ))}
      </div>

      <div className="space-y-4">
        {contas.map((c) => {
          const pagas = c.parcelas.filter((p) => p.pago).length;
          const restante = c.parcelas.filter((p) => !p.pago).reduce((s, p) => s + p.valor, 0);
          return (
            <div key={c.id} className="card">
              <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                <div>
                  <div className="font-display font-bold text-grafite-900 text-lg">{c.descricao}</div>
                  <div className="text-xs text-grafite-800/50">
                    {c.categoria ? c.categoria + ' · ' : ''}{moeda(c.valorTotal)}{c.numeroParcelas > 1 ? ` em ${c.numeroParcelas}x` : ''} · {pagas}/{c.numeroParcelas} pagas
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-grafite-800/50">Restante</div>
                  <div className="font-bold text-grafite-900">{moeda(restante)}</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr><th className="th">Parcela</th><th className="th">Vencimento</th><th className="th text-right">Valor</th><th className="th">Situação</th><th className="th text-right">Ação</th></tr></thead>
                  <tbody>
                    {c.parcelas.map((p) => {
                      const s = situacaoParcela(p);
                      return (
                        <tr key={p.id}>
                          <td className="td">{p.numero}/{c.numeroParcelas}</td>
                          <td className="td">{data(p.vencimento)}</td>
                          <td className="td text-right">{moeda(p.valor)}</td>
                          <td className="td"><span className={'badge ' + s.cls}>{s.txt}</span>{p.pago && p.contaFinanceira ? <span className="text-xs text-grafite-800/40"> · {p.contaFinanceira.nome}</span> : ''}</td>
                          <td className="td text-right">
                            {p.pago
                              ? <button className="btn btn-ghost btn-sm text-grafite-800/60" onClick={() => estornar(p)}>Estornar</button>
                              : <button className="btn btn-primary btn-sm" onClick={() => setPagar({ parcela: p, contaFinanceiraId: contasFin[0] ? String(contasFin[0].id) : '', dataPagamento: '' })}>Pagar</button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {pagas === 0 && (
                <div className="flex justify-end mt-2"><button className="btn btn-ghost btn-sm text-red-600" onClick={() => excluir(c)}>Excluir conta</button></div>
              )}
            </div>
          );
        })}
        {contas.length === 0 && <div className="card text-grafite-800/40">Nenhuma conta {filtro === 'pendentes' ? 'pendente' : filtro === 'pagas' ? 'quitada' : 'cadastrada'}.</div>}
      </div>

      {novaAberto && (
        <Modal titulo="Nova conta a pagar" onClose={() => setNovaAberto(false)}>
          <div className="space-y-3">
            <div><label className="label">Descrição *</label><input className="input" value={nova.descricao} onChange={(e) => setNova({ ...nova, descricao: e.target.value })} placeholder="Ex.: Impressora 3D, Energia, Filamento" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Categoria</label><input className="input" value={nova.categoria} onChange={(e) => setNova({ ...nova, categoria: e.target.value })} placeholder="Opcional" /></div>
              <div><label className="label">Valor total (R$) *</label><input type="number" step="0.01" className="input" value={nova.valorTotal} onChange={(e) => setNova({ ...nova, valorTotal: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Nº de parcelas</label><input type="number" min="1" className="input" value={nova.numeroParcelas} onChange={(e) => setNova({ ...nova, numeroParcelas: e.target.value })} /></div>
              <div><label className="label">1º vencimento *</label><input type="date" className="input" value={nova.primeiroVencimento} onChange={(e) => setNova({ ...nova, primeiroVencimento: e.target.value })} /></div>
            </div>
            {nParc > 1 && Number(nova.valorTotal) > 0 && (
              <p className="text-sm text-grafite-800/60">{nParc}x de <b>{moeda(valorParcela)}</b>, vencimentos mensais a partir da data escolhida.</p>
            )}
            <div><label className="label">Observação</label><input className="input" value={nova.observacao} onChange={(e) => setNova({ ...nova, observacao: e.target.value })} placeholder="Opcional" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn btn-secondary" onClick={() => setNovaAberto(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={criar}>Cadastrar</button>
          </div>
        </Modal>
      )}

      {pagar && (
        <Modal titulo="Pagar parcela" onClose={() => setPagar(null)}>
          <div className="space-y-3">
            <p className="text-sm text-grafite-800/70">{pagar.parcela.contaPagar?.descricao || 'Parcela'} — parcela {pagar.parcela.numero} · <b>{moeda(pagar.parcela.valor)}</b></p>
            <div><label className="label">Pagar com a conta</label>
              <select className="input" value={pagar.contaFinanceiraId} onChange={(e) => setPagar({ ...pagar, contaFinanceiraId: e.target.value })}>
                {contasFin.map((c) => <option key={c.id} value={c.id}>{c.nome} — {moeda(c.saldoAtual)}</option>)}
              </select>
            </div>
            <div><label className="label">Data do pagamento</label><input type="date" className="input" value={pagar.dataPagamento} onChange={(e) => setPagar({ ...pagar, dataPagamento: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn btn-secondary" onClick={() => setPagar(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={confirmarPagar}>Confirmar pagamento</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
