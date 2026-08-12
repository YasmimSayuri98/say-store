import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { numero } from '../format';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

const vazio = { nome: '', comissaoPercentual: '', taxaFixaPorItem: '', percentualFreteGratis: '' };

export default function Plataformas() {
  const [plataformas, setPlataformas] = useState([]);
  const [editando, setEditando] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const toast = useToast();

  async function carregar() { setPlataformas(await api.get('/plataformas')); }
  useEffect(() => { carregar(); }, []);

  function novo() { setEditando({ ...vazio }); setModalAberto(true); }
  function editar(p) {
    setEditando({
      ...p,
      comissaoPercentual: String(p.comissaoPercentual),
      taxaFixaPorItem: String(p.taxaFixaPorItem),
      percentualFreteGratis: String(p.percentualFreteGratis),
    });
    setModalAberto(true);
  }

  async function salvar() {
    try {
      const corpo = {
        nome: editando.nome,
        comissaoPercentual: Number(editando.comissaoPercentual) || 0,
        taxaFixaPorItem: Number(editando.taxaFixaPorItem) || 0,
        percentualFreteGratis: Number(editando.percentualFreteGratis) || 0,
      };
      if (editando.id) await api.put('/plataformas/' + editando.id, corpo);
      else await api.post('/plataformas', corpo);
      toast.sucesso('Plataforma salva.');
      setModalAberto(false); carregar();
    } catch (e) { toast.erro(e.message); }
  }
  async function alternarStatus(p) {
    try { await api.patch('/plataformas/' + p.id + '/status', { ativo: !p.ativo }); carregar(); }
    catch (e) { toast.erro(e.message); }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-3xl font-display font-extrabold text-grafite-900">Plataformas de venda</h1>
        <button className="btn btn-primary" onClick={novo}>+ Nova plataforma</button>
      </div>
      <p className="text-grafite-800/60 mb-6 text-sm max-w-2xl">
        Configure aqui as taxas de cada canal (Shopee, TikTok Shop, etc.). Esses valores são usados
        para sugerir o preço de venda e calcular o lucro dos envios. Os valores iniciais são de
        referência — ajuste conforme o seu contrato atual em cada plataforma.
      </p>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="th">Plataforma</th>
            <th className="th">Comissão</th>
            <th className="th">Taxa fixa / item</th>
            <th className="th">Frete grátis (%)</th>
            <th className="th">Taxa total sobre venda</th>
            <th className="th">Ações</th>
          </tr></thead>
          <tbody>
            {plataformas.map((p) => (
              <tr key={p.id} className={!p.ativo ? 'opacity-50' : ''}>
                <td className="td font-medium">{p.nome}{!p.ativo && <span className="text-xs text-grafite-800/40"> (inativa)</span>}</td>
                <td className="td">{numero(p.comissaoPercentual)}%</td>
                <td className="td">R$ {numero(p.taxaFixaPorItem)}</td>
                <td className="td">{numero(p.percentualFreteGratis)}%</td>
                <td className="td font-medium">{numero(p.comissaoPercentual + p.percentualFreteGratis)}% + R$ {numero(p.taxaFixaPorItem)}/item</td>
                <td className="td whitespace-nowrap">
                  <Link to={`/plataformas/${p.id}/integracao`} className="btn btn-secondary btn-sm mr-1">Integração de pedidos</Link>
                  <button className="btn btn-secondary btn-sm mr-1" onClick={() => editar(p)}>Editar</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => alternarStatus(p)}>{p.ativo ? 'Inativar' : 'Ativar'}</button>
                </td>
              </tr>
            ))}
            {plataformas.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={6}>Nenhuma plataforma cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <Modal titulo={editando.id ? 'Editar plataforma' : 'Nova plataforma'} onClose={() => setModalAberto(false)}>
          <div className="space-y-3">
            <div>
              <label className="label">Nome *</label>
              <input className="input" value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} placeholder="Ex.: Shopee, TikTok Shop, Mercado Livre" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Comissão (%)</label>
                <input type="number" step="0.01" className="input" value={editando.comissaoPercentual} onChange={(e) => setEditando({ ...editando, comissaoPercentual: e.target.value })} />
              </div>
              <div>
                <label className="label">Taxa fixa por item (R$)</label>
                <input type="number" step="0.01" className="input" value={editando.taxaFixaPorItem} onChange={(e) => setEditando({ ...editando, taxaFixaPorItem: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Frete grátis / subsídio (%)</label>
              <input type="number" step="0.01" className="input" value={editando.percentualFreteGratis} onChange={(e) => setEditando({ ...editando, percentualFreteGratis: e.target.value })} />
              <p className="text-xs text-grafite-800/50 mt-1">Percentual adicional cobrado quando você adere ao programa de frete grátis. Deixe 0 se não participa.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn btn-secondary" onClick={() => setModalAberto(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvar}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
