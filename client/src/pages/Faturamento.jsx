import { useEffect, useState } from 'react';
import { api } from '../api';
import { moeda, numero } from '../format';

function Cartao({ titulo, valor, cor }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-grafite-800/50 mb-1">{titulo}</div>
      <div className={'text-2xl font-display font-bold ' + (cor || 'text-grafite-900')}>{valor}</div>
    </div>
  );
}

export default function Faturamento() {
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [dados, setDados] = useState(null);

  async function carregar() {
    const q = [];
    if (de) q.push('de=' + de);
    if (ate) q.push('ate=' + ate);
    setDados(await api.get('/faturamento' + (q.length ? '?' + q.join('&') : '')));
  }
  useEffect(() => { carregar(); }, []);

  const t = dados?.total;

  return (
    <div>
      <h1 className="text-3xl font-display font-extrabold text-grafite-900 mb-1">Faturamento e lucro</h1>
      <p className="text-grafite-800/60 mb-6 text-sm max-w-3xl">
        Resultado dos envios registrados, separado por plataforma. O faturamento bruto é a soma dos preços
        de venda; o lucro desconta as taxas do canal e o custo dos produtos (materiais + extras).
      </p>

      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div><label className="label">De</label><input type="date" className="input" value={de} onChange={(e) => setDe(e.target.value)} /></div>
          <div><label className="label">Até</label><input type="date" className="input" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={carregar}>Aplicar filtro</button>
          {(de || ate) && <button className="btn btn-secondary" onClick={() => { setDe(''); setAte(''); setTimeout(carregar, 0); }}>Limpar</button>}
        </div>
      </div>

      {t && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Cartao titulo="Faturamento bruto" valor={moeda(t.faturamentoBruto)} />
          <Cartao titulo="Taxas das plataformas" valor={moeda(t.totalTaxas)} cor="text-amber-600" />
          <Cartao titulo="Custo dos produtos" valor={moeda(t.custoTotalProdutos)} cor="text-grafite-800" />
          <Cartao titulo="Lucro líquido" valor={moeda(t.lucro)} cor={t.lucro >= 0 ? 'text-green-700' : 'text-red-600'} />
        </div>
      )}

      <div className="card overflow-x-auto">
        <h2 className="font-display font-bold text-grafite-900 mb-3">Por plataforma</h2>
        <table className="w-full">
          <thead><tr>
            <th className="th">Plataforma</th>
            <th className="th text-right">Envios</th>
            <th className="th text-right">Unidades</th>
            <th className="th text-right">Faturamento bruto</th>
            <th className="th text-right">Taxas</th>
            <th className="th text-right">Custo produtos</th>
            <th className="th text-right">Lucro</th>
            <th className="th text-right">Margem</th>
          </tr></thead>
          <tbody>
            {dados?.porPlataforma.map((g) => (
              <tr key={String(g.plataformaId)}>
                <td className="td font-medium">{g.plataformaNome}</td>
                <td className="td text-right">{g.envios}</td>
                <td className="td text-right">{numero(g.unidades)}</td>
                <td className="td text-right">{moeda(g.faturamentoBruto)}</td>
                <td className="td text-right text-amber-600">{moeda(g.totalTaxas)}</td>
                <td className="td text-right text-grafite-800">{moeda(g.custoTotalProdutos)}</td>
                <td className={'td text-right font-semibold ' + (g.lucro >= 0 ? 'text-green-700' : 'text-red-600')}>{moeda(g.lucro)}</td>
                <td className={'td text-right ' + (g.lucro >= 0 ? 'text-green-700' : 'text-red-600')}>{numero(g.margem)}%</td>
              </tr>
            ))}
            {t && (
              <tr className="border-t-2 border-base-200 font-bold">
                <td className="td">Total geral</td>
                <td className="td text-right">{t.envios}</td>
                <td className="td text-right">{numero(t.unidades)}</td>
                <td className="td text-right">{moeda(t.faturamentoBruto)}</td>
                <td className="td text-right text-amber-600">{moeda(t.totalTaxas)}</td>
                <td className="td text-right text-grafite-800">{moeda(t.custoTotalProdutos)}</td>
                <td className={'td text-right ' + (t.lucro >= 0 ? 'text-green-700' : 'text-red-600')}>{moeda(t.lucro)}</td>
                <td className={'td text-right ' + (t.lucro >= 0 ? 'text-green-700' : 'text-red-600')}>{numero(t.margem)}%</td>
              </tr>
            )}
            {dados && dados.porPlataforma.every((g) => g.envios === 0) && (
              <tr><td className="td text-grafite-800/40" colSpan={8}>Nenhum envio no período. Registre envios escolhendo a plataforma.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
