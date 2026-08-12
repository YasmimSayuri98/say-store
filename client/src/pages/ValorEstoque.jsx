import { useEffect, useState } from 'react';
import { api } from '../api';
import { moeda, moeda4, numero, situacaoBadge } from '../format';

export default function ValorEstoque() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/dashboard/valor').then(setD); }, []);
  if (!d) return <p>Carregando...</p>;
  return (
    <div>
      <h1 className="text-3xl font-display font-extrabold text-grafite-900 mb-6">Valor financeiro do estoque</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card"><div className="text-xs font-medium text-grafite-800/60 uppercase tracking-wide">Valor total</div><div className="text-2xl font-display font-bold text-marca-600">{moeda(d.valorTotal)}</div></div>
        <div className="card"><div className="text-xs font-medium text-grafite-800/60 uppercase tracking-wide">Estoque normal</div><div className="text-2xl font-display font-bold text-emerald-600">{d.normal}</div></div>
        <div className="card"><div className="text-xs font-medium text-grafite-800/60 uppercase tracking-wide">Estoque baixo</div><div className="text-2xl font-display font-bold text-marca-600">{d.baixo}</div></div>
        <div className="card"><div className="text-xs font-medium text-grafite-800/60 uppercase tracking-wide">Sem estoque</div><div className="text-2xl font-display font-bold text-red-600">{d.semEstoque}</div></div>
      </div>

      <div className="card mb-6">
        <h2 className="font-display font-bold text-grafite-900 mb-3">Valor por categoria</h2>
        <table className="w-full">
          <tbody>
            {Object.entries(d.porCategoria).map(([cat, val]) => (
              <tr key={cat}><td className="td">{cat}</td><td className="td text-right font-medium">{moeda(val)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-display font-bold text-grafite-900 mb-3">Detalhamento por material</h2>
        <table className="w-full">
          <thead><tr>
            <th className="th">Material</th><th className="th">Qtd</th><th className="th">Custo médio</th><th className="th">Valor em estoque</th><th className="th">Situação</th>
          </tr></thead>
          <tbody>
            {d.detalhes.map((m) => {
              const s = situacaoBadge(m.situacao);
              return (
                <tr key={m.id}>
                  <td className="td">{m.nome}</td>
                  <td className="td">{numero(m.quantidade)} {m.unidade}</td>
                  <td className="td">{moeda4(m.custoMedio)}</td>
                  <td className="td font-medium">{moeda(m.valor)}</td>
                  <td className="td"><span className={`badge ${s.cls}`}>{s.texto}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
