import { useEffect, useState } from 'react';
import { api } from '../api';
import { moeda, moeda4, numero, situacaoBadge } from '../format';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function Materiais() {
  const [materiais, setMateriais] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [editando, setEditando] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const toast = useToast();

  async function carregar() {
    const q = new URLSearchParams();
    if (busca) q.set('busca', busca);
    if (filtroCategoria) q.set('categoriaId', filtroCategoria);
    setMateriais(await api.get('/materiais?' + q.toString()));
  }
  useEffect(() => { carregar(); }, [busca, filtroCategoria]);
  useEffect(() => {
    api.get('/categorias').then(setCategorias);
    api.get('/unidades').then(setUnidades);
  }, []);

  function novo() { setEditando({ nome: '', categoriaId: '', unidadeId: '', quantidade: 0, quantidadeMinima: 0, custoMedio: 0, observacoes: '', filamento: null }); setModalAberto(true); }
  function editar(m) { setEditando({ ...m, categoriaId: m.categoriaId, unidadeId: m.unidadeId, filamento: m.filamento || null }); setModalAberto(true); }

  async function salvar() {
    try {
      const body = { ...editando };
      if (editando.id) await api.put('/materiais/' + editando.id, body);
      else await api.post('/materiais', body);
      toast.sucesso('Material salvo com sucesso.');
      setModalAberto(false); carregar();
    } catch (e) { toast.erro(e.message); }
  }

  async function alternarStatus(m) {
    try { await api.patch('/materiais/' + m.id + '/status', { ativo: !m.ativo }); carregar(); }
    catch (e) { toast.erro(e.message); }
  }

  async function excluir(m) {
    if (!window.confirm(`Excluir o material "${m.nome}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await api.del('/materiais/' + m.id);
      toast.sucesso('Material excluído.');
      setMateriais((lista) => lista.filter((x) => x.id !== m.id));
    } catch (e) { toast.erro(e.message); }
  }

  const catFilamento = categorias.find((c) => c.nome === 'Filamento');
  const ehFilamento = editando && String(editando.categoriaId) === String(catFilamento?.id);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-display font-extrabold text-grafite-900">Materiais</h1>
        <button className="btn btn-primary" onClick={novo}>+ Novo material</button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input className="input max-w-xs" placeholder="Buscar por nome..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select className="input max-w-xs" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="th">Nome</th><th className="th">Categoria</th><th className="th">Estoque</th>
            <th className="th">Mínimo</th><th className="th">Custo médio</th><th className="th">Situação</th><th className="th">Ações</th>
          </tr></thead>
          <tbody>
            {materiais.map((m) => {
              const s = situacaoBadge(m.situacao);
              return (
                <tr key={m.id} className={!m.ativo ? 'opacity-50' : ''}>
                  <td className="td font-medium">{m.nome}{!m.ativo && <span className="text-xs text-grafite-800/40"> (inativo)</span>}</td>
                  <td className="td">{m.categoria.nome}</td>
                  <td className="td">{numero(m.quantidade)} {m.unidade.sigla}</td>
                  <td className="td">{numero(m.quantidadeMinima)} {m.unidade.sigla}</td>
                  <td className="td">{moeda4(m.custoMedio)}</td>
                  <td className="td"><span className={`badge ${s.cls}`}>{s.texto}</span></td>
                  <td className="td whitespace-nowrap">
                    <button className="btn btn-secondary btn-sm mr-1" onClick={() => editar(m)}>Editar</button>
                    <button className="btn btn-secondary btn-sm mr-1" onClick={() => alternarStatus(m)}>{m.ativo ? 'Inativar' : 'Ativar'}</button>
                    <button className="btn btn-danger btn-sm" onClick={() => excluir(m)}>Excluir</button>
                  </td>
                </tr>
              );
            })}
            {materiais.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={7}>Nenhum material encontrado.</td></tr>}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <Modal titulo={editando.id ? 'Editar material' : 'Novo material'} onClose={() => setModalAberto(false)} largura="max-w-2xl">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Nome *</label>
              <input className="input" value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} />
            </div>
            <div>
              <label className="label">Categoria *</label>
              <select className="input" value={editando.categoriaId} onChange={(e) => setEditando({ ...editando, categoriaId: e.target.value })}>
                <option value="">Selecione</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Unidade de medida *</label>
              <select className="input" value={editando.unidadeId} onChange={(e) => setEditando({ ...editando, unidadeId: e.target.value })}>
                <option value="">Selecione</option>
                {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome} ({u.sigla})</option>)}
              </select>
            </div>
            {!editando.id && (
              <>
                <div>
                  <label className="label">Quantidade inicial</label>
                  <input type="number" className="input" value={editando.quantidade} onChange={(e) => setEditando({ ...editando, quantidade: e.target.value })} />
                </div>
                <div>
                  <label className="label">Custo médio inicial (R$)</label>
                  <input type="number" step="0.0001" className="input" value={editando.custoMedio} onChange={(e) => setEditando({ ...editando, custoMedio: e.target.value })} />
                </div>
              </>
            )}
            <div>
              <label className="label">Quantidade mínima para alerta</label>
              <input type="number" className="input" value={editando.quantidadeMinima} onChange={(e) => setEditando({ ...editando, quantidadeMinima: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Observações</label>
              <textarea className="input" rows={2} value={editando.observacoes || ''} onChange={(e) => setEditando({ ...editando, observacoes: e.target.value })} />
            </div>

            {ehFilamento && (
              <div className="md:col-span-2 border-t pt-3">
                <h3 className="font-display font-bold text-grafite-900 mb-2 text-sm">Dados do filamento</h3>
                <div className="grid md:grid-cols-3 gap-3">
                  <div><label className="label">Tipo</label>
                    <select className="input" value={editando.filamento?.tipo || ''} onChange={(e) => setEditando({ ...editando, filamento: { ...editando.filamento, tipo: e.target.value } })}>
                      <option value="">-</option><option>PLA</option><option>PETG</option><option>ABS</option><option>TPU</option>
                    </select>
                  </div>
                  <div><label className="label">Marca</label><input className="input" value={editando.filamento?.marca || ''} onChange={(e) => setEditando({ ...editando, filamento: { ...editando.filamento, marca: e.target.value } })} /></div>
                  <div><label className="label">Cor</label><input className="input" value={editando.filamento?.cor || ''} onChange={(e) => setEditando({ ...editando, filamento: { ...editando.filamento, cor: e.target.value } })} /></div>
                </div>
                <p className="text-xs text-grafite-800/50 mt-2">
                  💡 O peso do filamento é o próprio <b>estoque</b> (em gramas) — use a unidade <b>Grama (g)</b> acima e informe o peso em <b>{editando.id ? 'entradas/ajustes' : '"Quantidade inicial"'}</b>. Não precisa preencher pesos separados.
                </p>
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
