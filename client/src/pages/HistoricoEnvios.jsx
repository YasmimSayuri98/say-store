import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { moeda, numero, data } from '../format';
import { useToast } from '../components/Toast';

export default function HistoricoEnvios() {
  const [envios, setEnvios] = useState([]);
  const [plataformas, setPlataformas] = useState([]);
  const [filtro, setFiltro] = useState('');
  const toast = useToast();

  function carregar() {
    const q = filtro ? '?plataformaId=' + filtro : '';
    api.get('/envios' + q).then(setEnvios);
  }

  useEffect(() => { api.get('/plataformas').then(setPlataformas); }, []);
  useEffect(() => { carregar(); }, [filtro]);

  async function excluir(e) {
    if (!window.confirm(`Excluir o envio de ${data(e.dataEnvio)}? O estoque consumido será devolvido e, se o envio veio de um pedido de plataforma, ele voltará para a lista de produção.`)) return;
    try {
      await api.del('/envios/' + e.id);
      toast.sucesso('Envio excluído e estoque estornado.');
      setEnvios((lista) => lista.filter((x) => x.id !== e.id));
    } catch (err) { toast.erro(err.message); }
  }

  return (
    <div>
      <h1 className="text-3xl font-display font-extrabold text-grafite-900 mb-4">Pedidos enviados</h1>

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
                <td className="td">
                  <div className="flex flex-col gap-0.5">
                    {e.itens.map((i) => (
                      <span key={i.id}>
                        {numero(i.quantidade)}x {i.produto.nome}
                        {i.produto.sku && <span className="text-xs text-grafite-800/45 ml-1">({i.produto.sku})</span>}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="td text-right">{moeda(e.faturamentoBruto)}</td>
                <td className={'td text-right font-medium ' + (e.lucro >= 0 ? 'text-green-700' : 'text-red-600')}>{moeda(e.lucro)}</td>
                <td className="td">
                  <div className="flex items-center gap-2">
                    <Link to={'/envios/' + e.id} className="btn btn-secondary btn-sm">Detalhes</Link>
                    <button onClick={() => excluir(e)} className="btn btn-danger btn-sm">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
            {envios.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={6}>Nenhum envio.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
