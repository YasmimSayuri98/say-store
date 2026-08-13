import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { moeda } from '../format';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const toast = useToast();

  async function carregar() {
    const q = busca ? '?busca=' + encodeURIComponent(busca) : '';
    setProdutos(await api.get('/produtos' + q));
  }
  useEffect(() => { carregar(); }, [busca]);

  function novo() { setEditando({ nome: '', sku: '', descricao: '', personalizado: false }); setModalAberto(true); }
  function editar(p) { setEditando({ ...p }); setModalAberto(true); }

  async function duplicar(p) {
    try {
      const copia = await api.post('/produtos/' + p.id + '/duplicar', {});
      toast.sucesso('Produto duplicado (com a ficha técnica). Ajuste o nome e o SKU.');
      await carregar();
      setEditando({ ...copia }); // abre o produto novo já em edição
      setModalAberto(true);
    } catch (e) { toast.erro(e.message); }
  }

  async function salvar() {
    try {
      if (editando.id) await api.put('/produtos/' + editando.id, editando);
      else await api.post('/produtos', editando);
      toast.sucesso('Produto salvo.');
      setModalAberto(false); carregar();
    } catch (e) { toast.erro(e.message); }
  }
  async function alternarStatus(p) {
    try { await api.patch('/produtos/' + p.id + '/status', { ativo: !p.ativo }); carregar(); }
    catch (e) { toast.erro(e.message); }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-display font-extrabold text-grafite-900">Produtos</h1>
        <button className="btn btn-primary" onClick={novo}>+ Novo produto</button>
      </div>
      <input className="input max-w-xs mb-4" placeholder="Buscar por nome ou SKU..." value={busca} onChange={(e) => setBusca(e.target.value)} />

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className="th">Nome</th><th className="th">SKU</th><th className="th">Custo de materiais</th><th className="th">Ações</th></tr></thead>
          <tbody>
            {produtos.map((p) => (
              <tr key={p.id} className={!p.ativo ? 'opacity-50' : ''}>
                <td className="td font-medium">
                  {p.nome}{!p.ativo && <span className="text-xs text-grafite-800/40"> (inativo)</span>}
                  {p.personalizado && <span className="badge badge-baixo ml-2">Personalizado</span>}
                </td>
                <td className="td">{p.sku}</td>
                <td className="td">{moeda(p.custoAtualMateriais)}</td>
                <td className="td whitespace-nowrap">
                  <Link to={'/produtos/' + p.id} className="btn btn-primary btn-sm mr-1">Ficha / Custo</Link>
                  <button className="btn btn-secondary btn-sm mr-1" onClick={() => editar(p)}>Editar</button>
                  <button className="btn btn-secondary btn-sm mr-1" onClick={() => duplicar(p)}>Duplicar</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => alternarStatus(p)}>{p.ativo ? 'Inativar' : 'Ativar'}</button>
                </td>
              </tr>
            ))}
            {produtos.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={4}>Nenhum produto.</td></tr>}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <Modal titulo={editando.id ? 'Editar produto' : 'Novo produto'} onClose={() => setModalAberto(false)}>
          <div className="space-y-3">
            <div><label className="label">Nome *</label><input className="input" value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} /></div>
            <div><label className="label">Código / SKU *</label><input className="input" value={editando.sku} onChange={(e) => setEditando({ ...editando, sku: e.target.value })} /></div>
            <div><label className="label">Descrição</label><textarea className="input" rows={2} value={editando.descricao || ''} onChange={(e) => setEditando({ ...editando, descricao: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm text-grafite-800/70">
              <input type="checkbox" checked={!!editando.personalizado} onChange={(e) => setEditando({ ...editando, personalizado: e.target.checked })} />
              Produto personalizado (recebe foto do cliente para impressão)
            </label>
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
