import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { moeda, numero, dataHora, data, dataDia, diaISO } from '../format';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import SeletorEmbalagens, { linhasEmbalagemPayload } from '../components/SeletorEmbalagens';

function Estatistica({ titulo, valor, cor = 'text-grafite-900', destaque = false }) {
  return (
    <div className={`card !p-4 relative overflow-hidden ${destaque ? 'ring-1 ring-marca-200' : ''}`}>
      {destaque && <div className="absolute left-0 top-0 bottom-0 w-1 bg-marca-500" />}
      <div className="text-xs font-medium text-grafite-800/60 uppercase tracking-wide">{titulo}</div>
      <div className={`text-2xl font-display font-bold mt-1.5 ${cor}`}>{valor}</div>
    </div>
  );
}

function Atalho({ to, label, icone }) {
  return (
    <Link to={to} className="btn btn-secondary group">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-marca-500 group-hover:text-marca-600">
        <path d={icone} />
      </svg>
      {label}
    </Link>
  );
}

function rotuloPrazo(prazoEnvio) {
  if (!prazoEnvio) return 'Sem prazo definido';
  // Hoje no fuso de Brasília; prazo pelo seu dia em UTC (correto para pedidos antigos e novos).
  const hoje = new Date(diaISO(new Date(), 'America/Sao_Paulo') + 'T00:00:00');
  const d = new Date(diaISO(prazoEnvio, 'UTC') + 'T00:00:00');
  const diffDias = Math.round((d - hoje) / 86400000);
  if (diffDias < 0) return 'Atrasado';
  if (diffDias === 0) return 'Hoje';
  if (diffDias === 1) return 'Amanhã';
  return dataDia(prazoEnvio);
}

function ehAtrasado(prazoEnvio) {
  return !!prazoEnvio && rotuloPrazo(prazoEnvio) === 'Atrasado';
}

// Mostra a data do prazo de um pedido; em vermelho e com aviso quando está atrasado.
function PrazoPedido({ prazoEnvio }) {
  if (!prazoEnvio) return <span className="text-xs text-grafite-800/40">Sem prazo</span>;
  const atrasado = ehAtrasado(prazoEnvio);
  return (
    <span className={`text-xs whitespace-nowrap ${atrasado ? 'text-red-600 font-semibold' : 'text-grafite-800/50'}`}>
      {atrasado ? '⚠️ Atrasado · ' : 'Prazo '}{dataDia(prazoEnvio)}
    </span>
  );
}

function agruparPorPrazo(itens) {
  const grupos = new Map();
  for (const it of itens) {
    const rotulo = rotuloPrazo(it.prazoEnvio);
    if (!grupos.has(rotulo)) grupos.set(rotulo, []);
    grupos.get(rotulo).push(it);
  }
  return grupos;
}

function AcoesLinha({ onEditar, onExcluir }) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <button title="Editar" onClick={onEditar} className="p-1 rounded hover:bg-base-200 text-grafite-800/40 hover:text-marca-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
      </button>
      <button title="Excluir" onClick={onExcluir} className="p-1 rounded hover:bg-red-50 text-grafite-800/40 hover:text-red-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H6a1 1 0 01-1-1V6" /></svg>
      </button>
    </div>
  );
}

// Classe de um passo do checklist: "ativo" (clicável) fica destacado; senão, apagado.
function chkCls(ativo) {
  return `flex items-center gap-1.5 text-xs ${ativo ? 'cursor-pointer text-grafite-800/70' : 'text-grafite-800/40'}`;
}

function SecaoAProduzir({ itens, onProduzir, onMarcarFoto, onEmbalar, onNovoPedido, onEditar, onExcluir }) {
  const grupos = agruparPorPrazo(itens);
  return (
    <div className="card lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-grafite-900">Produção necessária</h2>
        <div className="flex items-center gap-3">
          <button className="text-xs font-semibold text-marca-600 hover:text-marca-700" onClick={onNovoPedido}>+ Pedido manual</button>
          <Link to="/plataformas" className="text-xs font-semibold text-marca-600 hover:text-marca-700">Configurar →</Link>
        </div>
      </div>
      {itens.length === 0 ? (
        <p className="text-sm text-grafite-800/40 py-4 text-center">Nenhuma produção pendente.</p>
      ) : (
        <div className="space-y-4">
          {[...grupos.entries()].map(([rotulo, lista]) => (
            <div key={rotulo}>
              <div className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${rotulo === 'Atrasado' ? 'text-red-600' : 'text-grafite-800/50'}`}>{rotulo}</div>
              <table className="w-full">
                <tbody>
                  {lista.map((it) => (
                    <tr key={it.id}>
                      <td className="td">
                        <div className="flex flex-col gap-1">
                          <span className={it.semVinculo ? 'text-grafite-800/40 italic' : 'font-medium'}>
                            {it.semVinculo ? it.nomePlataforma : it.produtoNome} × {numero(it.quantidade)}
                          </span>
                          {it.observacao && (
                            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 w-fit max-w-xs whitespace-pre-wrap">📝 {it.observacao}</span>
                          )}
                          <div className="flex items-center gap-3 flex-wrap">
                            {it.personalizado && (
                              <label className={chkCls(!it.fotoImpressa && !it.semVinculo)}>
                                <input type="checkbox" checked={it.fotoImpressa} disabled={it.fotoImpressa} onChange={() => onMarcarFoto(it)} />
                                Foto impressa
                              </label>
                            )}
                            <label className={chkCls(!it.produzido && !it.cobertoPorEstoque && !it.semVinculo && !(it.personalizado && !it.fotoImpressa) && it.estoqueSuficiente)}>
                              <input
                                type="checkbox"
                                checked={it.produzido || it.cobertoPorEstoque}
                                disabled={it.produzido || it.cobertoPorEstoque || it.semVinculo || (it.personalizado && !it.fotoImpressa) || !it.estoqueSuficiente}
                                onChange={() => onProduzir(it)}
                              />
                              {it.cobertoPorEstoque && !it.produzido ? 'Produzido (do estoque)' : 'Produzido'}
                            </label>
                            <label className={chkCls(!it.embalado && !it.semVinculo && !(it.personalizado && !it.fotoImpressa) && (it.produzido || it.cobertoPorEstoque))}>
                              <input
                                type="checkbox"
                                checked={it.embalado}
                                disabled={it.embalado || it.semVinculo || (it.personalizado && !it.fotoImpressa) || (!it.produzido && !it.cobertoPorEstoque)}
                                onChange={() => onEmbalar(it)}
                              />
                              Embalado
                            </label>
                          </div>
                        </div>
                      </td>
                      <td className="td text-xs whitespace-nowrap">
                        <span className="badge badge-baixo">{it.plataformaNome}</span>
                      </td>
                      <td className="td text-xs whitespace-nowrap">
                        <div className="text-grafite-800/50">{it.numeroPedido}</div>
                        <PrazoPedido prazoEnvio={it.prazoEnvio} />
                      </td>
                      <td className="td text-right whitespace-nowrap">
                        {it.semVinculo ? (
                          <span className="badge badge-sem">Sem vínculo (SKU {it.skuPlataforma})</span>
                        ) : it.cobertoPorEstoque ? (
                          <span className="badge badge-normal" title={`${numero(it.estoqueProduto)} em estoque`}>✓ Tem estoque</span>
                        ) : !it.estoqueSuficiente ? (
                          <span className="badge badge-sem">Faltam materiais</span>
                        ) : (
                          <span className="badge badge-baixo">Produzir</span>
                        )}
                      </td>
                      <td className="td w-px"><AcoesLinha onEditar={() => onEditar(it)} onExcluir={() => onExcluir(it)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SecaoAguardandoEnvio({ itens, onEnviar, onEditar, onExcluir }) {
  const grupos = agruparPorPrazo(itens);
  return (
    <div className="card lg:col-span-2">
      <h2 className="font-display font-bold text-grafite-900 mb-4">Aguardando envio</h2>
      {itens.length === 0 ? (
        <p className="text-sm text-grafite-800/40 py-4 text-center">Nada aguardando envio.</p>
      ) : (
        <div className="space-y-4">
          {[...grupos.entries()].map(([rotulo, lista]) => (
            <div key={rotulo}>
              <div className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${rotulo === 'Atrasado' ? 'text-red-600' : 'text-grafite-800/50'}`}>{rotulo}</div>
              <table className="w-full">
                <tbody>
                  {lista.map((it) => (
                    <tr key={it.id}>
                      <td className="td">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={false} onChange={() => onEnviar(it)} />
                          <span className="font-medium">{it.produtoNome} × {numero(it.quantidade)}</span>
                        </label>
                        {it.observacao && (
                          <span className="mt-1 block text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 w-fit max-w-xs whitespace-pre-wrap">📝 {it.observacao}</span>
                        )}
                      </td>
                      <td className="td text-xs whitespace-nowrap"><span className="badge badge-baixo">{it.plataformaNome}</span></td>
                      <td className="td text-xs whitespace-nowrap">
                        <div className="text-grafite-800/50">{it.numeroPedido}</div>
                        <PrazoPedido prazoEnvio={it.prazoEnvio} />
                      </td>
                      <td className="td w-px"><AcoesLinha onEditar={() => onEditar(it)} onExcluir={() => onExcluir(it)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const pedidoManualVazio = { plataformaId: '', numeroPedido: '', prazoEnvio: '', observacao: '' };

function ModalPedidoManual({ plataformas, produtos, onClose, onSalvo }) {
  const [form, setForm] = useState(pedidoManualVazio);
  const [itens, setItens] = useState([{ produtoId: '', quantidade: '' }]);
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();

  function addItem() { setItens([...itens, { produtoId: '', quantidade: '' }]); }
  function removeItem(i) { setItens(itens.filter((_, idx) => idx !== i)); }
  function setItem(i, campo, valor) { setItens(itens.map((it, idx) => idx === i ? { ...it, [campo]: valor } : it)); }

  async function salvar() {
    const validos = itens.filter((it) => it.produtoId && Number(it.quantidade) > 0)
      .map((it) => ({ produtoId: Number(it.produtoId), quantidade: Number(it.quantidade) }));
    if (!form.plataformaId) return toast.erro('Selecione a plataforma.');
    if (!form.numeroPedido.trim()) return toast.erro('Informe o número do pedido.');
    if (validos.length === 0) return toast.erro('Adicione ao menos um produto.');

    setSalvando(true);
    try {
      await api.post('/producao/manual', {
        plataformaId: Number(form.plataformaId),
        numeroPedido: form.numeroPedido.trim(),
        prazoEnvio: form.prazoEnvio || undefined,
        observacao: form.observacao.trim() || undefined,
        itens: validos,
      });
      toast.sucesso('Pedido cadastrado na lista de produção.');
      onSalvo();
    } catch (e) { toast.erro(e.message); }
    setSalvando(false);
  }

  return (
    <Modal titulo="Cadastrar pedido manual" onClose={onClose} largura="max-w-xl">
      <div className="space-y-3">
        <div>
          <label className="label">Plataforma *</label>
          <select className="input" value={form.plataformaId} onChange={(e) => setForm({ ...form, plataformaId: e.target.value })}>
            <option value="">Selecione</option>
            {plataformas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Número do pedido *</label>
          <input className="input" value={form.numeroPedido} onChange={(e) => setForm({ ...form, numeroPedido: e.target.value })} />
        </div>
        <div>
          <label className="label">Prazo de envio</label>
          <input type="date" className="input" value={form.prazoEnvio} onChange={(e) => setForm({ ...form, prazoEnvio: e.target.value })} />
        </div>

        <div>
          <label className="label">Produtos do pedido</label>
          <div className="space-y-2">
            {itens.map((it, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select className="input flex-1" value={it.produtoId} onChange={(e) => setItem(i, 'produtoId', e.target.value)}>
                  <option value="">Selecione o produto</option>
                  {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <input type="number" className="input w-24" placeholder="Qtd" value={it.quantidade} onChange={(e) => setItem(i, 'quantidade', e.target.value)} />
                <button className="btn btn-danger btn-sm" onClick={() => removeItem(i)}>×</button>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm mt-2" onClick={addItem}>+ Adicionar produto</button>
        </div>
        <div>
          <label className="label">Observação</label>
          <textarea className="input" rows={2} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Ex.: cor personalizada, embrulho para presente, atenção ao prazo..." />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Cadastrar'}</button>
      </div>
    </Modal>
  );
}

function ModalEditarPedido({ item, produtos, plataformas, onClose, onSalvo }) {
  const [numeroPedido, setNumeroPedido] = useState(item.numeroPedido || '');
  const [plataformaId, setPlataformaId] = useState(item.plataformaId ? String(item.plataformaId) : '');
  const [prazoEnvio, setPrazoEnvio] = useState(item.prazoEnvio ? String(item.prazoEnvio).slice(0, 10) : '');
  const [produtoId, setProdutoId] = useState(item.produtoId ? String(item.produtoId) : '');
  const [quantidade, setQuantidade] = useState(String(item.quantidade));
  const [observacao, setObservacao] = useState(item.observacao || '');
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();
  const bloqueadoItem = item.produzido; // produto/quantidade não mudam depois de produzido

  async function salvar() {
    if (!numeroPedido.trim()) return toast.erro('Informe o número do pedido.');
    if (!plataformaId) return toast.erro('Selecione a plataforma.');
    if (!bloqueadoItem && (!produtoId || !(Number(quantidade) > 0))) return toast.erro('Selecione o produto e informe a quantidade.');
    setSalvando(true);
    try {
      await api.put(`/producao/${item.id}`, {
        numeroPedido: numeroPedido.trim(),
        plataformaId: Number(plataformaId),
        prazoEnvio: prazoEnvio || null,
        observacao,
        produtoId: bloqueadoItem ? undefined : Number(produtoId),
        quantidade: bloqueadoItem ? undefined : Number(quantidade),
      });
      toast.sucesso('Pedido atualizado.');
      onSalvo();
    } catch (e) { toast.erro(e.message); }
    setSalvando(false);
  }

  return (
    <Modal titulo="Editar pedido" onClose={onClose} largura="max-w-lg">
      <div className="space-y-3">
        <div>
          <label className="label">Plataforma *</label>
          <select className="input" value={plataformaId} onChange={(e) => setPlataformaId(e.target.value)}>
            <option value="">Selecione</option>
            {plataformas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Número do pedido *</label>
          <input className="input" value={numeroPedido} onChange={(e) => setNumeroPedido(e.target.value)} />
        </div>
        <div>
          <label className="label">Prazo de envio</label>
          <input type="date" className="input" value={prazoEnvio} onChange={(e) => setPrazoEnvio(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="label">Produto</label>
            <select className="input" value={produtoId} disabled={bloqueadoItem} onChange={(e) => setProdutoId(e.target.value)}>
              <option value="">Selecione</option>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Quantidade</label>
            <input type="number" className="input" value={quantidade} disabled={bloqueadoItem} onChange={(e) => setQuantidade(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Observação</label>
          <textarea className="input" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: cor personalizada, embrulho para presente, atenção ao prazo..." />
        </div>
        {bloqueadoItem && (
          <p className="text-xs text-grafite-800/50">Este item já foi marcado como produzido — o produto e a quantidade não podem mais ser alterados aqui (o estoque já foi descontado). Para trocar o produto ou a quantidade, exclua e cadastre de novo.</p>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </Modal>
  );
}

// Modal ao marcar um item como enviado: pergunta qual embalagem foi usada (opcional) para
// baixar do estoque. Não afeta preço/lucro — é só controle de estoque.
function ModalEnviar({ item, onClose, onEnviado }) {
  const [embalagens, setEmbalagens] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();

  async function confirmar() {
    setSalvando(true);
    try {
      await api.post(`/producao/${item.id}/enviar`, { embalagens: linhasEmbalagemPayload(embalagens) });
      toast.sucesso(`${item.produtoNome} marcado como enviado.`);
      onEnviado(item);
    } catch (e) { toast.erro(e.message); }
    setSalvando(false);
  }

  return (
    <Modal titulo="Marcar como enviado" onClose={onClose} largura="max-w-lg">
      <p className="text-sm text-grafite-800/70 mb-3">
        <span className="font-medium">{item.produtoNome} × {numero(item.quantidade)}</span> — pedido {item.numeroPedido}
      </p>
      <SeletorEmbalagens linhas={embalagens} setLinhas={setEmbalagens} />
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={confirmar} disabled={salvando}>{salvando ? 'Enviando...' : 'Confirmar envio'}</button>
      </div>
    </Modal>
  );
}

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [producao, setProducao] = useState([]);
  const [plataformas, setPlataformas] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [modalPedidoManual, setModalPedidoManual] = useState(false);
  const [pedidoEditando, setPedidoEditando] = useState(null);
  const [enviandoItem, setEnviandoItem] = useState(null);
  const toast = useToast();

  function recarregarProducao() { api.get('/producao').then(setProducao).catch(() => {}); }

  useEffect(() => { api.get('/dashboard').then(setD).catch(() => {}); }, []);
  useEffect(() => { recarregarProducao(); }, []);
  useEffect(() => {
    api.get('/plataformas?ativo=true').then(setPlataformas).catch(() => {});
    api.get('/produtos?ativo=true').then(setProdutos).catch(() => {});
  }, []);

  async function produzir(item) {
    try {
      await api.post(`/producao/${item.id}/produzir`, {});
      toast.sucesso(`${item.produtoNome || item.nomePlataforma} marcado como produzido.`);
      recarregarProducao();
    } catch (e) { toast.erro(e.message); }
  }

  async function embalar(item) {
    try {
      await api.post(`/producao/${item.id}/embalar`, {});
      toast.sucesso(`${item.produtoNome} embalado.`);
      recarregarProducao();
    } catch (e) { toast.erro(e.message); }
  }

  async function marcarFoto(item) {
    try {
      await api.post(`/producao/${item.id}/foto-impressa`, {});
      toast.sucesso('Foto marcada como impressa.');
      recarregarProducao();
    } catch (e) { toast.erro(e.message); }
  }

  function onEnviado(item) {
    setEnviandoItem(null);
    setProducao((lista) => lista.filter((it) => it.id !== item.id));
  }

  async function excluir(item) {
    const aviso = item.produzido
      ? `Excluir o pedido ${item.numeroPedido}? O estoque descontado por este item será devolvido.`
      : `Excluir o pedido ${item.numeroPedido}?`;
    if (!window.confirm(aviso)) return;
    try {
      await api.del(`/producao/${item.id}`);
      toast.sucesso('Pedido excluído.');
      setProducao((lista) => lista.filter((it) => it.id !== item.id));
    } catch (e) { toast.erro(e.message); }
  }

  if (!d) return <p className="text-grafite-800/60">Carregando...</p>;

  const itensAProduzir = producao.filter((it) => it.fase !== 'AGUARDANDO_ENVIO');
  const itensAguardandoEnvio = producao.filter((it) => it.fase === 'AGUARDANDO_ENVIO');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-extrabold text-grafite-900">Visão geral</h1>
        <p className="text-grafite-800/60 mt-1">Visão geral do estoque e da produção</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Estatistica titulo="Disponível banco Cora" valor={moeda(d.saldoDisponivel)} cor="text-green-700" destaque />
        <Estatistica titulo="Lucro acumulado" valor={moeda(d.lucroAcumulado)} cor="text-marca-600" />
        <Estatistica titulo="Materiais cadastrados" valor={d.materiaisCadastrados} />
        <Estatistica titulo="Estoque baixo" valor={d.materiaisBaixo} cor={d.materiaisBaixo > 0 ? 'text-marca-600' : 'text-grafite-900'} />
        <Estatistica titulo="Sem estoque" valor={d.materiaisSemEstoque} cor={d.materiaisSemEstoque > 0 ? 'text-red-600' : 'text-grafite-900'} />
        <Estatistica titulo="Produtos cadastrados" valor={d.produtosCadastrados} />
        <Estatistica titulo="Custo materiais no mês" valor={moeda(d.custoMateriaisMes)} />
        <Estatistica titulo="Produtos enviados no mês" valor={numero(d.produtosEnviadosMes)} />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <Atalho to="/entradas" label="Registrar entrada" icone="M12 5v14M5 12l7 7 7-7" />
        <Atalho to="/envios" label="Registrar envio" icone="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        <Atalho to="/produtos" label="Cadastrar produto" icone="M12 5v14M5 12h14" />
        <Atalho to="/materiais" label="Cadastrar material" icone="M12 5v14M5 12h14" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <SecaoAProduzir itens={itensAProduzir} onProduzir={produzir} onMarcarFoto={marcarFoto} onEmbalar={embalar} onNovoPedido={() => setModalPedidoManual(true)} onEditar={setPedidoEditando} onExcluir={excluir} />
        <SecaoAguardandoEnvio itens={itensAguardandoEnvio} onEnviar={setEnviandoItem} onEditar={setPedidoEditando} onExcluir={excluir} />

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-grafite-900">Materiais mais urgentes</h2>
            <Link to="/lista-compras" className="text-xs font-semibold text-marca-600 hover:text-marca-700">Ver lista →</Link>
          </div>
          {d.urgentes.length === 0 ? <p className="text-sm text-grafite-800/40 py-4 text-center">Nenhum material urgente.</p> : (
            <table className="w-full">
              <tbody>
                {d.urgentes.map((m) => (
                  <tr key={m.id}>
                    <td className="td font-medium">{m.nome}</td>
                    <td className="td text-right tabular-nums">{numero(m.quantidade)} {m.unidade}</td>
                    <td className="td text-right"><span className={`badge ${m.situacao === 'SEM_ESTOQUE' ? 'badge-sem' : 'badge-baixo'}`}>{m.situacao === 'SEM_ESTOQUE' ? 'Sem estoque' : 'Baixo'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h2 className="font-display font-bold text-grafite-900 mb-4">Últimas movimentações</h2>
          {d.ultimasMovimentacoes.length === 0 ? <p className="text-sm text-grafite-800/40 py-4 text-center">Nenhuma movimentação.</p> : (
            <table className="w-full">
              <tbody>
                {d.ultimasMovimentacoes.map((m) => (
                  <tr key={m.id}>
                    <td className="td font-medium">{m.material.nome}</td>
                    <td className="td text-xs text-grafite-800/50">{m.tipo}</td>
                    <td className="td text-right tabular-nums">{numero(m.quantidadeMovimentada)} {m.material.unidade.sigla}</td>
                    <td className="td text-right text-xs text-grafite-800/40">{dataHora(m.criadoEm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-grafite-900">Últimos envios</h2>
            <Link to="/historico-envios" className="text-xs font-semibold text-marca-600 hover:text-marca-700">Ver histórico →</Link>
          </div>
          {d.ultimosEnvios.length === 0 ? <p className="text-sm text-grafite-800/40 py-4 text-center">Nenhum envio registrado.</p> : (
            <table className="w-full">
              <tbody>
                {d.ultimosEnvios.map((e) => (
                  <tr key={e.id}>
                    <td className="td tabular-nums text-grafite-800/70">{data(e.dataEnvio)}</td>
                    <td className="td">{e.itens.map((i) => `${numero(i.quantidade)}x ${i.produto.nome}`).join(', ')}</td>
                    <td className="td text-right font-medium tabular-nums">{moeda(e.custoTotalMateriais)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalPedidoManual && (
        <ModalPedidoManual
          plataformas={plataformas}
          produtos={produtos}
          onClose={() => setModalPedidoManual(false)}
          onSalvo={() => { setModalPedidoManual(false); recarregarProducao(); }}
        />
      )}

      {pedidoEditando && (
        <ModalEditarPedido
          item={pedidoEditando}
          produtos={produtos}
          plataformas={plataformas}
          onClose={() => setPedidoEditando(null)}
          onSalvo={() => { setPedidoEditando(null); recarregarProducao(); }}
        />
      )}

      {enviandoItem && (
        <ModalEnviar
          item={enviandoItem}
          onClose={() => setEnviandoItem(null)}
          onEnviado={onEnviado}
        />
      )}
    </div>
  );
}
