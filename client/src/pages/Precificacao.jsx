import { useEffect, useState } from 'react';
import { api } from '../api';
import { moeda, numero } from '../format';
import { useToast } from '../components/Toast';

// Fórmulas espelhadas do back-end (precoService) para feedback ao vivo.
// Tabela de taxas da Shopee por faixa de preço (fixo em R$ + %).
const FAIXAS_SHOPEE = [
  { max: 79.999999, fixo: 4, perc: 0.20 },
  { max: 99.999999, fixo: 16, perc: 0.14 },
  { max: 199.999999, fixo: 20, perc: 0.14 },
  { max: 499.999999, fixo: 26, perc: 0.14 },
  { max: Infinity, fixo: 26, perc: 0.14 },
];
function faixaShopee(preco) { for (const f of FAIXAS_SHOPEE) if (preco <= f.max) return f; return FAIXAS_SHOPEE[FAIXAS_SHOPEE.length - 1]; }
function usaFaixaShopee(pl) { return /shopee/i.test(pl?.plataformaNome || pl?.nome || ''); }

function custoFinalDe(p) { return (Number(p.custoAtualMateriais) || 0) + (Number(p.custosExtras) || 0); }
function taxaDe(pl, preco) {
  if (usaFaixaShopee(pl)) { const f = faixaShopee(preco); return { perc: f.perc, fixo: f.fixo }; }
  return { perc: ((Number(pl.comissaoPercentual) || 0) + (Number(pl.percentualFreteGratis) || 0)) / 100, fixo: Number(pl.taxaFixaPorItem) || 0 };
}
function precoSugerido(custoFinal, pl, margem) {
  const m = (Number(margem) || 0) / 100;
  if (usaFaixaShopee(pl)) {
    let anterior = 0;
    for (const f of FAIXAS_SHOPEE) {
      const denom = 1 - f.perc - m;
      if (denom > 0) { const p = Math.round(((custoFinal + f.fixo) / denom) * 100) / 100; if (p > anterior && p <= f.max) return p; }
      anterior = f.max;
    }
    return null;
  }
  const denom = 1 - (((Number(pl.comissaoPercentual) || 0) + (Number(pl.percentualFreteGratis) || 0)) / 100) - m;
  if (denom <= 0) return null;
  return Math.round(((custoFinal + (Number(pl.taxaFixaPorItem) || 0)) / denom) * 100) / 100;
}
function financeiro(preco, custoFinal, pl) {
  const p = Number(preco) || 0;
  const { perc, fixo } = taxaDe(pl, p);
  const taxas = p * perc + fixo;
  const lucro = p - taxas - custoFinal;
  const margemReal = p > 0 ? (lucro / p) * 100 : 0;
  return { taxas, lucro, margemReal };
}

export default function Precificacao() {
  const [produtos, setProdutos] = useState([]);
  const [temPlataformas, setTemPlataformas] = useState(true);
  const [salvandoId, setSalvandoId] = useState(null);
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
  function aplicarSugerido(pid, plataformaId) {
    const p = produtos.find((x) => x.produtoId === pid);
    const pl = p.plataformas.find((x) => x.plataformaId === plataformaId);
    const s = precoSugerido(custoFinalDe(p), pl, p.margemLucroAlvo);
    if (s == null) return toast.erro('Taxas + margem passam de 100%. Reduza a margem alvo.');
    setPreco(pid, plataformaId, String(s));
  }
  function aplicarTodosSugeridos(pid) {
    const p = produtos.find((x) => x.produtoId === pid);
    setProdutos((prev) => prev.map((x) => x.produtoId !== pid ? x : {
      ...x,
      plataformas: x.plataformas.map((pl) => {
        const s = precoSugerido(custoFinalDe(p), pl, p.margemLucroAlvo);
        return s == null ? pl : { ...pl, precoVenda: String(s) };
      }),
    }));
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
        Defina os <b>custos extras</b> (energia, mão de obra, embalagem) e a <b>margem de lucro alvo</b> de
        cada produto. O sistema sugere o preço de venda ideal em cada plataforma já embutindo custo e taxas.
        Você pode aceitar o sugerido ou digitar o seu preço — o lucro é recalculado na hora.
      </p>

      <div className="space-y-5">
        {produtos.map((p) => {
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
                    <th className="th">Preço sugerido</th>
                    <th className="th">Preço de venda</th>
                    <th className="th">Taxas (R$)</th>
                    <th className="th">Lucro / un</th>
                    <th className="th">Margem real</th>
                  </tr></thead>
                  <tbody>
                    {p.plataformas.map((pl) => {
                      const sugerido = precoSugerido(custoFinal, pl, p.margemLucroAlvo);
                      const fin = financeiro(pl.precoVenda, custoFinal, pl);
                      const lucroPos = fin.lucro >= 0;
                      return (
                        <tr key={pl.plataformaId}>
                          <td className="td font-medium">{pl.plataformaNome}</td>
                          <td className="td text-xs text-grafite-800/60">
                            {usaFaixaShopee(pl)
                              ? <span title="Calculada automaticamente pela faixa de preço da Shopee">Por faixa (automático)</span>
                              : <>{numero(pl.comissaoPercentual + pl.percentualFreteGratis)}% + R$ {numero(pl.taxaFixaPorItem)}/item</>}
                          </td>
                          <td className="td">
                            {sugerido == null
                              ? <span className="text-red-600 text-xs">margem alta demais</span>
                              : <button className="text-marca-600 font-medium hover:underline" onClick={() => aplicarSugerido(p.produtoId, pl.plataformaId)} title="Clique para aplicar">{moeda(sugerido)}</button>}
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
                <button className="btn btn-secondary" onClick={() => aplicarTodosSugeridos(p.produtoId)}>Aplicar preços sugeridos</button>
                <button className="btn btn-primary" disabled={salvandoId === p.produtoId} onClick={() => salvar(p.produtoId)}>
                  {salvandoId === p.produtoId ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          );
        })}
        {produtos.length === 0 && <div className="card text-grafite-800/40">Nenhum produto ativo. Cadastre produtos primeiro.</div>}
      </div>
    </div>
  );
}
