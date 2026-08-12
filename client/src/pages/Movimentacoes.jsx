import { useEffect, useState } from 'react';
import { api } from '../api';
import { numero, dataHora } from '../format';

const TIPOS = ['ENTRADA_COMPRA', 'SAIDA_ENVIO', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'CORRECAO', 'ESTORNO'];
const ROTULO = {
  ENTRADA_COMPRA: 'Entrada por compra', SAIDA_ENVIO: 'Saída por envio',
  AJUSTE_POSITIVO: 'Ajuste positivo', AJUSTE_NEGATIVO: 'Ajuste negativo',
  CORRECAO: 'Correção', ESTORNO: 'Estorno',
};

export default function Movimentacoes() {
  const [movs, setMovs] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [f, setF] = useState({ materialId: '', tipo: '', dataInicial: '', dataFinal: '' });

  async function carregar() {
    const q = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v) q.set(k, v); });
    setMovs(await api.get('/movimentacoes?' + q.toString()));
  }
  useEffect(() => { carregar(); }, [f]);
  useEffect(() => { api.get('/materiais').then(setMateriais); }, []);

  return (
    <div>
      <h1 className="text-3xl font-display font-extrabold text-grafite-900 mb-6">Histórico de movimentações</h1>
      <div className="flex flex-wrap gap-3 mb-4">
        <select className="input max-w-xs" value={f.materialId} onChange={(e) => setF({ ...f, materialId: e.target.value })}>
          <option value="">Todos os materiais</option>
          {materiais.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
        <select className="input max-w-xs" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => <option key={t} value={t}>{ROTULO[t]}</option>)}
        </select>
        <input type="date" className="input max-w-[10rem]" value={f.dataInicial} onChange={(e) => setF({ ...f, dataInicial: e.target.value })} />
        <input type="date" className="input max-w-[10rem]" value={f.dataFinal} onChange={(e) => setF({ ...f, dataFinal: e.target.value })} />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="th">Data</th><th className="th">Material</th><th className="th">Tipo</th>
            <th className="th">Anterior</th><th className="th">Movimentada</th><th className="th">Resultante</th><th className="th">Motivo</th>
          </tr></thead>
          <tbody>
            {movs.map((m) => (
              <tr key={m.id}>
                <td className="td text-xs">{dataHora(m.criadoEm)}</td>
                <td className="td">{m.material.nome}</td>
                <td className="td text-xs">{ROTULO[m.tipo] || m.tipo}</td>
                <td className="td">{numero(m.quantidadeAnterior)}</td>
                <td className="td">{numero(m.quantidadeMovimentada)}</td>
                <td className="td">{numero(m.quantidadeResultante)}</td>
                <td className="td text-xs text-grafite-800/60">{m.motivo || '—'}</td>
              </tr>
            ))}
            {movs.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={7}>Nenhuma movimentação.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
