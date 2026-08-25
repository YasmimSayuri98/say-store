import { useEffect, useState } from 'react';
import { api } from '../api';
import { moeda, dataHora } from '../format';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

const TIPOS = [
  { v: 'CAIXA', l: 'Caixa (dinheiro)' },
  { v: 'BANCO', l: 'Banco' },
  { v: 'RESERVA_LUCRO', l: 'Reserva de lucro' },
  { v: 'OUTRO', l: 'Outro' },
];
const tipoLabel = (v) => (TIPOS.find((t) => t.v === v) || {}).l || v;

export default function ContasFinanceiras() {
  const [contas, setContas] = useState([]);
  const [novaAberto, setNovaAberto] = useState(false);
  const [nova, setNova] = useState({ nome: '', tipo: 'BANCO', saldoInicial: '' });
  const [movModal, setMovModal] = useState(null); // { conta, acao, valor, descricao }
  const [extrato, setExtrato] = useState(null); // { conta, movs }
  const toast = useToast();

  async function carregar() { setContas((await api.get('/contas-financeiras')).filter((c) => c.ativo)); }
  useEffect(() => { carregar(); }, []);

  async function criar() {
    try {
      await api.post('/contas-financeiras', { nome: nova.nome, tipo: nova.tipo, saldoInicial: Number(nova.saldoInicial) || 0 });
      toast.sucesso('Conta criada.');
      setNovaAberto(false); setNova({ nome: '', tipo: 'BANCO', saldoInicial: '' }); carregar();
    } catch (e) { toast.erro(e.message); }
  }

  async function movimentar() {
    if (movModal.acao === 'DEFINIR' && !(movModal.senha || '').trim()) {
      return toast.erro('Digite a senha do administrador para ajustar o saldo.');
    }
    try {
      await api.post('/contas-financeiras/' + movModal.conta.id + '/movimentar', {
        acao: movModal.acao, valor: Number(movModal.valor) || 0, descricao: movModal.descricao || undefined,
        senha: movModal.acao === 'DEFINIR' ? movModal.senha : undefined,
      });
      toast.sucesso('Movimentação registrada.');
      setMovModal(null); carregar();
    } catch (e) { toast.erro(e.message); }
  }

  async function abrirExtrato(conta) {
    const movs = await api.get('/contas-financeiras/' + conta.id + '/movimentacoes');
    setExtrato({ conta, movs });
  }

  const total = contas.filter((c) => c.ativo).reduce((s, c) => s + c.saldoAtual, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-3xl font-display font-extrabold text-grafite-900">Contas</h1>
        <button className="btn btn-primary" onClick={() => setNovaAberto(true)}>+ Nova conta</button>
      </div>
      <p className="text-grafite-800/60 mb-6 text-sm">Saldo total das contas ativas: <b className="text-grafite-900">{moeda(total)}</b></p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contas.map((c) => (
          <div key={c.id} className={'card ' + (!c.ativo ? 'opacity-60' : '')}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-display font-bold text-grafite-900 text-lg">{c.nome}</div>
                <div className="text-xs uppercase tracking-wide text-grafite-800/50">{tipoLabel(c.tipo)}</div>
              </div>
              {c.tipo === 'RESERVA_LUCRO' && <span className="badge badge-baixo">Lucro</span>}
            </div>
            <div className={'text-2xl font-display font-bold mt-3 ' + (c.saldoAtual >= 0 ? 'text-grafite-900' : 'text-red-600')}>{moeda(c.saldoAtual)}</div>
            <div className="flex flex-wrap gap-2 mt-4">
              <button className="btn btn-secondary btn-sm" onClick={() => setMovModal({ conta: c, acao: 'APORTE', valor: '', descricao: '' })}>+ Aporte</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setMovModal({ conta: c, acao: 'RETIRADA', valor: '', descricao: '' })}>− Retirada</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setMovModal({ conta: c, acao: 'DEFINIR', valor: String(c.saldoAtual), descricao: '', senha: '' })} title="Requer senha do administrador">🔒 Ajustar</button>
              <button className="btn btn-ghost btn-sm text-marca-600" onClick={() => abrirExtrato(c)}>Extrato</button>
            </div>
          </div>
        ))}
      </div>

      {novaAberto && (
        <Modal titulo="Nova conta" onClose={() => setNovaAberto(false)}>
          <div className="space-y-3">
            <div><label className="label">Nome *</label><input className="input" value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} placeholder="Ex.: Nubank, Cofre, Mercado Pago" /></div>
            <div><label className="label">Tipo</label>
              <select className="input" value={nova.tipo} onChange={(e) => setNova({ ...nova, tipo: e.target.value })}>
                {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div><label className="label">Saldo inicial (R$)</label><input type="number" step="0.01" className="input" value={nova.saldoInicial} onChange={(e) => setNova({ ...nova, saldoInicial: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn btn-secondary" onClick={() => setNovaAberto(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={criar}>Criar</button>
          </div>
        </Modal>
      )}

      {movModal && (
        <Modal titulo={`${movModal.acao === 'APORTE' ? 'Aporte em' : movModal.acao === 'RETIRADA' ? 'Retirada de' : 'Ajustar saldo de'} ${movModal.conta.nome}`} onClose={() => setMovModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="label">{movModal.acao === 'DEFINIR' ? 'Novo saldo (R$)' : 'Valor (R$)'}</label>
              <input type="number" step="0.01" className="input" value={movModal.valor} onChange={(e) => setMovModal({ ...movModal, valor: e.target.value })} autoFocus />
            </div>
            <div><label className="label">Descrição</label><input className="input" value={movModal.descricao} onChange={(e) => setMovModal({ ...movModal, descricao: e.target.value })} placeholder="Opcional" /></div>
            {movModal.acao === 'DEFINIR' && (
              <div>
                <label className="label">🔒 Senha do administrador *</label>
                <input type="password" className="input" value={movModal.senha || ''} onChange={(e) => setMovModal({ ...movModal, senha: e.target.value })} placeholder="Senha do sistema" autoComplete="off" />
                <p className="text-xs text-grafite-800/50 mt-1">Ajustar o saldo exige a senha do sistema.</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn btn-secondary" onClick={() => setMovModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={movimentar}>Confirmar</button>
          </div>
        </Modal>
      )}

      {extrato && (
        <Modal titulo={`Extrato — ${extrato.conta.nome}`} onClose={() => setExtrato(null)}>
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="th">Data</th><th className="th">Descrição</th><th className="th text-right">Valor</th><th className="th text-right">Saldo</th></tr></thead>
              <tbody>
                {extrato.movs.map((m) => (
                  <tr key={m.id}>
                    <td className="td whitespace-nowrap">{dataHora(m.data)}</td>
                    <td className="td">{m.descricao || m.origem}</td>
                    <td className={'td text-right ' + (m.tipo === 'ENTRADA' ? 'text-green-700' : 'text-red-600')}>{m.tipo === 'ENTRADA' ? '+' : '−'} {moeda(m.valor)}</td>
                    <td className="td text-right">{moeda(m.saldoApos)}</td>
                  </tr>
                ))}
                {extrato.movs.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={4}>Sem movimentações.</td></tr>}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
