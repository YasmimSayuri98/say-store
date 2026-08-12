import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { moeda, numero, data } from '../format';

export default function HistoricoEnvios() {
  const [envios, setEnvios] = useState([]);
  const [plataformas, setPlataformas] = useState([]);
  const [filtro, setFiltro] = useState('');

  useEffect(() => { api.get('/plataformas').then(setPlataformas); }, []);
  useEffect(() => {
    const q = filtro ? '?plataformaId=' + filtro : '';
    api.get('/envios' + q).then(setEnvios);
  }, [filtro]);

  return (
    <div>
      <h1 className="text-3xl font-display font-extrabold text-grafite-900 mb-4">Histórico de envios</h1>

      <div className="flex items-center gap-2 mb-4">
        <label className="label mb-0">Plataforma:</label>
        <select className="input max-w-xs" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todas</option>
          {plataformas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          <option value="sem">Sem plataforma</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="th">Data</th>
            <th className="th">Plataforma</th>
            <th className="th">Produtos</th>
            <th className="th text-right">Faturamento</th>
            <th className="th text-right">Lucro</th>
            <th className="th">Ações</th>
          </tr></thead>
          <tbody>
            {envios.map((e) => (
              <tr key={e.id}>
                <td className="td">{data(e.dataEnvio)}</td>
                <td className="td">{e.plataforma ? <span className="badge badge-normal">{e.plataforma.nome}</span> : <span className="text-grafite-800/40">—</span>}</td>
                <td className="td">{e.itens.map((i) => `${numero(i.quantidade)}x ${i.produto.nome}`).join(', ')}</td>
                <td className="td text-right">{moeda(e.faturamentoBruto)}</td>
                <td className={'td text-right font-medium ' + (e.lucro >= 0 ? 'text-green-700' : 'text-red-600')}>{moeda(e.lucro)}</td>
                <td className="td"><Link to={'/envios/' + e.id} className="btn btn-secondary btn-sm">Detalhes</Link></td>
              </tr>
            ))}
            {envios.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={6}>Nenhum envio.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
