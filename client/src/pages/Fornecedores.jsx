import { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

const vazio = { nome: '', tipo: 'FISICA', ecommerce: '' };

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [editando, setEditando] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const toast = useToast();

  async function carregar() { setFornecedores(await api.get('/fornecedores')); }
  useEffect(() => { carregar(); }, []);

  function novo() { setEditando({ ...vazio }); setModalAberto(true); }
  function editar(f) {
    setEditando({ id: f.id, nome: f.nome, tipo: f.tipo || 'FISICA', ecommerce: f.ecommerce || '' });
    setModalAberto(true);
  }

  async function salvar() {
    try {
      if (!editando.nome.trim()) return toast.erro('Informe o nome da loja.');
      if (editando.tipo === 'ECOMMERCE' && !editando.ecommerce.trim()) return toast.erro('Informe qual é o ecommerce.');
      const corpo = {
        nome: editando.nome.trim(),
        tipo: editando.tipo,
        ecommerce: editando.tipo === 'ECOMMERCE' ? editando.ecommerce.trim() : null,
      };
      if (editando.id) await api.put('/fornecedores/' + editando.id, corpo);
      else await api.post('/fornecedores', corpo);
      toast.sucesso('Fornecedor salvo.');
      setModalAberto(false); carregar();
    } catch (e) { toast.erro(e.message); }
  }

  async function excluir(f) {
    if (!window.confirm(`Excluir o fornecedor "${f.nome}"?`)) return;
    try {
      await api.del('/fornecedores/' + f.id);
      toast.sucesso('Fornecedor excluído.');
      setFornecedores((lista) => lista.filter((x) => x.id !== f.id));
    } catch (e) { toast.erro(e.message); }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-3xl font-display font-extrabold text-grafite-900">Fornecedores</h1>
        <button className="btn btn-primary" onClick={novo}>+ Novo fornecedor</button>
      </div>
      <p className="text-grafite-800/60 mb-6 text-sm max-w-2xl">
        Cadastre as lojas onde você compra seus materiais. Marque se é uma loja física ou um
        ecommerce (e qual). Esses fornecedores aparecem ao registrar uma entrada de estoque.
      </p>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="th">Loja</th>
            <th className="th">Tipo</th>
            <th className="th">Ecommerce</th>
            <th className="th">Ações</th>
          </tr></thead>
          <tbody>
            {fornecedores.map((f) => (
              <tr key={f.id}>
                <td className="td font-medium">{f.nome}</td>
                <td className="td">
                  <span className={'badge ' + (f.tipo === 'ECOMMERCE' ? 'badge-baixo' : 'badge-normal')}>
                    {f.tipo === 'ECOMMERCE' ? 'Ecommerce' : 'Física'}
                  </span>
                </td>
                <td className="td">{f.tipo === 'ECOMMERCE' ? (f.ecommerce || '—') : <span className="text-grafite-800/40">—</span>}</td>
                <td className="td whitespace-nowrap">
                  <button className="btn btn-secondary btn-sm mr-1" onClick={() => editar(f)}>Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => excluir(f)}>Excluir</button>
                </td>
              </tr>
            ))}
            {fornecedores.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={4}>Nenhum fornecedor cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <Modal titulo={editando.id ? 'Editar fornecedor' : 'Novo fornecedor'} onClose={() => setModalAberto(false)}>
          <div className="space-y-3">
            <div>
              <label className="label">Nome da loja *</label>
              <input className="input" value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} placeholder="Ex.: Loja do Filamento, 3D Lab, Amazon" />
            </div>
            <div>
              <label className="label">Tipo de loja *</label>
              <select className="input" value={editando.tipo} onChange={(e) => setEditando({ ...editando, tipo: e.target.value })}>
                <option value="FISICA">Física</option>
                <option value="ECOMMERCE">Ecommerce</option>
              </select>
            </div>
            {editando.tipo === 'ECOMMERCE' && (
              <div>
                <label className="label">Qual ecommerce? *</label>
                <input className="input" value={editando.ecommerce} onChange={(e) => setEditando({ ...editando, ecommerce: e.target.value })} placeholder="Ex.: Amazon, Mercado Livre, Shopee, AliExpress" />
              </div>
            )}
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
