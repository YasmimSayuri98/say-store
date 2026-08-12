import { useEffect, useState } from 'react';
import { api } from '../api';
import { moeda, moeda4, numero, data } from '../format';
import { useToast } from '../components/Toast';

export default function Entradas() {
  const [materiais, setMateriais] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [form, setForm] = useState({ materialId: '', quantidade: '', valorTotal: '', dataCompra: '', fornecedorId: '', observacao: '' });
  const toast = useToast();

  async function carregar() {
    setMateriais(await api.get('/materiais?ativo=true'));
    setFornecedores(await api.get('/fornecedores'));
    setEntradas(await api.get('/entradas'));
  }
  useEffect(() => { carregar(); }, []);

  const custoUnitario = form.quantidade && form.valorTotal && Number(form.quantidade) > 0
    ? Number(form.valorTotal) / Number(form.quantidade) : 0;

  async function salvar() {
    try {
      if (!form.materialId) return toast.erro('Selecione um material.');
      if (!(Number(form.quantidade) > 0)) return toast.erro('Quantidade deve ser maior que zero.');
      await api.post('/entradas', {
        materialId: Number(form.materialId), quantidade: Number(form.quantidade), valorTotal: Number(form.valorTotal),
        dataCompra: form.dataCompra || undefined, fornecedorId: form.fornecedorId ? Number(form.fornecedorId) : undefined,
        observacao: form.observacao || undefined,
      });
      toast.sucesso('Entrada registrada. Custo médio e produtos recalculados.');
      setForm({ materialId: '', quantidade: '', valorTotal: '', dataCompra: '', fornecedorId: '', observacao: '' });
      carregar();
    } catch (e) { toast.erro(e.message); }
  }

  return (
    <div>
      <h1 className="text-3xl font-display font-extrabold text-grafite-900 mb-6">Entrada e reposição de estoque</h1>

      <div className="card mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="label">Material *</label>
            <select className="input" value={form.materialId} onChange={(e) => setForm({ ...form, materialId: e.target.value })}>
              <option value="">Selecione</option>
              {materiais.map((m) => <option key={m.id} value={m.id}>{m.nome} ({m.unidade.sigla})</option>)}
            </select>
          </div>
          <div><label className="label">Quantidade adquirida *</label><input type="number" step="0.0001" className="input" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} /></div>
          <div><label className="label">Valor total pago (R$) *</label><input type="number" step="0.01" className="input" value={form.valorTotal} onChange={(e) => setForm({ ...form, valorTotal: e.target.value })} /></div>
          <div><label className="label">Custo unitário (automático)</label><input className="input bg-base-100" readOnly value={custoUnitario ? moeda4(custoUnitario) : '—'} /></div>
          <div><label className="label">Data da compra</label><input type="date" className="input" value={form.dataCompra} onChange={(e) => setForm({ ...form, dataCompra: e.target.value })} /></div>
          <div>
            <label className="label">Fornecedor (opcional)</label>
            <select className="input" value={form.fornecedorId} onChange={(e) => setForm({ ...form, fornecedorId: e.target.value })}>
              <option value="">—</option>
              {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div className="md:col-span-3"><label className="label">Observação</label><input className="input" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></div>
        </div>
        <div className="flex justify-end mt-4"><button className="btn btn-primary" onClick={salvar}>Confirmar entrada</button></div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-display font-bold text-grafite-900 mb-3">Histórico de compras</h2>
        <table className="w-full">
          <thead><tr>
            <th className="th">Data</th><th className="th">Material</th><th className="th">Qtd</th><th className="th">Valor total</th>
            <th className="th">Custo unit.</th><th className="th">Custo médio após</th><th className="th">Fornecedor</th>
          </tr></thead>
          <tbody>
            {entradas.map((e) => (
              <tr key={e.id}>
                <td className="td">{data(e.dataCompra)}</td>
                <td className="td">{e.material.nome}</td>
                <td className="td">{numero(e.quantidade)} {e.material.unidade.sigla}</td>
                <td className="td">{moeda(e.valorTotal)}</td>
                <td className="td">{moeda4(e.custoUnitario)}</td>
                <td className="td">{moeda4(e.custoMedioApos)}</td>
                <td className="td">{e.fornecedor?.nome || '—'}</td>
              </tr>
            ))}
            {entradas.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={7}>Nenhuma compra registrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
