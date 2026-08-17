import { useEffect, useState } from 'react';
import { api } from '../api';
import { moeda, numero } from '../format';
import { useToast } from '../components/Toast';
import SeletorEmbalagens, { linhasEmbalagemPayload } from '../components/SeletorEmbalagens';

export default function Envios() {
  const [produtos, setProdutos] = useState([]);
  const [plataformas, setPlataformas] = useState([]);
  const [plataformaId, setPlataformaId] = useState('');
  const [itens, setItens] = useState([{ produtoId: '', quantidade: '' }]);
  const [dataEnvio, setDataEnvio] = useState('');
  const [observacao, setObservacao] = useState('');
  const [numeroPedido, setNumeroPedido] = useState('');
  const [embalagens, setEmbalagens] = useState([]);
  const [resumo, setResumo] = useState(null);
  const toast = useToast();

  useEffect(() => {
    api.get('/produtos?ativo=true').then(setProdutos);
    api.get('/plataformas?ativo=true').then((pls) => {
      setPlataformas(pls);
      if (pls.length) setPlataformaId(String(pls[0].id));
    });
  }, []);

  function addItem() { setItens([...itens, { produtoId: '', quantidade: '' }]); }
  function removeItem(i) { setItens(itens.filter((_, idx) => idx !== i)); }
  function setItem(i, campo, valor) { setItens(itens.map((it, idx) => idx === i ? { ...it, [campo]: valor } : it)); setResumo(null); }

  function itensValidos() {
    return itens.filter((it) => it.produtoId && Number(it.quantidade) > 0)
      .map((it) => ({ produtoId: Number(it.produtoId), quantidade: Number(it.quantidade) }));
  }

  async function preview() {
    try {
      const validos = itensValidos();
      if (validos.length === 0) return toast.erro('Adicione ao menos um produto.');
      setResumo(await api.post('/envios/preview', { itens: validos, plataformaId: plataformaId || undefined, numeroPedido: numeroPedido || undefined }));
    } catch (e) { toast.erro(e.message); }
  }

  async function confirmar() {
    try {
      const validos = itensValidos();
      const embs = linhasEmbalagemPayload(embalagens);
      if (embs.length === 0) return toast.erro('Selecione a embalagem usada no envio.');
      await api.post('/envios', {
        itens: validos, plataformaId: plataformaId || undefined, dataEnvio: dataEnvio || undefined,
        observacao: observacao || undefined, numeroPedido: numeroPedido || undefined,
        embalagens: linhasEmbalagemPayload(embalagens),
      });
      toast.sucesso('Envio confirmado e estoque baixado.');
      setItens([{ produtoId: '', quantidade: '' }]); setResumo(null); setObservacao(''); setDataEnvio(''); setNumeroPedido(''); setEmbalagens([]);
    } catch (e) { toast.erro(e.message); }
  }

  const fin = resumo?.financeiro;

  return (
    <div>
      <h1 className="text-3xl font-display font-extrabold text-grafite-900 mb-6">Registrar envios (baixa de produtos)</h1>

      <div className="card mb-6">
        <div className="grid md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="label">Plataforma</label>
            <select className="input" value={plataformaId} onChange={(e) => { setPlataformaId(e.target.value); setResumo(null); }}>
              {plataformas.length === 0 && <option value="">Nenhuma cadastrada</option>}
              {plataformas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div><label className="label">Data do envio</label><input type="date" className="input" value={dataEnvio} onChange={(e) => setDataEnvio(e.target.value)} /></div>
          <div><label className="label">Observação</label><input className="input" value={observacao} onChange={(e) => setObservacao(e.target.value)} /></div>
          <div>
            <label className="label">Número do pedido</label>
            <input className="input" value={numeroPedido} onChange={(e) => { setNumeroPedido(e.target.value); setResumo(null); }} placeholder="Opcional — ex.: order_sn da Shopee" />
            <p className="text-xs text-grafite-800/50 mt-1">Se informado, o sistema valida que este pedido ainda não teve baixa de estoque (evita duplicidade com a Produção por plataforma).</p>
          </div>
        </div>

        <label className="label">Produtos enviados</label>
        <div className="space-y-2">
          {itens.map((it, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select className="input flex-1" value={it.produtoId} onChange={(e) => setItem(i, 'produtoId', e.target.value)}>
                <option value="">Selecione o produto</option>
                {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <input type="number" className="input w-28" placeholder="Qtd" value={it.quantidade} onChange={(e) => setItem(i, 'quantidade', e.target.value)} />
              <button className="btn btn-danger btn-sm" onClick={() => removeItem(i)}>×</button>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <button className="btn btn-secondary" onClick={addItem}>+ Adicionar produto</button>
        </div>

        <div className="mt-4 pt-4 border-t">
          <SeletorEmbalagens linhas={embalagens} setLinhas={setEmbalagens} />
        </div>

        <div className="flex justify-end mt-4">
          <button className="btn btn-primary" onClick={preview}>Ver resumo</button>
        </div>
      </div>

      {resumo && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-display font-bold text-grafite-900 mb-3">Consumo de materiais</h2>
            <table className="w-full mb-4">
              <thead><tr>
                <th className="th">Material</th><th className="th">Necessário</th><th className="th">Disponível</th><th className="th">Custo</th><th className="th">Situação</th>
              </tr></thead>
              <tbody>
                {resumo.materiais.map((m) => (
                  <tr key={m.materialId}>
                    <td className="td">{m.nome}</td>
                    <td className="td">{numero(m.necessario)} {m.unidade}</td>
                    <td className="td">{numero(m.disponivel)} {m.unidade}</td>
                    <td className="td">{moeda(m.custo)}</td>
                    <td className="td">{m.suficiente
                      ? <span className="badge badge-normal">OK</span>
                      : <span className="badge badge-sem">Faltam {numero(m.faltando)} {m.unidade}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between items-center border-t pt-3">
              <span className="font-semibold">Custo dos materiais consumidos</span>
              <span className="text-lg font-bold text-marca-600">{moeda(resumo.custoTotal)}</span>
            </div>
          </div>

          <div className="card">
            <h2 className="font-display font-bold text-grafite-900 mb-3">
              Financeiro {fin?.plataforma ? <span className="text-marca-600">· {fin.plataforma.nome}</span> : ''}
            </h2>
            {!fin?.plataforma ? (
              <p className="text-grafite-800/60 text-sm">Selecione uma plataforma para ver faturamento e lucro.</p>
            ) : (
              <>
                {fin.semPreco.length > 0 && (
                  <p className="text-amber-600 text-sm mb-3 font-medium">
                    Sem preço de venda cadastrado em {fin.plataforma.nome} para: {fin.semPreco.join(', ')}. Defina em Precificação.
                  </p>
                )}
                <table className="w-full mb-4">
                  <thead><tr><th className="th">Produto</th><th className="th text-right">Qtd</th><th className="th text-right">Preço un</th><th className="th text-right">Lucro</th></tr></thead>
                  <tbody>
                    {fin.itens.map((l) => (
                      <tr key={l.produtoId}>
                        <td className="td">{l.nome}</td>
                        <td className="td text-right">{numero(l.quantidade)}</td>
                        <td className="td text-right">{moeda(l.precoVendaUnitario)}</td>
                        <td className={'td text-right font-medium ' + (l.lucro >= 0 ? 'text-green-700' : 'text-red-600')}>{moeda(l.lucro)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="space-y-1.5 text-sm border-t pt-3">
                  <Linha rotulo="Faturamento bruto" valor={moeda(fin.faturamentoBruto)} />
                  <Linha rotulo={`Taxas (${numero(fin.plataforma.comissaoPercentual + fin.plataforma.percentualFreteGratis)}% + R$ ${numero(fin.plataforma.taxaFixaPorItem)}/item)`} valor={'− ' + moeda(fin.totalTaxas)} cor="text-amber-600" />
                  <Linha rotulo="Custo dos produtos" valor={'− ' + moeda(fin.custoTotalProdutos)} cor="text-grafite-800" />
                  <div className="flex justify-between items-center border-t pt-2 mt-1">
                    <span className="font-semibold">Lucro líquido {fin.faturamentoBruto > 0 ? `(${numero(fin.margem)}%)` : ''}</span>
                    <span className={'text-lg font-bold ' + (fin.lucro >= 0 ? 'text-green-700' : 'text-red-600')}>{moeda(fin.lucro)}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="lg:col-span-2">
            {resumo.temInsuficiente
              ? <p className="text-red-600 text-sm font-medium">Não é possível confirmar: há materiais com estoque insuficiente.</p>
              : <div className="flex justify-end"><button className="btn btn-primary" onClick={confirmar}>Confirmar envio e baixar estoque</button></div>}
          </div>
        </div>
      )}
    </div>
  );
}

function Linha({ rotulo, valor, cor }) {
  return (
    <div className="flex justify-between">
      <span className="text-grafite-800/70">{rotulo}</span>
      <span className={cor || 'text-grafite-900'}>{valor}</span>
    </div>
  );
}
