import { useEffect, useState } from 'react';
import { api } from '../api';
import { moeda, numero } from '../format';
import { useToast } from '../components/Toast';
import { precoSugerido, financeiro, usaFaixa, taxaDe } from '../precoCalc';

export default function PrecoSugerido() {
  const [aba, setAba] = useState('unitario'); // 'unitario' | 'atacado'
  const [produtos, setProdutos] = useState([]);
  const [plataformas, setPlataformas] = useState([]);
  const [produtoId, setProdutoId] = useState('');
  const [plataformaId, setPlataformaId] = useState('');
  const [custosExtras, setCustosExtras] = useState('');
  const [margem, setMargem] = useState('');
  const [resultado, setResultado] = useState(null);
  // Orçamento de atacado
  const [qtdAtacado, setQtdAtacado] = useState('');
  const [precoUnitAtacado, setPrecoUnitAtacado] = useState('');
  const toast = useToast();

  useEffect(() => {
    api.get('/produtos?ativo=true').then(setProdutos).catch(() => {});
    api.get('/plataformas?ativo=true').then(setPlataformas).catch(() => {});
  }, []);

  const produto = produtos.find((p) => String(p.id) === String(produtoId));
  const plataforma = plataformas.find((p) => String(p.id) === String(plataformaId));
  const custoMateriais = produto ? Number(produto.custoAtualMateriais) || 0 : 0;
  const custoFinal = custoMateriais + (Number(custosExtras) || 0);

  // Preenche os custos extras já salvos do produto ao selecioná-lo (pode ajustar).
  useEffect(() => {
    if (produto) setCustosExtras(String(produto.custosExtras ?? 0));
  }, [produtoId]); // eslint-disable-line react-hooks/exhaustive-deps

  function sugerir() {
    if (!produto) return toast.erro('Selecione o produto.');
    if (!plataforma) return toast.erro('Selecione a plataforma.');
    if (!(Number(margem) >= 0)) return toast.erro('Informe a margem de lucro.');
    const preco = precoSugerido(custoFinal, plataforma, margem);
    if (preco == null) return toast.erro('Taxas + margem passam de 100%. Reduza a margem alvo.');
    const fin = financeiro(preco, custoFinal, plataforma);
    setResultado({ preco, ...fin });
  }

  // Orçamento de atacado: taxa calculada pela FAIXA do valor TOTAL do pedido (somatória).
  const qtd = Number(qtdAtacado) || 0;
  const precoUnit = Number(precoUnitAtacado) || 0;
  const totalVenda = precoUnit * qtd;
  const custoTotalAtacado = custoFinal * qtd;
  let atacado = null;
  if (plataforma && qtd > 0 && precoUnit > 0) {
    const { perc, fixo } = taxaDe(plataforma, totalVenda); // faixa pelo total
    const taxas = totalVenda * perc + fixo;
    const lucro = totalVenda - taxas - custoTotalAtacado;
    atacado = {
      total: totalVenda, taxas, lucro,
      lucroUnit: lucro / qtd,
      margem: totalVenda > 0 ? (lucro / totalVenda) * 100 : 0,
      perc: perc * 100, fixo,
    };
  }

  return (
    <div>
      <h1 className="text-3xl font-display font-extrabold text-grafite-900 mb-1">Calculadora de preços</h1>
      <p className="text-grafite-800/60 mb-4 text-sm max-w-2xl">
        Descubra o preço de venda ideal por unidade ou faça um orçamento de atacado (pedido grande).
      </p>

      <div className="flex gap-2 mb-6">
        <button className={`btn btn-sm ${aba === 'unitario' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAba('unitario')}>Preço unitário</button>
        <button className={`btn btn-sm ${aba === 'atacado' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAba('atacado')}>Orçamento de atacado</button>
      </div>

      {aba === 'atacado' ? (
        <>
          <div className="card max-w-xl space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Produto *</label>
                <select className="input" value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
                  <option value="">Selecione</option>
                  {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} ({p.sku})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Plataforma *</label>
                <select className="input" value={plataformaId} onChange={(e) => setPlataformaId(e.target.value)}>
                  <option value="">Selecione</option>
                  {plataformas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="label">Custo final / un</label>
                <div className="input bg-marca-50 text-marca-700 font-semibold flex items-center">{produto ? moeda(custoFinal) : '—'}</div>
              </div>
              <div>
                <label className="label">Quantidade *</label>
                <input type="number" step="1" className="input" value={qtdAtacado} onChange={(e) => setQtdAtacado(e.target.value)} placeholder="Ex.: 50" />
              </div>
              <div>
                <label className="label">Preço de venda / un (R$) *</label>
                <input type="number" step="0.01" className="input" value={precoUnitAtacado} onChange={(e) => setPrecoUnitAtacado(e.target.value)} placeholder="0,00" />
              </div>
            </div>
            <div>
              <label className="label">Custos extras / un (R$)</label>
              <input type="number" step="0.01" className="input" value={custosExtras} onChange={(e) => setCustosExtras(e.target.value)} placeholder="0,00" />
            </div>
            <p className="text-xs text-grafite-800/50">
              A taxa da plataforma é calculada pela faixa de preço do <b>valor total</b> do pedido (somatória), não por unidade.
            </p>
          </div>

          {atacado && (
            <div className="card max-w-xl mt-5">
              <div className="text-xs uppercase tracking-wide text-grafite-800/50 mb-1">Faturamento total ({numero(qtd)} un × {moeda(precoUnit)})</div>
              <div className="text-4xl font-display font-extrabold text-grafite-900 mb-4">{moeda(atacado.total)}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-grafite-800/50 text-xs">Taxas ({numero(atacado.perc)}% + {moeda(atacado.fixo)})</div>
                  <div className="font-semibold text-amber-600">{moeda(atacado.taxas)}</div>
                </div>
                <div>
                  <div className="text-grafite-800/50 text-xs">Custo total</div>
                  <div className="font-semibold text-grafite-800">{moeda(custoTotalAtacado)}</div>
                </div>
                <div>
                  <div className="text-grafite-800/50 text-xs">Lucro total</div>
                  <div className={'font-semibold ' + (atacado.lucro >= 0 ? 'text-green-700' : 'text-red-600')}>{moeda(atacado.lucro)}</div>
                </div>
                <div>
                  <div className="text-grafite-800/50 text-xs">Lucro / un · margem</div>
                  <div className={'font-semibold ' + (atacado.lucro >= 0 ? 'text-green-700' : 'text-red-600')}>{moeda(atacado.lucroUnit)} · {atacado.margem.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
      <>
      <div className="card max-w-xl space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Produto *</label>
            <select className="input" value={produtoId} onChange={(e) => { setProdutoId(e.target.value); setResultado(null); }}>
              <option value="">Selecione</option>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} ({p.sku})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Plataforma *</label>
            <select className="input" value={plataformaId} onChange={(e) => { setPlataformaId(e.target.value); setResultado(null); }}>
              <option value="">Selecione</option>
              {plataformas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="label">Custo materiais (ficha)</label>
            <div className="input bg-base-100 flex items-center">{produto ? moeda(custoMateriais) : '—'}</div>
          </div>
          <div>
            <label className="label">Custos extras (R$)</label>
            <input type="number" step="0.01" className="input" value={custosExtras} onChange={(e) => { setCustosExtras(e.target.value); setResultado(null); }} placeholder="0,00" />
          </div>
          <div>
            <label className="label">Custo final</label>
            <div className="input bg-marca-50 text-marca-700 font-semibold flex items-center">{produto ? moeda(custoFinal) : '—'}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="label">Margem de lucro alvo (%) *</label>
            <input type="number" step="0.01" className="input" value={margem} onChange={(e) => { setMargem(e.target.value); setResultado(null); }} placeholder="Ex.: 30" />
          </div>
          <button className="btn btn-primary" onClick={sugerir}>Sugerir preço</button>
        </div>

        {plataforma && (
          <p className="text-xs text-grafite-800/50">
            Taxa da plataforma: {usaFaixa(plataforma) ? 'calculada automaticamente pela faixa de preço.' : `${(Number(plataforma.comissaoPercentual) || 0) + (Number(plataforma.percentualFreteGratis) || 0)}% + R$ ${Number(plataforma.taxaFixaPorItem) || 0}/item.`}
          </p>
        )}
      </div>

      {resultado && (
        <div className="card max-w-xl mt-5">
          <div className="text-xs uppercase tracking-wide text-grafite-800/50 mb-1">Preço de venda sugerido</div>
          <div className="text-4xl font-display font-extrabold text-marca-600 mb-4">{moeda(resultado.preco)}</div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-grafite-800/50 text-xs">Taxas do canal</div>
              <div className="font-semibold text-amber-600">{moeda(resultado.taxas)}</div>
            </div>
            <div>
              <div className="text-grafite-800/50 text-xs">Lucro líquido / un</div>
              <div className="font-semibold text-green-700">{moeda(resultado.lucro)}</div>
            </div>
            <div>
              <div className="text-grafite-800/50 text-xs">Margem real</div>
              <div className="font-semibold text-green-700">{resultado.margemReal.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
