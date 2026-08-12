import { useEffect, useState } from 'react';
import { api } from '../api';
import { numero } from '../format';
import { useToast } from '../components/Toast';

const MOTIVOS = ['Material danificado', 'Perda', 'Uso em testes', 'Erro de contagem', 'Diferença no estoque físico', 'Correção de lançamento', 'Outro'];

export default function Ajustes() {
  const [materiais, setMateriais] = useState([]);
  const [f, setF] = useState({ materialId: '', tipo: 'ADICIONAR', quantidade: '', motivo: '', observacao: '' });
  const toast = useToast();

  async function carregar() { setMateriais(await api.get('/materiais?ativo=true')); }
  useEffect(() => { carregar(); }, []);

  const material = materiais.find((m) => String(m.id) === String(f.materialId));

  async function salvar() {
    try {
      if (!f.materialId) return toast.erro('Selecione um material.');
      if (!f.motivo) return toast.erro('Informe a justificativa.');
      await api.post('/ajustes', { ...f, materialId: Number(f.materialId), quantidade: Number(f.quantidade) });
      toast.sucesso('Ajuste registrado.');
      setF({ materialId: '', tipo: 'ADICIONAR', quantidade: '', motivo: '', observacao: '' });
      carregar();
    } catch (e) { toast.erro(e.message); }
  }

  return (
    <div>
      <h1 className="text-3xl font-display font-extrabold text-grafite-900 mb-6">Ajuste manual de estoque</h1>
      <div className="card max-w-2xl">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Material *</label>
            <select className="input" value={f.materialId} onChange={(e) => setF({ ...f, materialId: e.target.value })}>
              <option value="">Selecione</option>
              {materiais.map((m) => <option key={m.id} value={m.id}>{m.nome} — atual: {numero(m.quantidade)} {m.unidade.sigla}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tipo de ajuste *</label>
            <select className="input" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
              <option value="ADICIONAR">Adicionar quantidade</option>
              <option value="REMOVER">Remover quantidade</option>
              <option value="DEFINIR">Definir quantidade correta (contagem física)</option>
            </select>
          </div>
          <div>
            <label className="label">Quantidade * {material ? `(${material.unidade.sigla})` : ''}</label>
            <input type="number" step="0.0001" className="input" value={f.quantidade} onChange={(e) => setF({ ...f, quantidade: e.target.value })} />
          </div>
          <div>
            <label className="label">Motivo *</label>
            <select className="input" value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })}>
              <option value="">Selecione</option>
              {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div><label className="label">Observação</label><input className="input" value={f.observacao} onChange={(e) => setF({ ...f, observacao: e.target.value })} /></div>
        </div>
        <div className="flex justify-end mt-4"><button className="btn btn-primary" onClick={salvar}>Registrar ajuste</button></div>
      </div>
    </div>
  );
}
