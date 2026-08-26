import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { moeda, moeda4, numero, dataHora } from '../format';
import { useToast } from '../components/Toast';

export default function ProdutoDetalhe() {
  const { id } = useParams();
  const [produto, setProduto] = useState(null);
  const [materiais, setMateriais] = useState([]);
  const [itens, setItens] = useState([]);
  const toast = useToast();

  async function carregar() {
    const p = await api.get('/produtos/' + id);
    setProduto(p);
    setItens(p.ficha.map((f) => ({ materialId: f.materialId, quantidade: f.quantidade, parte: f.parte || 'GERAL' })));
  }
  useEffect(() => {
    carregar();
    api.get('/materiais?ativo=true').then(setMateriais);
  }, [id]);

  const isAlbum = !!produto && (produto.sku || '').toUpperCase().startsWith('LIV-FOT-PERS');

  function addItem() { setItens([...itens, { materialId: '', quantidade: '', parte: isAlbum ? 'CAPA' : 'GERAL' }]); }
  function removeItem(i) { setItens(itens.filter((_, idx) => idx !== i)); }
  function setItem(i, campo, valor) { setItens(itens.map((it, idx) => idx === i ? { ...it, [campo]: valor } : it)); }

  async function salvarFicha() {
    try {
      const validos = itens.filter((it) => it.materialId && Number(it.quantidade) > 0)
        .map((it) => ({ materialId: Number(it.materialId), quantidade: Number(it.quantidade), parte: it.parte || 'GERAL' }));
      await api.put('/produtos/' + id + '/ficha', { itens: validos });
      toast.sucesso('Ficha técnica salva e custo recalculado.');
      carregar();
    } catch (e) { toast.erro(e.message); }
  }

  if (!produto) return <p>Carregando...</p>;

  return (
    <div>
      <Link to="/produtos" className="text-marca-600 text-sm">← Voltar</Link>
      <h1 className="text-3xl font-display font-extrabold text-grafite-900 mb-1 mt-2">{produto.nome}</h1>
      <p className="text-grafite-800/60 mb-4">SKU: {produto.sku}</p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-display font-bold text-grafite-900 mb-3">Ficha técnica (editar)</h2>
          {isAlbum && (
            <div className="mb-3 text-xs bg-marca-50 border border-marca-100 rounded-lg px-3 py-2 text-grafite-800/70">
              <b>Álbum:</b> marque cada material como <b>Capa</b> (cor do SKU, descontada ao marcar "Capa" na produção) ou <b>Páginas</b> (os gramas definem o quanto; na produção você escolhe o filamento branco/marmorizado usado). Tudo entra no custo.
            </div>
          )}
          <div className="space-y-2">
            {itens.length > 0 && (
              <div className="flex gap-2 px-0.5">
                <span className="flex-1 text-[11px] font-semibold text-grafite-800/50 uppercase tracking-wide">Material</span>
                {isAlbum && <span className="w-24 text-[11px] font-semibold text-grafite-800/50 uppercase tracking-wide">Parte</span>}
                <span className="w-28 text-[11px] font-semibold text-grafite-800/50 uppercase tracking-wide">Quantidade</span>
                <span className="w-8" />
              </div>
            )}
            {itens.map((it, i) => {
              const materialSelecionado = materiais.find((m) => String(m.id) === String(it.materialId));
              return (
                <div key={i} className="flex gap-2 items-center">
                  <select className="input flex-1" value={it.materialId} onChange={(e) => setItem(i, 'materialId', e.target.value)}>
                    <option value="">Selecione o material</option>
                    {materiais.map((m) => <option key={m.id} value={m.id}>{m.nome} ({m.unidade.sigla})</option>)}
                  </select>
                  {isAlbum && (
                    <select className="input w-24 shrink-0" value={it.parte || 'GERAL'} onChange={(e) => setItem(i, 'parte', e.target.value)}>
                      <option value="CAPA">Capa</option>
                      <option value="PAGINA">Páginas</option>
                      <option value="GERAL">Geral</option>
                    </select>
                  )}
                  <div className="relative w-28 shrink-0">
                    <input type="number" step="0.0001" className="input pr-9" placeholder="Qtd" value={it.quantidade} onChange={(e) => setItem(i, 'quantidade', e.target.value)} />
                    {materialSelecionado && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-grafite-800/40 pointer-events-none">{materialSelecionado.unidade.sigla}</span>
                    )}
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => removeItem(i)}>×</button>
                </div>
              );
            })}
            {itens.length === 0 && <p className="text-sm text-grafite-800/40 py-2">Nenhum material na ficha ainda.</p>}
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-secondary btn-sm" onClick={addItem}>+ Adicionar material</button>
            <button className="btn btn-primary btn-sm" onClick={salvarFicha}>Salvar ficha</button>
          </div>
        </div>

        <div className="card">
          <h2 className="font-display font-bold text-grafite-900 mb-3">Custo do produto</h2>
          <table className="w-full">
            <thead><tr>
              <th className="th">Material</th><th className="th">Qtd</th><th className="th">Custo unit.</th><th className="th">Custo no produto</th>
            </tr></thead>
            <tbody>
              {produto.ficha.map((f) => (
                <tr key={f.id}>
                  <td className="td">{f.materialNome}</td>
                  <td className="td">{numero(f.quantidade)} {f.unidadeSigla}</td>
                  <td className="td">{moeda4(f.custoUnitario)}</td>
                  <td className="td">{moeda(f.custoNoProduto)}</td>
                </tr>
              ))}
              {produto.ficha.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={4}>Ficha vazia.</td></tr>}
            </tbody>
          </table>
          <div className="border-t mt-3 pt-3 flex justify-between items-center">
            <span className="font-semibold">Custo total dos materiais</span>
            <span className="text-xl font-bold text-marca-600">{moeda(produto.custoAtualMateriais)}</span>
          </div>
          <p className="text-xs text-grafite-800/40 mt-1">Último cálculo: {dataHora(produto.ultimoCalculoCusto)}</p>
        </div>
      </div>
    </div>
  );
}
