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
  const [orcamentoAberto, setOrcamentoAberto] = useState(false);
  const [comprador, setComprador] = useState({ nome: '', contato: '', email: '', validadeDias: '7', pagamento: '', obs: '', meuContato: '' });
  const toast = useToast();

  const [matriz, setMatriz] = useState([]); // produtos com preços já cadastrados por plataforma

  useEffect(() => {
    api.get('/produtos?ativo=true').then(setProdutos).catch(() => {});
    api.get('/plataformas?ativo=true').then(setPlataformas).catch(() => {});
    api.get('/precificacao').then((d) => setMatriz(d.produtos || [])).catch(() => {});
  }, []);

  const produto = produtos.find((p) => String(p.id) === String(produtoId));
  const plataforma = plataformas.find((p) => String(p.id) === String(plataformaId));

  // Preço de venda já cadastrado do produto na plataforma selecionada (0 se não houver).
  function precoCadastrado(prodId, platId) {
    const p = matriz.find((x) => String(x.produtoId) === String(prodId));
    if (!p) return 0;
    const pl = (p.plataformas || []).find((x) => String(x.plataformaId) === String(platId));
    return pl ? Number(pl.precoVenda) || 0 : 0;
  }
  const precoCadUnitario = produtoId && plataformaId && plataformaId !== 'particular' ? precoCadastrado(produtoId, plataformaId) : 0;
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

  // Escapa texto do usuário para inserir com segurança no HTML do orçamento.
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function gerarOrcamento() {
    const q = Number(qtdAtacado) || 0;
    const pu = Number(precoUnitAtacado) || 0;
    if (!produto) return toast.erro('Selecione o produto no orçamento.');
    if (!(q > 0) || !(pu > 0)) return toast.erro('Informe a quantidade e o preço unitário.');
    if (!comprador.nome.trim()) return toast.erro('Informe o nome do cliente.');

    const total = pu * q;
    const agora = new Date();
    const num = 'ORC-' + agora.toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(agora.getHours()).padStart(2, '0') + String(agora.getMinutes()).padStart(2, '0');
    const dataFmt = agora.toLocaleDateString('pt-BR');
    const dias = Number(comprador.validadeDias) || 7;
    const validade = new Date(agora.getTime() + dias * 86400000).toLocaleDateString('pt-BR');

    const linhaOpc = (label, val) => val && String(val).trim()
      ? `<tr><td class="k">${esc(label)}</td><td>${esc(val)}</td></tr>` : '';

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>${esc(num)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #1C1B1A; font-size: 13px; }
  .page { max-width: 760px; margin: 0 auto; padding: 32px 40px; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #E8590C; padding-bottom: 18px; }
  .brand { font-size: 26px; font-weight: 800; color: #E8590C; letter-spacing: -0.5px; }
  .brand small { display: block; font-size: 11px; font-weight: 600; color: #7A2D0B; letter-spacing: 3px; text-transform: uppercase; }
  .doc { text-align: right; }
  .doc h1 { margin: 0; font-size: 20px; letter-spacing: 4px; color: #2A2825; }
  .doc .meta { font-size: 12px; color: #6b6660; margin-top: 4px; line-height: 1.5; }
  .cliente { margin: 24px 0 8px; }
  .cliente .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #E8590C; font-weight: 700; margin-bottom: 6px; }
  table.info { border-collapse: collapse; }
  table.info td { padding: 2px 0; font-size: 13px; }
  table.info td.k { color: #6b6660; padding-right: 14px; white-space: nowrap; }
  table.itens { width: 100%; border-collapse: collapse; margin-top: 22px; }
  table.itens thead th { background: #E8590C; color: #fff; text-align: left; padding: 10px 12px; font-size: 12px; letter-spacing: 0.5px; }
  table.itens thead th.r, table.itens tbody td.r { text-align: right; }
  table.itens tbody td { padding: 12px; border-bottom: 1px solid #EFEBE5; }
  .totais { margin-top: 8px; display: flex; justify-content: flex-end; }
  .totais .box { min-width: 260px; }
  .totais .row { display: flex; justify-content: space-between; padding: 6px 12px; }
  .totais .grand { background: #FFF4ED; border: 1px solid #FFC9A8; border-radius: 8px; margin-top: 6px; padding: 12px; display: flex; justify-content: space-between; align-items: center; }
  .totais .grand .lbl { font-weight: 700; color: #2A2825; }
  .totais .grand .val { font-size: 22px; font-weight: 800; color: #C4460A; }
  .cond { margin-top: 26px; border-top: 1px solid #EFEBE5; padding-top: 16px; font-size: 12px; color: #4b4741; line-height: 1.7; }
  .cond b { color: #2A2825; }
  .foot { margin-top: 28px; text-align: center; font-size: 11px; color: #9a948c; border-top: 1px dashed #E2DCD3; padding-top: 14px; }
  @media print { .page { padding: 12px 8px; } }
</style></head>
<body><div class="page">
  <div class="top">
    <div class="brand">Say Store<small>3D Personalizados</small></div>
    <div class="doc">
      <h1>ORÇAMENTO</h1>
      <div class="meta">Nº ${esc(num)}<br>Data: ${dataFmt}<br>Válido até: <b>${validade}</b></div>
    </div>
  </div>

  <div class="cliente">
    <div class="lbl">Para</div>
    <table class="info">
      <tr><td class="k">Cliente</td><td><b>${esc(comprador.nome)}</b></td></tr>
      ${linhaOpc('Contato', comprador.contato)}
      ${linhaOpc('E-mail', comprador.email)}
    </table>
  </div>

  <table class="itens">
    <thead><tr><th>Produto</th><th class="r">Qtde</th><th class="r">Valor unit.</th><th class="r">Total</th></tr></thead>
    <tbody>
      <tr>
        <td>${esc(produto.nome)}${produto.sku ? ` <span style="color:#9a948c;font-size:11px">(${esc(produto.sku)})</span>` : ''}</td>
        <td class="r">${numero(q)}</td>
        <td class="r">${moeda(pu)}</td>
        <td class="r">${moeda(total)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totais"><div class="box">
    <div class="row"><span>Subtotal</span><span>${moeda(total)}</span></div>
    <div class="grand"><span class="lbl">Total do orçamento</span><span class="val">${moeda(total)}</span></div>
  </div></div>

  <div class="cond">
    <b>Condições</b><br>
    Este orçamento é válido até <b>${validade}</b> (${dias} dias).<br>
    ${comprador.pagamento && comprador.pagamento.trim() ? `Forma de pagamento: ${esc(comprador.pagamento)}.<br>` : ''}
    ${comprador.obs && comprador.obs.trim() ? `Observações: ${esc(comprador.obs)}<br>` : ''}
  </div>

  <div class="foot">
    ${comprador.meuContato && comprador.meuContato.trim() ? esc(comprador.meuContato) + ' · ' : ''}Say Store — obrigada pela preferência! 🧡
  </div>
</div></body></html>`;

    imprimirHtml(html);
  }

  // Renderiza o orçamento num iframe oculto e abre a impressão (Salvar como PDF).
  function imprimirHtml(html) {
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    iframe.srcdoc = html;
    iframe.onload = () => {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch { /* ignore */ }
      setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* ignore */ } }, 1500);
    };
    document.body.appendChild(iframe);
  }

  // Orçamento de atacado: taxa calculada pela FAIXA do valor TOTAL do pedido (somatória).
  // "Particular" (venda direta) = sem taxa de plataforma; lucro = preço − custo da ficha.
  const ehParticular = plataformaId === 'particular';
  const qtd = Number(qtdAtacado) || 0;
  const precoUnit = Number(precoUnitAtacado) || 0;
  const totalVenda = precoUnit * qtd;
  const custoTotalAtacado = custoFinal * qtd;
  let atacado = null;
  if ((ehParticular || plataforma) && qtd > 0 && precoUnit > 0) {
    const { perc, fixo } = ehParticular ? { perc: 0, fixo: 0 } : taxaDe(plataforma, totalVenda); // faixa pelo total
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
                  <option value="particular">🤝 Particular (venda direta — sem taxa)</option>
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
                {precoCadUnitario > 0 && (
                  <p className="text-xs text-grafite-800/60 mt-1">
                    Preço cadastrado: <b className="text-grafite-900">{moeda(precoCadUnitario)}</b>
                    <button className="text-marca-600 font-medium ml-2 hover:underline" onClick={() => setPrecoUnitAtacado(String(precoCadUnitario))}>usar</button>
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="label">Custos extras / un (R$)</label>
              <input type="number" step="0.01" className="input" value={custosExtras} onChange={(e) => setCustosExtras(e.target.value)} placeholder="0,00" />
            </div>
            <p className="text-xs text-grafite-800/50">
              {ehParticular
                ? <>Pedido <b>particular</b>: sem taxa de plataforma — o lucro é o preço menos o custo da ficha.</>
                : <>A taxa da plataforma é calculada pela faixa de preço do <b>valor total</b> do pedido (somatória), não por unidade.</>}
            </p>
          </div>

          {atacado && (
            <div className="card max-w-xl mt-5">
              <div className="text-xs uppercase tracking-wide text-grafite-800/50 mb-1">Faturamento total ({numero(qtd)} un × {moeda(precoUnit)})</div>
              <div className="text-4xl font-display font-extrabold text-grafite-900 mb-4">{moeda(atacado.total)}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-grafite-800/50 text-xs">{ehParticular ? 'Taxas (venda direta)' : `Taxas (${numero(atacado.perc)}% + ${moeda(atacado.fixo)})`}</div>
                  <div className="font-semibold text-amber-600">{ehParticular ? 'Sem taxa' : moeda(atacado.taxas)}</div>
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

              <div className="border-t border-base-200 mt-4 pt-4">
                {!orcamentoAberto ? (
                  <button className="btn btn-secondary" onClick={() => setOrcamentoAberto(true)}>📄 Criar orçamento para o cliente</button>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs uppercase tracking-wide text-grafite-800/50">Dados para o orçamento</div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="label">Nome do cliente / empresa *</label>
                        <input className="input" value={comprador.nome} onChange={(e) => setComprador({ ...comprador, nome: e.target.value })} placeholder="Ex.: Maria Silva" />
                      </div>
                      <div>
                        <label className="label">Contato (telefone / WhatsApp)</label>
                        <input className="input" value={comprador.contato} onChange={(e) => setComprador({ ...comprador, contato: e.target.value })} placeholder="(00) 00000-0000" />
                      </div>
                      <div>
                        <label className="label">E-mail (opcional)</label>
                        <input className="input" value={comprador.email} onChange={(e) => setComprador({ ...comprador, email: e.target.value })} placeholder="cliente@email.com" />
                      </div>
                      <div>
                        <label className="label">Validade do orçamento (dias)</label>
                        <input type="number" min="1" className="input" value={comprador.validadeDias} onChange={(e) => setComprador({ ...comprador, validadeDias: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">Forma de pagamento (opcional)</label>
                        <input className="input" value={comprador.pagamento} onChange={(e) => setComprador({ ...comprador, pagamento: e.target.value })} placeholder="Ex.: Pix, 50% adiantado" />
                      </div>
                      <div>
                        <label className="label">Seu contato no orçamento (opcional)</label>
                        <input className="input" value={comprador.meuContato} onChange={(e) => setComprador({ ...comprador, meuContato: e.target.value })} placeholder="Ex.: WhatsApp (00) 0000-0000" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="label">Observações (opcional)</label>
                        <textarea className="input" rows={2} value={comprador.obs} onChange={(e) => setComprador({ ...comprador, obs: e.target.value })} placeholder="Ex.: prazo de produção de 7 dias úteis" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button className="btn btn-ghost" onClick={() => setOrcamentoAberto(false)}>Cancelar</button>
                      <button className="btn btn-primary" onClick={gerarOrcamento}>Gerar orçamento (PDF)</button>
                    </div>
                    <p className="text-xs text-grafite-800/50">Ao clicar, abre a janela de impressão — escolha <b>“Salvar como PDF”</b> para baixar o documento e enviar ao cliente.</p>
                  </div>
                )}
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

        {precoCadUnitario > 0 && (
          <p className="text-xs text-grafite-800/60">Preço já cadastrado nesta plataforma: <b className="text-grafite-900">{moeda(precoCadUnitario)}</b></p>
        )}

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
