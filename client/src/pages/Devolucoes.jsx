import { useEffect, useState } from 'react';
import { api } from '../api';
import { numero, dataHora } from '../format';
import { useToast } from '../components/Toast';

const vazio = { produtoId: '', quantidade: '1', aptoEstoque: true, numeroPedido: '', motivo: '' };

export default function Devolucoes() {
  const [produtos, setProdutos] = useState([]);
  const [devolucoes, setDevolucoes] = useState([]);
  const [form, setForm] = useState(vazio);
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();

  function carregar() { api.get('/devolucoes').then(setDevolucoes).catch(() => {}); }
  useEffect(() => {
    api.get('/produtos?ativo=true').then(setProdutos).catch(() => {});
    carregar();
  }, []);

  const produto = produtos.find((p) => String(p.id) === String(form.produtoId));

  async function registrar() {
    if (!(Number(form.quantidade) > 0)) return toast.erro('Informe a quantidade.');
    if (form.aptoEstoque && !form.produtoId) return toast.erro('Selecione o produto para devolver ao estoque.');
    try {
      setSalvando(true);
      await api.post('/devolucoes', {
        produtoId: form.produtoId || null,
        quantidade: Number(form.quantidade),
        aptoEstoque: form.aptoEstoque,
        numeroPedido: form.numeroPedido || undefined,
        motivo: form.motivo || undefined,
      });
      toast.sucesso(form.aptoEstoque ? 'Devolução registrada e estoque atualizado.' : 'Devolução registrada.');
      setForm(vazio);
      carregar();
    } catch (e) { toast.erro(e.message); }
    finally { setSalvando(false); }
  }

  async function excluir(d) {
    const aviso = d.retornouEstoque
      ? `Excluir esta devolução? A quantidade (${numero(d.quantidade)}) será removida do estoque do produto.`
      : 'Excluir esta devolução?';
    if (!window.confirm(aviso)) return;
    try {
      await api.del('/devolucoes/' + d.id);
      toast.sucesso('Devolução excluída.');
      setDevolucoes((l) => l.filter((x) => x.id !== d.id));
    } catch (e) { toast.erro(e.message); }
  }

  return (
    <div>
      <h1 className="text-3xl font-display font-extrabold text-grafite-900 mb-1">Devoluções</h1>
      <p className="text-grafite-800/60 mb-6 text-sm max-w-2xl">
        Registre um produto que voltou. Se estiver <b>apto a voltar ao estoque</b>, a quantidade é
        somada ao estoque de produto pronto automaticamente.
      </p>

      <div className="card max-w-xl mb-8">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Produto</label>
            <select className="input" value={form.produtoId} onChange={(e) => setForm({ ...form, produtoId: e.target.value })}>
              <option value="">Selecione</option>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} ({p.sku})</option>)}
            </select>
            {produto && <p className="text-xs text-grafite-800/50 mt-1">Estoque atual: {numero(produto.estoque)} un</p>}
          </div>
          <div>
            <label className="label">Quantidade *</label>
            <input type="number" step="1" min="1" className="input" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-grafite-800/80 mt-4 cursor-pointer">
          <input type="checkbox" checked={form.aptoEstoque} onChange={(e) => setForm({ ...form, aptoEstoque: e.target.checked })} />
          Produto apto a voltar ao estoque (soma ao estoque de produto pronto)
        </label>
        {!form.aptoEstoque && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 mt-2 inline-block">
            Não apto: apenas registra a devolução, sem alterar o estoque.
          </p>
        )}

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="label">Nº do pedido (opcional)</label>
            <input className="input" value={form.numeroPedido} onChange={(e) => setForm({ ...form, numeroPedido: e.target.value })} placeholder="Ex.: 2608..." />
          </div>
          <div>
            <label className="label">Motivo (opcional)</label>
            <input className="input" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Ex.: arrependimento, defeito..." />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button className="btn btn-primary" disabled={salvando} onClick={registrar}>
            {salvando ? 'Registrando...' : 'Registrar devolução'}
          </button>
        </div>
      </div>

      <h2 className="text-lg font-display font-bold text-grafite-900 mb-2">Histórico de devoluções</h2>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="th">Data</th>
            <th className="th">Produto</th>
            <th className="th text-right">Qtd</th>
            <th className="th">Voltou ao estoque?</th>
            <th className="th">Nº pedido</th>
            <th className="th">Motivo</th>
            <th className="th">Ações</th>
          </tr></thead>
          <tbody>
            {devolucoes.map((d) => (
              <tr key={d.id}>
                <td className="td whitespace-nowrap">{dataHora(d.criadoEm)}</td>
                <td className="td">{d.produto ? d.produto.nome : <span className="text-grafite-800/40">—</span>}</td>
                <td className="td text-right">{numero(d.quantidade)}</td>
                <td className="td">
                  {d.retornouEstoque
                    ? <span className="badge badge-normal">✓ Sim (+{numero(d.quantidade)})</span>
                    : <span className="badge badge-sem">Não</span>}
                </td>
                <td className="td">{d.numeroPedido || <span className="text-grafite-800/40">—</span>}</td>
                <td className="td">{d.motivo || <span className="text-grafite-800/40">—</span>}</td>
                <td className="td">
                  <button onClick={() => excluir(d)} className="btn btn-danger btn-sm">Excluir</button>
                </td>
              </tr>
            ))}
            {devolucoes.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={7}>Nenhuma devolução registrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
