import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { moeda, numero } from '../format';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import BotaoIcone, { ICONES } from '../components/BotaoIcone';

// Modal para produzir unidades e lançar no estoque de produto pronto.
function ModalProduzirEstoque({ produto, onClose, onFeito }) {
  const [quantidade, setQuantidade] = useState('');
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();

  async function salvar() {
    if (!(Number(quantidade) > 0)) return toast.erro('Informe a quantidade a produzir.');
    setSalvando(true);
    try {
      await api.post(`/produtos/${produto.id}/produzir-estoque`, { quantidade: Number(quantidade) });
      toast.sucesso(`${quantidade} un de ${produto.nome} lançadas no estoque (material descontado).`);
      onFeito();
    } catch (e) { toast.erro(e.message); }
    setSalvando(false);
  }

  return (
    <Modal titulo={`Produzir para estoque · ${produto.nome}`} onClose={onClose}>
      <p className="text-sm text-grafite-800/70 mb-3">
        Estoque atual: <span className="font-medium">{numero(produto.estoque)} un</span>. Ao produzir, o material da
        ficha técnica é descontado e as unidades entram no estoque de produto pronto.
      </p>
      <div>
        <label className="label">Quantidade a produzir *</label>
        <input type="number" min="1" step="1" className="input" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} autoFocus />
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando}>{salvando ? 'Produzindo...' : 'Produzir'}</button>
      </div>
    </Modal>
  );
}

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [produzindo, setProduzindo] = useState(null);
  const toast = useToast();

  async function carregar() {
    const q = busca ? '?busca=' + encodeURIComponent(busca) : '';
    setProdutos(await api.get('/produtos' + q));
  }
  useEffect(() => { carregar(); }, [busca]);

  function novo() { setEditando({ nome: '', sku: '', descricao: '', personalizado: false, producaoEstendida: false }); setModalAberto(true); }
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

  async function excluir(p) {
    if (!window.confirm(`Excluir o produto "${p.nome}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await api.del('/produtos/' + p.id);
      toast.sucesso('Produto excluído.');
      setProdutos((lista) => lista.filter((x) => x.id !== p.id));
    } catch (e) { toast.erro(e.message); }
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
          <thead><tr><th className="th">Nome</th><th className="th">SKU</th><th className="th text-right">Estoque pronto</th><th className="th">Custo de materiais</th><th className="th">Ações</th></tr></thead>
          <tbody>
            {produtos.map((p) => (
              <tr key={p.id} className={!p.ativo ? 'opacity-50' : ''}>
                <td className="td font-medium">
                  {p.nome}{!p.ativo && <span className="text-xs text-grafite-800/40"> (inativo)</span>}
                  {p.personalizado && <span className="badge badge-baixo ml-2">📸 Foto do pedido</span>}
                  {p.producaoEstendida && <span className="badge badge-sem ml-2">⏱️ Produção estendida</span>}
                </td>
                <td className="td">{p.sku}</td>
                <td className="td text-right tabular-nums font-medium">{numero(p.estoque)} un</td>
                <td className="td">{moeda(p.custoAtualMateriais)}</td>
                <td className="td whitespace-nowrap">
                  <div className="flex items-center gap-0.5">
                    <BotaoIcone to={'/produtos/' + p.id} titulo="Ficha técnica / Custo" icone={ICONES.ficha} cor="primary" />
                    <BotaoIcone titulo="Produzir para estoque" icone={ICONES.produzir} onClick={() => setProduzindo(p)} />
                    <BotaoIcone titulo="Editar" icone={ICONES.editar} onClick={() => editar(p)} />
                    <BotaoIcone titulo="Duplicar" icone={ICONES.duplicar} onClick={() => duplicar(p)} />
                    <BotaoIcone titulo={p.ativo ? 'Inativar' : 'Ativar'} icone={ICONES.toggle} onClick={() => alternarStatus(p)} />
                    <BotaoIcone titulo="Excluir" icone={ICONES.excluir} cor="danger" onClick={() => excluir(p)} />
                  </div>
                </td>
              </tr>
            ))}
            {produtos.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={5}>Nenhum produto.</td></tr>}
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
              Foto do pedido (recebe foto do cliente para impressão)
            </label>
            <label className="flex items-center gap-2 text-sm text-grafite-800/70">
              <input type="checkbox" checked={!!editando.producaoEstendida} onChange={(e) => setEditando({ ...editando, producaoEstendida: e.target.checked })} />
              Produção estendida (leva mais tempo — o “personalizado” da Shopee, com prazo de envio maior)
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn btn-secondary" onClick={() => setModalAberto(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvar}>Salvar</button>
          </div>
        </Modal>
      )}

      {produzindo && (
        <ModalProduzirEstoque
          produto={produzindo}
          onClose={() => setProduzindo(null)}
          onFeito={() => { setProduzindo(null); carregar(); }}
        />
      )}
    </div>
  );
}
