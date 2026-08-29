import { useEffect, useState } from 'react';
import { api } from '../api';
import { moeda, numero, dataHora } from '../format';
import { useToast } from '../components/Toast';

const vazio = { tipo: 'TESTE', produtoCadastrado: false, produtoId: '', nomeProdutoTeste: '', materialId: '', quantidade: '', motivo: '' };

export default function Perdas() {
  const [materiais, setMateriais] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [perdas, setPerdas] = useState([]);
  const [form, setForm] = useState(vazio);
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();

  function carregar() { api.get('/perdas').then(setPerdas).catch(() => {}); }
  useEffect(() => {
    api.get('/materiais?ativo=true').then(setMateriais).catch(() => {});
    api.get('/produtos?ativo=true').then(setProdutos).catch(() => {});
    carregar();
  }, []);

  const material = materiais.find((m) => String(m.id) === String(form.materialId));

  async function registrar() {
    if (!form.materialId) return toast.erro('Selecione o material.');
    if (!(Number(form.quantidade) > 0)) return toast.erro('Informe a quantidade.');
    if (form.produtoCadastrado && !form.produtoId) return toast.erro('Selecione o produto cadastrado.');
    if (!form.produtoCadastrado && !form.nomeProdutoTeste.trim()) return toast.erro('Informe o nome do produto testado.');
    try {
      setSalvando(true);
      await api.post('/perdas', {
        tipo: form.tipo,
        produtoId: form.produtoCadastrado ? form.produtoId : null,
        nomeProdutoTeste: form.produtoCadastrado ? null : form.nomeProdutoTeste,
        materialId: Number(form.materialId),
        quantidade: Number(form.quantidade),
        motivo: form.motivo || undefined,
      });
      toast.sucesso('Perda registrada e material descontado do estoque.');
      setForm(vazio);
      carregar();
    } catch (e) { toast.erro(e.message); }
    finally { setSalvando(false); }
  }

  async function excluir(pl) {
    if (!window.confirm(`Excluir esta perda? O material (${numero(pl.quantidade)} ${pl.material?.unidade?.sigla || ''}) volta ao estoque.`)) return;
    try {
      await api.del('/perdas/' + pl.id);
      toast.sucesso('Perda excluída e material estornado.');
      setPerdas((l) => l.filter((x) => x.id !== pl.id));
    } catch (e) { toast.erro(e.message); }
  }

  const totalTeste = perdas.filter((p) => p.tipo === 'TESTE').reduce((s, p) => s + p.custoTotal, 0);
  const totalErro = perdas.filter((p) => p.tipo === 'ERRO_PRODUCAO').reduce((s, p) => s + p.custoTotal, 0);

  return (
    <div>
      <h1 className="text-3xl font-display font-extrabold text-grafite-900 mb-1">Perdas e testes</h1>
      <p className="text-grafite-800/60 mb-6 text-sm max-w-2xl">
        Lance o material gasto em <b>testes de produto</b> ou em <b>erros de produção</b>. A quantidade é
        descontada do estoque e o custo entra no card de perdas do Dashboard.
      </p>

      <div className="card max-w-xl mb-8">
        {/* Tipo */}
        <label className="label">Tipo da perda</label>
        <div className="flex gap-2 mb-4">
          {[{ v: 'TESTE', l: '🧪 Teste de produto' }, { v: 'ERRO_PRODUCAO', l: '⚠️ Erro de produção' }].map((t) => (
            <button key={t.v} onClick={() => setForm({ ...form, tipo: t.v })}
              className={`btn btn-sm ${form.tipo === t.v ? 'btn-primary' : 'btn-secondary'}`}>{t.l}</button>
          ))}
        </div>

        {/* Produto: cadastrado ou nome livre */}
        <label className="flex items-center gap-2 text-sm text-grafite-800/80 mb-2 cursor-pointer">
          <input type="checkbox" checked={form.produtoCadastrado} onChange={(e) => setForm({ ...form, produtoCadastrado: e.target.checked })} />
          Produto já cadastrado (selecionar SKU)
        </label>
        {form.produtoCadastrado ? (
          <select className="input mb-4" value={form.produtoId} onChange={(e) => setForm({ ...form, produtoId: e.target.value })}>
            <option value="">Selecione o produto</option>
            {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} ({p.sku})</option>)}
          </select>
        ) : (
          <input className="input mb-4" value={form.nomeProdutoTeste} onChange={(e) => setForm({ ...form, nomeProdutoTeste: e.target.value })} placeholder="Nome do produto testado (ex.: Chaveiro coração v2)" />
        )}

        {/* Material + quantidade */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Material usado *</label>
            <select className="input" value={form.materialId} onChange={(e) => setForm({ ...form, materialId: e.target.value })}>
              <option value="">Selecione</option>
              {materiais.map((m) => <option key={m.id} value={m.id}>{m.nome} ({m.unidade.sigla})</option>)}
            </select>
            {material && <p className="text-xs text-grafite-800/50 mt-1">Estoque: {numero(material.quantidade)} {material.unidade.sigla}</p>}
          </div>
          <div>
            <label className="label">Quantidade gasta *</label>
            <div className="relative">
              <input type="number" step="0.0001" className="input pr-10" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} placeholder="0" />
              {material && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-grafite-800/40">{material.unidade.sigla}</span>}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Motivo (opcional)</label>
          <input className="input" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Ex.: falha de impressão, ajuste de cor..." />
        </div>

        <div className="flex justify-end mt-4">
          <button className="btn btn-primary" disabled={salvando} onClick={registrar}>
            {salvando ? 'Registrando...' : 'Registrar perda'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 className="text-lg font-display font-bold text-grafite-900">Histórico de perdas</h2>
        <div className="text-sm text-grafite-800/70">
          Total teste: <b className="text-red-600">{moeda(totalTeste)}</b> · Total erro: <b className="text-red-600">{moeda(totalErro)}</b>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="th">Data</th>
            <th className="th">Tipo</th>
            <th className="th">Produto</th>
            <th className="th">Material</th>
            <th className="th text-right">Qtd</th>
            <th className="th text-right">Custo</th>
            <th className="th">Motivo</th>
            <th className="th">Ações</th>
          </tr></thead>
          <tbody>
            {perdas.map((pl) => (
              <tr key={pl.id}>
                <td className="td whitespace-nowrap">{dataHora(pl.criadoEm)}</td>
                <td className="td">
                  {pl.tipo === 'TESTE'
                    ? <span className="badge badge-baixo">🧪 Teste</span>
                    : <span className="badge badge-sem">⚠️ Erro</span>}
                </td>
                <td className="td">{pl.produto ? pl.produto.nome : (pl.nomeProdutoTeste || <span className="text-grafite-800/40">—</span>)}</td>
                <td className="td">{pl.material?.nome}</td>
                <td className="td text-right">{numero(pl.quantidade)} {pl.material?.unidade?.sigla}</td>
                <td className="td text-right text-red-600 font-medium">{moeda(pl.custoTotal)}</td>
                <td className="td">{pl.motivo || <span className="text-grafite-800/40">—</span>}</td>
                <td className="td"><button onClick={() => excluir(pl)} className="btn btn-danger btn-sm">Excluir</button></td>
              </tr>
            ))}
            {perdas.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={8}>Nenhuma perda registrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
