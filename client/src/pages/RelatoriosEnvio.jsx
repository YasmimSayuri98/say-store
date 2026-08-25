import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { moeda, numero } from '../format';

function Cartao({ titulo, valor, cor = 'text-grafite-900' }) {
  return (
    <div className="card !p-4">
      <div className="text-xs font-medium text-grafite-800/60 uppercase tracking-wide">{titulo}</div>
      <div className={`text-2xl font-display font-bold mt-1.5 ${cor}`}>{valor}</div>
    </div>
  );
}

function badgeSituacao(s) {
  if (s === 'SEM_ESTOQUE') return <span className="badge badge-sem">Sem estoque</span>;
  if (s === 'BAIXO') return <span className="badge badge-baixo">Baixo</span>;
  return <span className="badge badge-normal">OK</span>;
}

export default function RelatoriosEnvio() {
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [rel, setRel] = useState(null);

  function carregar() {
    const params = [];
    if (de) params.push('de=' + de);
    if (ate) params.push('ate=' + ate);
    const q = params.length ? '?' + params.join('&') : '';
    api.get('/embalagens/relatorio' + q).then(setRel).catch(() => {});
  }
  useEffect(() => { carregar(); }, [de, ate]);

  return (
    <div>
      <h1 className="text-3xl font-display font-extrabold text-grafite-900 mb-1">Gastos de envios</h1>
      <p className="text-grafite-800/60 mb-5 text-sm max-w-2xl">
        Gastos com materiais de embalagem, consumo por material, estoque atual e o que precisa comprar.
        Os tipos de embalagem são cadastrados em <Link to="/embalagens" className="text-marca-600 font-medium">Embalagens</Link>.
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label className="label">De</label>
          <input type="date" className="input" value={de} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div>
          <label className="label">Até</label>
          <input type="date" className="input" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
        {(de || ate) && <button className="btn btn-secondary btn-sm mb-0.5" onClick={() => { setDe(''); setAte(''); }}>Limpar período</button>}
        <span className="text-xs text-grafite-800/50 mb-2">{!de && !ate ? 'Mostrando todo o período' : 'Período filtrado'}</span>
      </div>

      {!rel ? <p className="text-grafite-800/60">Carregando...</p> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Cartao titulo="Gasto com embalagem" valor={moeda(rel.totalGasto)} cor="text-marca-600" />
            <Cartao titulo="Pacotes usados" valor={numero(rel.totalPacotes)} />
            <Cartao titulo="Envios com embalagem" valor={numero(rel.quantidadeEnvios)} />
            <Cartao titulo="Itens a comprar" valor={numero(rel.comprar.length)} cor={rel.comprar.length > 0 ? 'text-red-600' : 'text-grafite-900'} />
          </div>

          {rel.comprar.length > 0 && (
            <div className="card border border-red-200">
              <h2 className="font-display font-bold text-red-700 mb-3">⚠️ Precisa comprar</h2>
              <table className="w-full">
                <thead><tr><th className="th">Material</th><th className="th text-right">Em estoque</th><th className="th text-right">Mínimo</th><th className="th">Situação</th></tr></thead>
                <tbody>
                  {rel.comprar.map((m) => (
                    <tr key={m.materialId}>
                      <td className="td font-medium">{m.nome}</td>
                      <td className="td text-right tabular-nums">{numero(m.quantidade)} {m.unidade}</td>
                      <td className="td text-right tabular-nums">{numero(m.quantidadeMinima)} {m.unidade}</td>
                      <td className="td">{badgeSituacao(m.situacao)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card overflow-x-auto">
              <h2 className="font-display font-bold text-grafite-900 mb-3">Gasto por tipo de embalagem</h2>
              <table className="w-full">
                <thead><tr><th className="th">Embalagem</th><th className="th text-right">Pacotes</th><th className="th text-right">Custo</th></tr></thead>
                <tbody>
                  {rel.porEmbalagem.map((e) => (
                    <tr key={e.embalagemId}>
                      <td className="td font-medium">{e.nome}</td>
                      <td className="td text-right tabular-nums">{numero(e.pacotes)}</td>
                      <td className="td text-right tabular-nums">{moeda(e.custo)}</td>
                    </tr>
                  ))}
                  {rel.porEmbalagem.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={3}>Nenhum envio com embalagem no período.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="card overflow-x-auto">
              <h2 className="font-display font-bold text-grafite-900 mb-3">Consumo por material</h2>
              <table className="w-full">
                <thead><tr><th className="th">Material</th><th className="th text-right">Consumido</th><th className="th text-right">Custo estimado</th></tr></thead>
                <tbody>
                  {rel.porMaterial.map((m) => (
                    <tr key={m.materialId}>
                      <td className="td font-medium">{m.nome}</td>
                      <td className="td text-right tabular-nums">{numero(m.quantidade)} {m.unidade}</td>
                      <td className="td text-right tabular-nums">{moeda(m.custoEstimado)}</td>
                    </tr>
                  ))}
                  {rel.porMaterial.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={3}>Nenhum consumo no período.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card overflow-x-auto">
            <h2 className="font-display font-bold text-grafite-900 mb-3">Estoque dos materiais de embalagem</h2>
            <table className="w-full">
              <thead><tr>
                <th className="th">Material</th><th className="th text-right">Em estoque</th><th className="th text-right">Mínimo</th>
                <th className="th text-right">Custo médio</th><th className="th text-right">Valor em estoque</th><th className="th">Situação</th>
              </tr></thead>
              <tbody>
                {rel.estoque.map((m) => (
                  <tr key={m.materialId}>
                    <td className="td font-medium">{m.nome}</td>
                    <td className="td text-right tabular-nums">{numero(m.quantidade)} {m.unidade}</td>
                    <td className="td text-right tabular-nums">{numero(m.quantidadeMinima)} {m.unidade}</td>
                    <td className="td text-right tabular-nums">{moeda(m.custoMedio)}</td>
                    <td className="td text-right tabular-nums">{moeda(m.valorEmEstoque)}</td>
                    <td className="td">{badgeSituacao(m.situacao)}</td>
                  </tr>
                ))}
                {rel.estoque.length === 0 && <tr><td className="td text-grafite-800/40" colSpan={6}>Nenhum material de embalagem cadastrado ainda.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
