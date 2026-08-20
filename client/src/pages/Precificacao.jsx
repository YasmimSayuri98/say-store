import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { moeda, numero } from '../format';
import { useToast } from '../components/Toast';
import { financeiro, usaFaixa } from '../precoCalc';

function custoFinalDe(p) { return (Number(p.custoAtualMateriais) || 0) + (Number(p.custosExtras) || 0); }

export default function Precificacao() {
  const [produtos, setProdutos] = useState([]);
  const [temPlataformas, setTemPlataformas] = useState(true);
  const [salvandoId, setSalvandoId] = useState(null);
  const [busca, setBusca] = useState('');
  const toast = useToast();

  async function carregar() {
    const dados = await api.get('/precificacao');
    setTemPlataformas((dados.plataformas || []).length > 0);
    setProdutos(dados.produtos.map((p) => ({
      ...p,
      custosExtras: String(p.custosExtras ?? 0),
      margemLucroAlvo: String(p.margemLucroAlvo ?? 0),
      plataformas: p.plataformas.map((pl) => ({ ...pl, precoVenda: pl.precoVenda ? String(pl.precoVenda) : '' })),
    })));
  }
  useEffect(() => { carregar(); }, []);

  function setCampo(pid, campo, valor) {
    setProdutos((prev) => prev.map((p) => p.produtoId === pid ? { ...p, [campo]: valor } : p));
  }
  function setPreco(pid, plataformaId, valor) {
    setProdutos((prev) => prev.map((p) => p.produtoId === pid
      ? { ...p, plataformas: p.plataformas.map((pl) => pl.plataformaId === plataformaId ? { ...pl, precoVenda: valor } : pl) }
      : p));
  }

  async function salvar(pid) {
    const p = produtos.find((x) => x.produtoId === pid);
    try {
      setSalvandoId(pid);
      await api.put('/precificacao/' + pid, {
        custosExtras: Number(p.custosExtras) || 0,
        margemLucroAlvo: Number(p.margemLucroAlvo) || 0,
        precos: p.plataformas.map((pl) => ({ plataformaId: pl.plataformaId, precoVenda: Number(pl.precoVenda) || 0 })),
      });
      toast.sucesso('Precificação salva.');
      carregar();
    } catch (e) { toast.erro(e.message); }
    finally { setSalvandoId(null); }
  }

  if (!temPlataformas) {
    return (
      <div>
        <h1 className="text-3xl font-display font-extrabold text-grafite-900 mb-4">Precificação</h1>
        <div className="card text-grafite-800/70">
          Cadastre ao menos uma plataforma de venda em <b>Plataformas</b> para começar a precificar.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-display font-extrabold text-grafite-900 mb-1">Precificação</h1>
      <p className="text-grafite-800/60 mb-6 text-sm max-w-3xl">
        Defina os <b>custos extras</b> de cada produto e o <b>preço de venda</b> em cada plataforma — o
        sistema mostra na hora o <b>lucro líquido</b> e a <b>margem</b>. Para descobrir o preço ideal a
        partir de uma margem alvo, use a aba <Link to="/preco-sugerido" className="text-marca-600 font-medium">Preço sugerido</Link>.
      </p>

      <input
        className="input max-w-xs mb-5"
        placeholder="Buscar produto por nome ou SKU…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <div className="space-y-5">
        {produtos
          .filter((p) => {
            const q = busca.trim().toLowerCase();
            return !q || p.nome.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
          })
          .map((p) => {
          const custoFinal = custoFinalDe(p);
          return (
            <div key={p.produtoId} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-display font-bold text-grafite-900 text-lg">{p.nome}</h2>
                  <span className="text-xs text-grafite-800/50">{p.sku}</span>
                </div>
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="label">Custo materiais</label>
                    <div className="input bg-base-100 min-w-[110px] flex items-center">{moeda(p.custoAtualMateriais)}</div>
                  </div>
                  <div>
                    <label className="label">Custos extras (R$)</label>
                    <input type="number" step="0.01" className="input w-28" value={p.custosExtras}
                      onChange={(e) => setCampo(p.produtoId, 'custosExtras', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Custo final</label>
                    <div className="input bg-marca-50 text-marca-700 font-semibold min-w-[110px] flex items-center">{moeda(custoFinal)}</div>
                  </div>
                  <div>
                    <label className="label">Margem alvo (%)</label>
                    <input type="number" step="0.01" className="input w-24" value={p.margemLucroAlvo}
                      onChange={(e) => setCampo(p.produtoId, 'margemLucroAlvo', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr>
                    <th className="th">Plataforma</th>
                    <th className="th">Taxas do canal</th>
                    <th className="th">Preço de venda</th>
                    <th className="th">Taxas (R$)</th>
                    <th className="th">Lucro líquido / un</th>
                    <th className="th">% de lucro</th>
                  </tr></thead>
                  <tbody>
                    {p.plataformas.map((pl) => {
                      const fin = financeiro(pl.precoVenda, custoFinal, pl);
                      const lucroPos = fin.lucro >= 0;
                      return (
                        <tr key={pl.plataformaId}>
                          <td className="td font-medium">{pl.plataformaNome}</td>
                          <td className="td text-xs text-grafite-800/60">
                            {usaFaixa(pl)
                              ? <span title="Calculada automaticamente pela faixa de preço da plataforma">Por faixa (automático)</span>
                              : <>{numero(pl.comissaoPercentual + pl.percentualFreteGratis)}% + R$ {numero(pl.taxaFixaPorItem)}/item</>}
                          </td>
                          <td className="td">
                            <input type="number" step="0.01" className="input w-28" value={pl.precoVenda}
                              onChange={(e) => setPreco(p.produtoId, pl.plataformaId, e.target.value)} placeholder="0,00" />
                          </td>
                          <td className="td text-grafite-800/70">{moeda(fin.taxas)}</td>
                          <td className={'td font-semibold ' + (lucroPos ? 'text-green-700' : 'text-red-600')}>{moeda(fin.lucro)}</td>
                          <td className={'td ' + (lucroPos ? 'text-green-700' : 'text-red-600')}>{numero(fin.margemReal)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button className="btn btn-primary" disabled={salvandoId === p.produtoId} onClick={() => salvar(p.produtoId)}>
                  {salvandoId === p.produtoId ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </div>
          );
        })}
        {produtos.length === 0 && <div className="card text-grafite-800/40">Nenhum produto ativo. Cadastre produtos primeiro.</div>}
        {produtos.length > 0 && busca.trim() && produtos.filter((p) => { const q = busca.trim().toLowerCase(); return p.nome.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q); }).length === 0 && (
          <div className="card text-grafite-800/40">Nenhum produto encontrado para “{busca}”.</div>
        )}
      </div>
    </div>
  );
}
