import { useEffect, useState } from 'react';
import { api } from '../api';
import { moeda, numero } from '../format';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

const vazio = { nome: '', itens: [{ materialId: '', quantidade: '' }] };

export default function Embalagens() {
  const [embalagens, setEmbalagens] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [editando, setEditando] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const toast = useToast();

  async function carregar() { setEmbalagens(await api.get('/embalagens')); }
  useEffect(() => {
    carregar();
    api.get('/materiais?ativo=true').then(setMateriais).catch(() => {});
  }, []);

  function novo() { setEditando({ ...vazio, itens: [{ materialId: '', quantidade: '' }] }); setModalAberto(true); }
  function editar(e) {
    setEditando({
      id: e.id,
      nome: e.nome,
      itens: e.itens.length ? e.itens.map((it) => ({ materialId: String(it.materialId), quantidade: String(it.quantidade) })) : [{ materialId: '', quantidade: '' }],
    });
    setModalAberto(true);
  }

  function addItem() { setEditando({ ...editando, itens: [...editando.itens, { materialId: '', quantidade: '' }] }); }
  function removeItem(i) { setEditando({ ...editando, itens: editando.itens.filter((_, idx) => idx !== i) }); }
  function setItem(i, campo, valor) { setEditando({ ...editando, itens: editando.itens.map((it, idx) => idx === i ? { ...it, [campo]: valor } : it) }); }

  async function salvar() {
    try {
      if (!editando.nome.trim()) return toast.erro('Informe o nome da embalagem.');
      const itens = editando.itens.filter((it) => it.materialId && Number(it.quantidade) > 0)
        .map((it) => ({ materialId: Number(it.materialId), quantidade: Number(it.quantidade) }));
      if (itens.length === 0) return toast.erro('Adicione ao menos um material.');
      const corpo = { nome: editando.nome.trim(), itens };
      if (editando.id) await api.put('/embalagens/' + editando.id, corpo);
      else await api.post('/embalagens', corpo);
      toast.sucesso('Embalagem salva.');
      setModalAberto(false); carregar();
    } catch (e) { toast.erro(e.message); }
  }

  async function alternarStatus(e) {
    try { await api.patch('/embalagens/' + e.id + '/status', { ativo: !e.ativo }); carregar(); }
    catch (err) { toast.erro(err.message); }
  }

  async function excluir(e) {
    if (!window.confirm(`Excluir a embalagem "${e.nome}"?`)) return;
    try {
      await api.del('/embalagens/' + e.id);
      toast.sucesso('Embalagem excluída.');
      setEmbalagens((lista) => lista.filter((x) => x.id !== e.id));
    } catch (err) { toast.erro(err.message); }
  }

  const materialSigla = (id) => {
    const m = materiais.find((x) => String(x.id) === String(id));
    return m ? m.unidade.sigla : '';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-3xl font-display font-extrabold text-grafite-900">Embalagens</h1>
        <button className="btn btn-primary" onClick={novo}>+ Nova embalagem</button>
      </div>
      <p className="text-grafite-800/60 mb-6 text-sm max-w-2xl">
        Cadastre os tipos de embalagem (ex.: Caixa Pequena, Caixa Grande, Envelope) agrupando os
        materiais que cada uma consome — caixa, fita, plástico bolha, etiqueta... Na hora do envio
        você escolhe qual usou, e o sistema baixa esses materiais do estoque. Não afeta o preço dos
        produtos: é só controle de estoque e custo de envio.
      </p>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="th">Embalagem</th>
            <th className="th">Materiais</th>
            <th className="th text-right">Custo estimado</th>
            <th className="th">Ações</th>
          </tr></thead>
          <tbody>
            {embalagens.map((e) => (
              <tr key={e.id} className={!e.ativo ? 'opacity-50' : ''}>
                <td className="td font-medium">{e.nome}{!e.ativo && <span className="text-xs text-grafite-800/40"> (inativa)</span>}</td>
                <td className="td text-sm text-grafite-800/70">
                  {e.itens.map((i) => `${numero(i.quantidade)} ${i.unidadeSigla} ${i.materialNome}`).join(' · ')}
                </td>
                <td className="td text-right font-medium">{moeda(e.custoEstimado)}</td>
                <td className="td whitespace-nowrap">
                  <button className="btn btn-secondary btn-sm mr-1" onClick={() => editar(e)}>Editar</button>
                  <button className="btn btn-secondary btn-sm mr-1" onClick={() => alternarStatus(e)}>{e.ativo ? 'Inativar' : 'Ativar'}</button>
                  <button className="btn btn-danger btn-sm" onClick={() => excluir(e)}>Excluir</button>
                </td>
              </tr>
            ))}
            {embalagens.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={4}>Nenhuma embalagem cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <Modal titulo={editando.id ? 'Editar embalagem' : 'Nova embalagem'} onClose={() => setModalAberto(false)} largura="max-w-xl">
          <div className="space-y-3">
            <div>
              <label className="label">Nome *</label>
              <input className="input" value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} placeholder="Ex.: Caixa Pequena, Caixa Grande, Envelope" />
            </div>
            <div>
              <label className="label">Materiais da embalagem</label>
              <div className="space-y-2">
                {editando.itens.map((it, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select className="input flex-1" value={it.materialId} onChange={(e) => setItem(i, 'materialId', e.target.value)}>
                      <option value="">Selecione o material</option>
                      {materiais.map((m) => <option key={m.id} value={m.id}>{m.nome} ({m.unidade.sigla})</option>)}
                    </select>
                    <input type="number" step="0.0001" className="input w-28" placeholder="Qtd" value={it.quantidade} onChange={(e) => setItem(i, 'quantidade', e.target.value)} />
                    <span className="text-xs text-grafite-800/50 w-8">{materialSigla(it.materialId)}</span>
                    <button className="btn btn-danger btn-sm" onClick={() => removeItem(i)}>×</button>
                  </div>
                ))}
              </div>
              <button className="btn btn-secondary btn-sm mt-2" onClick={addItem}>+ Adicionar material</button>
              <p className="text-xs text-grafite-800/50 mt-2">Cadastre a caixa, a fita, o plástico bolha etc. em “Materiais” antes, com a unidade certa (ex.: fita em metros).</p>
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
