import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { moeda4, numero, situacaoBadge } from '../format';

export default function ListaCompras() {
  const [lista, setLista] = useState([]);
  const [ordem, setOrdem] = useState('situacao');
  useEffect(() => { api.get('/lista-compras').then(setLista); }, []);

  const ordenada = [...lista].sort((a, b) => {
    if (ordem === 'nome') return a.nome.localeCompare(b.nome);
    if (ordem === 'situacao') { const p = { SEM_ESTOQUE: 0, BAIXO: 1 }; return p[a.situacao] - p[b.situacao]; }
    return 0;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-display font-extrabold text-grafite-900">Lista de compras</h1>
        <select className="input max-w-xs" value={ordem} onChange={(e) => setOrdem(e.target.value)}>
          <option value="situacao">Ordenar por situação</option>
          <option value="nome">Ordenar por nome</option>
        </select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="th">Material</th><th className="th">Categoria</th><th className="th">Atual</th><th className="th">Mínimo</th>
            <th className="th">Últ. custo</th><th className="th">Fornecedor</th><th className="th">Situação</th><th className="th"></th>
          </tr></thead>
          <tbody>
            {ordenada.map((m) => {
              const s = situacaoBadge(m.situacao);
              return (
                <tr key={m.id}>
                  <td className="td font-medium">{m.nome}</td>
                  <td className="td">{m.categoria}</td>
                  <td className="td">{numero(m.quantidade)} {m.unidade}</td>
                  <td className="td">{numero(m.quantidadeMinima)} {m.unidade}</td>
                  <td className="td">{m.custoUltimaCompra != null ? moeda4(m.custoUltimaCompra) : '—'}</td>
                  <td className="td">{m.fornecedorUltimaCompra || '—'}</td>
                  <td className="td"><span className={`badge ${s.cls}`}>{s.texto}</span></td>
                  <td className="td"><Link to="/entradas" className="btn btn-primary btn-sm">Repor</Link></td>
                </tr>
              );
            })}
            {lista.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={8}>Nenhum material precisa de reposição. 🎉</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
