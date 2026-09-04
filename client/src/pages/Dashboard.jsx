import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { moeda, numero, dataHora, data, diaISO } from '../format';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import SeletorEmbalagens, { linhasEmbalagemPayload } from '../components/SeletorEmbalagens';

function Estatistica({ titulo, valor, cor = 'text-grafite-900', destaque = false, sub = null }) {
  return (
    <div className={`card !p-4 relative overflow-hidden ${destaque ? 'ring-1 ring-marca-200' : ''}`}>
      {destaque && <div className="absolute left-0 top-0 bottom-0 w-1 bg-marca-500" />}
      <div className="text-xs font-medium text-grafite-800/60 uppercase tracking-wide">{titulo}</div>
      <div className={`text-2xl font-display font-bold mt-1.5 ${cor}`}>{valor}</div>
      {sub && <div className="text-xs text-grafite-800/50 mt-1">{sub}</div>}
    </div>
  );
}

// Intervalo de datas (YYYY-MM-DD) de um preset de período para o filtro dos cards de resumo.
function rangeDoPreset(preset) {
  const iso = (dt) => dt.toISOString().slice(0, 10);
  const hoje = new Date();
  const y = hoje.getFullYear(), m = hoje.getMonth();
  if (preset === 'hoje') return { de: iso(hoje), ate: iso(hoje) };
  if (preset === '7d') { const d = new Date(hoje); d.setDate(d.getDate() - 6); return { de: iso(d), ate: iso(hoje) }; }
  if (preset === 'mespassado') return { de: iso(new Date(y, m - 1, 1)), ate: iso(new Date(y, m, 0)) };
  if (preset === 'ano') return { de: iso(new Date(y, 0, 1)), ate: iso(hoje) };
  if (preset === 'tudo') return { de: '', ate: '' };
  return { de: iso(new Date(y, m, 1)), ate: iso(hoje) }; // 'mes' (padrão)
}
const PRESETS = [
  { v: 'hoje', l: 'Hoje' },
  { v: '7d', l: '7 dias' },
  { v: 'mes', l: 'Este mês' },
  { v: 'mespassado', l: 'Mês passado' },
  { v: 'ano', l: 'Este ano' },
  { v: 'tudo', l: 'Tudo' },
];

// Título de bloco com destaque (fonte grande + barrinha da marca).
function TituloBloco({ children, className = '' }) {
  return (
    <h2 className={`text-2xl font-display font-extrabold text-grafite-900 flex items-center gap-2 ${className}`}>
      <span className="inline-block w-1.5 h-6 rounded-full bg-marca-500 shrink-0" />{children}
    </h2>
  );
}

// Lista de afazeres do Dashboard (checklist): adicionar, marcar feito, editar e excluir.
function NotasCard() {
  const [tarefas, setTarefas] = useState([]);
  const [novo, setNovo] = useState('');
  const [editId, setEditId] = useState(null);
  const [editTexto, setEditTexto] = useState('');
  const toast = useToast();

  function carregar() { api.get('/tarefas').then(setTarefas).catch(() => {}); }
  useEffect(() => { carregar(); }, []);

  async function adicionar() {
    const texto = novo.trim();
    if (!texto) return;
    try {
      const t = await api.post('/tarefas', { texto });
      setTarefas((l) => [...l, t]);
      setNovo('');
    } catch (e) { toast.erro(e.message); }
  }

  async function alternar(t) {
    try {
      const at = await api.put(`/tarefas/${t.id}`, { feito: !t.feito });
      setTarefas((l) => l.map((x) => (x.id === t.id ? at : x)));
    } catch (e) { toast.erro(e.message); }
  }

  async function salvarEdicao(t) {
    const texto = editTexto.trim();
    if (!texto) { setEditId(null); return; }
    try {
      const at = await api.put(`/tarefas/${t.id}`, { texto });
      setTarefas((l) => l.map((x) => (x.id === t.id ? at : x)));
      setEditId(null);
    } catch (e) { toast.erro(e.message); }
  }

  async function excluir(t) {
    try {
      await api.del(`/tarefas/${t.id}`);
      setTarefas((l) => l.filter((x) => x.id !== t.id));
    } catch (e) { toast.erro(e.message); }
  }

  const pendentes = tarefas.filter((t) => !t.feito).length;

  return (
    <div className="card lg:col-span-2">
      <div className="flex items-center justify-between mb-3">
        <TituloBloco>📝 Afazeres</TituloBloco>
        {pendentes > 0 && <span className="text-xs text-grafite-800/40">{pendentes} pendente{pendentes > 1 ? 's' : ''}</span>}
      </div>

      <div className="flex gap-2 mb-3">
        <input
          className="input flex-1"
          placeholder="Novo afazer… (Enter para adicionar)"
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') adicionar(); }}
        />
        <button className="btn btn-primary" onClick={adicionar}>+ Adicionar</button>
      </div>

      {tarefas.length === 0 ? (
        <p className="text-sm text-grafite-800/40 py-2 text-center">Nenhum afazer. Adicione um acima. 👆</p>
      ) : (
        <ul className="space-y-1">
          {tarefas.map((t) => (
            <li key={t.id} className="flex items-center gap-2 group">
              <input type="checkbox" checked={t.feito} onChange={() => alternar(t)} className="shrink-0" />
              {editId === t.id ? (
                <input
                  className="input flex-1 !py-1"
                  value={editTexto}
                  autoFocus
                  onChange={(e) => setEditTexto(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') salvarEdicao(t); if (e.key === 'Escape') setEditId(null); }}
                  onBlur={() => salvarEdicao(t)}
                />
              ) : (
                <span
                  className={`flex-1 text-sm cursor-pointer ${t.feito ? 'line-through text-grafite-800/40' : 'text-grafite-800/80'}`}
                  onClick={() => { setEditId(t.id); setEditTexto(t.texto); }}
                  title="Clique para editar"
                >
                  {t.texto}
                </span>
              )}
              <button title="Editar" onClick={() => { setEditId(t.id); setEditTexto(t.texto); }} className="p-1 rounded text-grafite-800/30 hover:text-marca-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
              </button>
              <button title="Excluir" onClick={() => excluir(t)} className="p-1 rounded text-grafite-800/30 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H6a1 1 0 01-1-1V6" /></svg>
              </button>
            </li>
          ))}
        </ul>
      )}
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

// O prazo da Shopee costuma ser o instante-limite (ex.: 15/08 00:00 = "envie até o fim do dia 14/08").
// Recuamos 1 segundo antes de pegar o dia, pra bater com o dia que a própria Shopee mostra.
function diaDoPrazo(prazoEnvio) {
  return diaISO(new Date(new Date(prazoEnvio).getTime() - 1000), 'America/Sao_Paulo');
}

function rotuloPrazo(prazoEnvio) {
  if (!prazoEnvio) return 'Sem prazo definido';
  const hoje = new Date(diaISO(new Date(), 'America/Sao_Paulo') + 'T00:00:00');
  const d = new Date(diaDoPrazo(prazoEnvio) + 'T00:00:00');
  const diffDias = Math.round((d - hoje) / 86400000);
  if (diffDias < 0) return 'Atrasado';
  if (diffDias === 0) return 'Hoje';
  if (diffDias === 1) return 'Amanhã';
  const [y, m, dd] = diaDoPrazo(prazoEnvio).split('-');
  return `${dd}/${m}/${y}`;
}

function ehAtrasado(prazoEnvio) {
  return !!prazoEnvio && rotuloPrazo(prazoEnvio) === 'Atrasado';
}

// Mostra a data do prazo de um pedido; em vermelho e com aviso quando está atrasado.
function PrazoPedido({ prazoEnvio }) {
  if (!prazoEnvio) return <span className="text-xs text-grafite-800/40">Sem prazo</span>;
  const atrasado = ehAtrasado(prazoEnvio);
  const [y, m, dd] = diaDoPrazo(prazoEnvio).split('-');
  return (
    <span className={`text-xs whitespace-nowrap ${atrasado ? 'text-red-600 font-semibold' : 'text-grafite-800/50'}`}>
      {atrasado ? '⚠️ Atrasado · ' : 'Prazo '}{`${dd}/${m}/${y}`}
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

// Agrupa itens pelo pedido (mesmo número de pedido = mesmo bloco).
function agruparPorPedido(itens) {
  const grupos = new Map();
  for (const it of itens) {
    const k = it.pedidoId != null ? 'ped' + it.pedidoId : 'item' + it.id;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(it);
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

const ROTULO_FOTO = {
  IMPRESSA: { txt: '📷 Foto impressa', cls: 'bg-green-50 text-green-700 border-green-200' },
  SEM_FOTO: { txt: 'Sem foto', cls: 'bg-base-100 text-grafite-800/60 border-grafite-900/10' },
  CLIENTE_NAO_ENVIOU: { txt: '⚠️ Cliente não enviou', cls: 'bg-red-50 text-red-600 border-red-200' },
};
// Botão/etiqueta da situação da foto do cliente. Abre o card de opções ao clicar.
function BotaoFoto({ it, onFoto }) {
  const info = it.fotoStatus ? ROTULO_FOTO[it.fotoStatus] : { txt: '📷 Definir foto', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return (
    <button onClick={() => onFoto(it)} className={`text-xs border rounded-full px-2 py-0.5 font-medium hover:opacity-80 ${info.cls}`}>
      {info.txt}
    </button>
  );
}

function SecaoAProduzir({ itens, onProduzir, onFinalizar, onEmbalar, onNovoPedido, onEditar, onExcluir, onCapa, onPaginas, onDesfazerPaginas, onFoto, onEtiqueta, onDesfazerProduzir, onDesfazerFinalizar, onDesfazerEtiqueta }) {
  const grupos = agruparPorPrazo(itens);
  return (
    <div className="card lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <TituloBloco>Produção</TituloBloco>
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
              <div className="space-y-2">
                {[...agruparPorPedido(lista).values()].map((itensPedido) => {
                  const cab = itensPedido[0];
                  return (
                    <div key={cab.pedidoId ?? cab.id} className="rounded-lg border border-grafite-900/10 overflow-hidden">
                      {/* Cabeçalho do pedido (mostrado uma vez) */}
                      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-base-100 border-b border-grafite-900/5">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="badge badge-baixo">{cab.plataformaNome}</span>
                          <span className="text-xs text-grafite-800/50 truncate">{cab.numeroPedido}</span>
                          {itensPedido.length > 1 && <span className="text-[10px] text-grafite-800/40">· {itensPedido.length} itens</span>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <PrazoPedido prazoEnvio={cab.prazoEnvio} />
                          {onDesfazerEtiqueta && (
                            <button type="button" className="text-xs text-grafite-800/40 hover:text-marca-600 px-1" title="Voltar para Programação de envio (desfazer etiqueta)" onClick={() => onDesfazerEtiqueta(cab.pedidoId)}>↩</button>
                          )}
                        </div>
                      </div>
                      {cab.observacao && (
                        <div className="px-3 pt-2">
                          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 inline-block max-w-full whitespace-pre-wrap">📝 {cab.observacao}</span>
                        </div>
                      )}
                      {/* Itens do pedido */}
                      {itensPedido.map((it) => (
                        <div key={it.id} className="flex items-start justify-between gap-3 px-3 py-2 border-b last:border-b-0 border-grafite-900/5">
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className={it.semVinculo ? 'text-grafite-800/40 italic' : 'font-medium'}>
                              {it.semVinculo ? it.nomePlataforma : it.produtoNome} × {numero(it.quantidade)}
                              {it.producaoEstendida && <span className="badge badge-sem ml-2">⏱️ Produção estendida</span>}
                            </span>
                            <div className="flex items-center gap-3 flex-wrap">
                              {/* Etiqueta impressa (não desconta estoque; baixada na embalagem) */}
                              {!it.semVinculo && (
                                <label className={chkCls(true)}>
                                  <input type="checkbox" checked={it.etiquetaImpressa} onChange={() => onEtiqueta(it)} />
                                  Etiqueta impressa
                                </label>
                              )}

                              {/* Situação da foto (card) — produtos com foto do cliente */}
                              {it.personalizado && !it.semVinculo && (
                                <BotaoFoto it={it} onFoto={onFoto} />
                              )}

                              {/* Produção: álbum (capa + páginas) OU produção normal */}
                              {it.album ? (
                                <>
                                  <label className={chkCls(!it.finalizado && !it.semVinculo)}>
                                    <input type="checkbox" checked={it.capaFeita} disabled={it.finalizado || it.semVinculo}
                                      onChange={() => onCapa(it)} />
                                    Capa
                                  </label>
                                  <label className={chkCls(!it.paginasFeitas && !it.semVinculo)} title={it.paginaFilamentoNome ? `Filamento: ${it.paginaFilamentoNome}` : ''}>
                                    <input type="checkbox" checked={it.paginasFeitas} disabled={it.semVinculo || it.finalizado}
                                      onChange={() => it.paginasFeitas ? onDesfazerPaginas(it) : onPaginas(it)} />
                                    Páginas{it.paginasFeitas && it.paginaFilamentoNome ? ` (${it.paginaFilamentoNome})` : ''}
                                  </label>
                                </>
                              ) : (
                                <label className={chkCls((!it.produzido && !it.cobertoPorEstoque && !it.semVinculo && it.estoqueSuficiente) || (it.produzido && !it.finalizado))}>
                                  <input
                                    type="checkbox"
                                    checked={it.produzido || it.cobertoPorEstoque}
                                    disabled={it.semVinculo || it.cobertoPorEstoque || (!it.produzido && !it.estoqueSuficiente) || (it.produzido && it.finalizado)}
                                    onChange={() => it.produzido ? onDesfazerProduzir(it) : onProduzir(it)}
                                    title={it.produzido && it.finalizado ? 'Desfaça o "Finalizado" antes' : (it.produzido ? 'Clique para desmarcar' : '')}
                                  />
                                  {it.cobertoPorEstoque && !it.produzido ? 'Produzido (do estoque)' : 'Produzido'}
                                </label>
                              )}

                              {(() => {
                                const producaoOk = it.album ? (it.capaFeita && it.paginasFeitas) : (it.produzido || it.cobertoPorEstoque);
                                const fotoOk = !it.personalizado || !!it.fotoStatus;
                                const podeFinalizar = !it.finalizado && !it.semVinculo && producaoOk && fotoOk;
                                const podeDesfazer = it.finalizado && !it.embalado;
                                return (
                                  <label className={chkCls(podeFinalizar || podeDesfazer)}>
                                    <input type="checkbox" checked={it.finalizado} disabled={!podeFinalizar && !podeDesfazer}
                                      onChange={() => it.finalizado ? onDesfazerFinalizar(it) : onFinalizar(it)}
                                      title={it.finalizado ? 'Clique para desmarcar' : ''} />
                                    Finalizado
                                  </label>
                                );
                              })()}

                              <label className={chkCls(!it.embalado && !it.semVinculo && it.finalizado)}>
                                <input
                                  type="checkbox"
                                  checked={it.embalado}
                                  disabled={it.embalado || it.semVinculo || !it.finalizado}
                                  onChange={() => onEmbalar(it)}
                                />
                                Embalado
                              </label>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {it.semVinculo ? (
                              <span className="badge badge-sem">Sem vínculo (SKU {it.skuPlataforma})</span>
                            ) : it.produzido ? (
                              <span className="badge badge-normal">✓ Produzido</span>
                            ) : it.cobertoPorEstoque ? (
                              <span className="badge badge-normal" title={`${numero(it.estoqueProduto)} em estoque`}>✓ Tem estoque</span>
                            ) : !it.estoqueSuficiente ? (
                              <span className="badge badge-sem">Faltam materiais</span>
                            ) : (
                              <span className="badge badge-baixo">Produzir</span>
                            )}
                            <AcoesLinha onEditar={() => onEditar(it)} onExcluir={() => onExcluir(it)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SecaoAguardandoEnvio({ itens, onEnviarPedido, onEditar, onExcluir }) {
  const grupos = agruparPorPrazo(itens);
  return (
    <div className="card lg:col-span-2">
      <TituloBloco className="mb-4">Aguardando envio</TituloBloco>
      {itens.length === 0 ? (
        <p className="text-sm text-grafite-800/40 py-4 text-center">Nada aguardando envio.</p>
      ) : (
        <div className="space-y-4">
          {[...grupos.entries()].map(([rotulo, lista]) => (
            <div key={rotulo}>
              <div className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${rotulo === 'Atrasado' ? 'text-red-600' : 'text-grafite-800/50'}`}>{rotulo}</div>
              <div className="space-y-2">
                {[...agruparPorPedido(lista).values()].map((itensPedido) => {
                  const cab = itensPedido[0];
                  return (
                    <div key={cab.pedidoId ?? cab.id} className="rounded-lg border border-grafite-900/10 overflow-hidden">
                      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-base-100 border-b border-grafite-900/5">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="badge badge-baixo">{cab.plataformaNome}</span>
                          <span className="text-xs text-grafite-800/50 truncate">{cab.numeroPedido}</span>
                          {itensPedido.length > 1 && <span className="text-[10px] text-grafite-800/40">· {itensPedido.length} itens</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <PrazoPedido prazoEnvio={cab.prazoEnvio} />
                          <button className="btn btn-primary btn-sm whitespace-nowrap" onClick={() => onEnviarPedido(itensPedido)}>Enviar pedido</button>
                        </div>
                      </div>
                      {cab.observacao && (
                        <div className="px-3 pt-2">
                          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 inline-block max-w-full whitespace-pre-wrap">📝 {cab.observacao}</span>
                        </div>
                      )}
                      {itensPedido.map((it) => (
                        <div key={it.id} className="flex items-center justify-between gap-3 px-3 py-2 border-b last:border-b-0 border-grafite-900/5">
                          <span className="font-medium truncate min-w-0">{it.produtoNome} × {numero(it.quantidade)}</span>
                          <AcoesLinha onEditar={() => onEditar(it)} onExcluir={() => onExcluir(it)} />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
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
function ModalEnviar({ pedido, onClose, onEnviado }) {
  const [embalagens, setEmbalagens] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();

  const cab = pedido[0];

  async function confirmar() {
    const embs = linhasEmbalagemPayload(embalagens);
    if (embs.length === 0) return toast.erro('Selecione a embalagem usada no envio.');
    setSalvando(true);
    try {
      await api.post(`/producao/pedido/${cab.pedidoId}/enviar`, { embalagens: embs });
      toast.sucesso(`Pedido ${cab.numeroPedido} marcado como enviado.`);
      onEnviado(pedido);
    } catch (e) { toast.erro(e.message); }
    setSalvando(false);
  }

  return (
    <Modal titulo="Marcar pedido como enviado" onClose={onClose} largura="max-w-lg">
      <div className="text-sm text-grafite-800/70 mb-3">
        <div className="mb-1">Pedido <span className="font-medium">{cab.numeroPedido}</span> — {cab.plataformaNome}</div>
        <ul className="list-disc pl-5 text-grafite-800/80">
          {pedido.map((it) => <li key={it.id}>{it.produtoNome} × {numero(it.quantidade)}</li>)}
        </ul>
        <p className="text-xs text-grafite-800/50 mt-2">Selecione a embalagem usada — uma única embalagem para o pedido inteiro.</p>
      </div>
      <SeletorEmbalagens linhas={embalagens} setLinhas={setEmbalagens} />
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={confirmar} disabled={salvando}>{salvando ? 'Enviando...' : 'Confirmar envio'}</button>
      </div>
    </Modal>
  );
}

// Etapa do pipeline com seleção múltipla (Emissão de notas / Programação de envio).
// `grupos` = lista de pedidos (cada um é um array de itens do mesmo pedido).
function SecaoLote({ titulo, ajuda, grupos, botaoLabel, onExecutar, onDesfazer, desfazerLabel }) {
  const [sel, setSel] = useState(() => new Set());
  const ids = grupos.map((g) => g[0].pedidoId);
  const allSel = ids.length > 0 && ids.every((id) => sel.has(id));
  const nSel = ids.filter((id) => sel.has(id)).length;
  function toggle(id) { setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleAll() { setSel(allSel ? new Set() : new Set(ids)); }
  function exec() { const arr = ids.filter((id) => sel.has(id)); if (!arr.length) return; onExecutar(arr); setSel(new Set()); }

  return (
    <div className="card lg:col-span-2">
      <div className="flex items-center justify-between gap-3 mb-1">
        <TituloBloco>{titulo}</TituloBloco>
        <span className="badge badge-baixo">{grupos.length}</span>
      </div>
      {ajuda && <p className="text-xs text-grafite-800/50 mb-3">{ajuda}</p>}
      {grupos.length === 0 ? (
        <p className="text-sm text-grafite-800/40 py-3 text-center">Nenhum pedido nesta etapa.</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="flex items-center gap-2 text-xs text-grafite-800/60 cursor-pointer">
              <input type="checkbox" checked={allSel} onChange={toggleAll} /> Selecionar todos
            </label>
            <button className="btn btn-primary btn-sm" disabled={nSel === 0} onClick={exec}>
              {botaoLabel}{nSel > 0 ? ` (${nSel})` : ''}
            </button>
          </div>
          <div className="space-y-2">
            {grupos.map((itensPedido) => {
              const cab = itensPedido[0];
              const checked = sel.has(cab.pedidoId);
              return (
                <div key={cab.pedidoId} className={`rounded-lg border overflow-hidden ${checked ? 'border-marca-400 ring-1 ring-marca-200' : 'border-grafite-900/10'}`}>
                  <label className="flex items-center gap-2 px-3 py-1.5 bg-base-100 border-b border-grafite-900/5 cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={() => toggle(cab.pedidoId)} />
                    <span className="badge badge-baixo">{cab.plataformaNome}</span>
                    <span className="text-xs text-grafite-800/50 truncate flex-1">{cab.numeroPedido}</span>
                    <PrazoPedido prazoEnvio={cab.prazoEnvio} />
                    {onDesfazer && (
                      <button type="button" className="text-xs text-grafite-800/40 hover:text-marca-600 ml-1 px-1" title={desfazerLabel} onClick={(e) => { e.preventDefault(); onDesfazer(cab.pedidoId); }}>↩</button>
                    )}
                  </label>
                  <div className="px-3 py-1.5">
                    {itensPedido.map((it) => (
                      <div key={it.id} className="text-sm text-grafite-800/80">{(it.semVinculo ? it.nomePlataforma : it.produtoNome)} × {numero(it.quantidade)}</div>
                    ))}
                    {cab.observacao && <div className="text-xs text-amber-700 mt-1 whitespace-pre-wrap">📝 {cab.observacao}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Modal para escolher o filamento usado nas páginas do álbum (desconta os gramas configurados).
function ModalPaginas({ item, filamentos, onClose, onConfirmar }) {
  const [filamentoId, setFilamentoId] = useState('');
  const gramasTotal = (Number(item.paginaGramas) || 0) * (Number(item.quantidade) || 1);
  return (
    <Modal titulo="Páginas do álbum" onClose={onClose} largura="max-w-md">
      <p className="text-sm text-grafite-800/70 mb-3">
        <span className="font-medium">{item.produtoNome} × {numero(item.quantidade)}</span> — pedido {item.numeroPedido}
      </p>
      <div className="space-y-3">
        <div>
          <label className="label">Filamento usado nas páginas *</label>
          <select className="input" value={filamentoId} onChange={(e) => setFilamentoId(e.target.value)} autoFocus>
            <option value="">Selecione (branca, marmorizada…)</option>
            {filamentos.map((f) => <option key={f.id} value={f.id}>{f.nome} — {numero(f.quantidade)}g em estoque</option>)}
          </select>
        </div>
        <p className="text-xs text-grafite-800/50">
          {gramasTotal > 0
            ? <>Serão descontados <b>{numero(gramasTotal)}g</b> do filamento escolhido ({numero(item.paginaGramas)}g × {numero(item.quantidade)}).</>
            : <>⚠️ Este produto está com <b>0g de página</b> configurado. Nenhum grama será descontado — ajuste na ficha do produto se quiser.</>}
        </p>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!filamentoId} onClick={() => onConfirmar(item, filamentoId)}>Confirmar páginas</button>
      </div>
    </Modal>
  );
}

// Modal para definir a situação da foto do cliente.
function ModalFoto({ item, onClose, onDefinir }) {
  const opcoes = [
    { v: 'IMPRESSA', l: '📷 Foto impressa', d: 'A foto do cliente foi impressa.' },
    { v: 'SEM_FOTO', l: 'Pedido sem foto', d: 'Este pedido não leva foto.' },
    { v: 'CLIENTE_NAO_ENVIOU', l: '⚠️ Cliente não enviou a foto', d: 'Aguardando/sem foto do cliente.' },
  ];
  return (
    <Modal titulo="Situação da foto" onClose={onClose} largura="max-w-md">
      <p className="text-sm text-grafite-800/70 mb-3">
        <span className="font-medium">{item.produtoNome} × {numero(item.quantidade)}</span> — pedido {item.numeroPedido}
      </p>
      <div className="space-y-2">
        {opcoes.map((o) => (
          <button key={o.v} onClick={() => onDefinir(item, o.v)}
            className={`w-full text-left border rounded-lg px-3 py-2 hover:border-marca-400 transition-colors ${item.fotoStatus === o.v ? 'border-marca-500 bg-marca-50' : 'border-grafite-900/10'}`}>
            <div className="font-medium text-sm text-grafite-900">{o.l}</div>
            <div className="text-xs text-grafite-800/50">{o.d}</div>
          </button>
        ))}
      </div>
      {item.fotoStatus && (
        <button className="btn btn-ghost btn-sm text-grafite-800/50 mt-3" onClick={() => onDefinir(item, '')}>Limpar situação</button>
      )}
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
  const [enviandoPedido, setEnviandoPedido] = useState(null);
  const [filamentos, setFilamentos] = useState([]);
  const [paginasModal, setPaginasModal] = useState(null); // item do álbum p/ escolher filamento das páginas
  const [fotoModal, setFotoModal] = useState(null); // item p/ definir situação da foto
  const [preset, setPreset] = useState('mes'); // filtro de período dos cards de resumo
  const [filtroDe, setFiltroDe] = useState(() => rangeDoPreset('mes').de);
  const [filtroAte, setFiltroAte] = useState(() => rangeDoPreset('mes').ate);
  const toast = useToast();

  function recarregarProducao() { api.get('/producao').then(setProducao).catch(() => {}); }

  function aplicarPreset(p) {
    setPreset(p);
    if (p !== 'custom') { const r = rangeDoPreset(p); setFiltroDe(r.de); setFiltroAte(r.ate); }
  }

  useEffect(() => {
    const qs = [];
    if (filtroDe) qs.push('de=' + filtroDe);
    if (filtroAte) qs.push('ate=' + filtroAte);
    api.get('/dashboard' + (qs.length ? '?' + qs.join('&') : '')).then(setD).catch(() => {});
  }, [filtroDe, filtroAte]);
  useEffect(() => { recarregarProducao(); }, []);
  useEffect(() => {
    api.get('/plataformas?ativo=true').then(setPlataformas).catch(() => {});
    api.get('/produtos?ativo=true').then(setProdutos).catch(() => {});
    api.get('/materiais?ativo=true').then((ms) => setFilamentos(ms.filter((m) => m.filamento))).catch(() => {});
  }, []);

  async function marcarCapa(item) {
    try {
      await api.post(`/producao/${item.id}/capa`, { feita: !item.capaFeita });
      recarregarProducao();
    } catch (e) { toast.erro(e.message); }
  }

  async function confirmarPaginas(item, filamentoId) {
    try {
      await api.post(`/producao/${item.id}/paginas`, { filamentoId: Number(filamentoId) });
      toast.sucesso('Páginas registradas e filamento descontado.');
      setPaginasModal(null);
      recarregarProducao();
    } catch (e) { toast.erro(e.message); }
  }

  async function desfazerPaginas(item) {
    try {
      await api.post(`/producao/${item.id}/paginas/desfazer`, {});
      recarregarProducao();
    } catch (e) { toast.erro(e.message); }
  }

  async function definirFoto(item, status) {
    try {
      await api.post(`/producao/${item.id}/foto`, { status });
      setFotoModal(null);
      recarregarProducao();
    } catch (e) { toast.erro(e.message); }
  }

  async function marcarEtiqueta(item) {
    try {
      await api.post(`/producao/${item.id}/etiqueta`, { impressa: !item.etiquetaImpressa });
      recarregarProducao();
    } catch (e) { toast.erro(e.message); }
  }

  async function desfazerProduzir(item) {
    try {
      await api.post(`/producao/${item.id}/desfazer`, {});
      toast.sucesso('Produção desfeita (material estornado).');
      recarregarProducao();
    } catch (e) { toast.erro(e.message); }
  }

  async function desfazerFinalizar(item) {
    try {
      await api.post(`/producao/${item.id}/finalizar/desfazer`, {});
      recarregarProducao();
    } catch (e) { toast.erro(e.message); }
  }

  async function emitirNotasLote(ids) {
    try {
      const r = await api.post('/producao/lote/notas', { pedidoIds: ids });
      toast.sucesso(`${r.processados} nota(s) emitida(s).`);
      recarregarProducao();
    } catch (e) { toast.erro(e.message); }
  }
  async function gerarEtiquetasLote(ids) {
    try {
      const r = await api.post('/producao/lote/etiquetas', { pedidoIds: ids });
      toast.sucesso(`${r.processados} etiqueta(s) gerada(s).`);
      recarregarProducao();
    } catch (e) { toast.erro(e.message); }
  }
  async function desfazerNota(pedidoId) {
    try { await api.post(`/producao/pedido/${pedidoId}/nota/desfazer`, {}); recarregarProducao(); }
    catch (e) { toast.erro(e.message); }
  }
  async function desfazerEtiqueta(pedidoId) {
    try { await api.post(`/producao/pedido/${pedidoId}/etiqueta/desfazer`, {}); recarregarProducao(); }
    catch (e) { toast.erro(e.message); }
  }

  async function produzir(item) {
    try {
      await api.post(`/producao/${item.id}/produzir`, {});
      toast.sucesso(`${item.produtoNome || item.nomePlataforma} marcado como produzido.`);
      recarregarProducao();
    } catch (e) { toast.erro(e.message); }
  }

  async function finalizar(item) {
    try {
      await api.post(`/producao/${item.id}/finalizar`, {});
      toast.sucesso(`${item.produtoNome} finalizado.`);
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

  function onEnviado(pedido) {
    setEnviandoPedido(null);
    const idsEnviados = new Set(pedido.map((it) => it.id));
    setProducao((lista) => lista.filter((it) => !idsEnviados.has(it.id)));
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

  // Pipeline: Emissão de nota -> Programação de envio (etiqueta) -> Produção. Cada etapa libera a próxima.
  const gruposPipeline = [...agruparPorPedido(producao).values()];
  const gruposEmissao = gruposPipeline.filter((g) => !g[0].notaEmitida);
  const gruposProgramacao = gruposPipeline.filter((g) => g[0].notaEmitida && !g[0].etiquetaGerada);
  const emProducao = producao.filter((it) => it.notaEmitida && it.etiquetaGerada);
  const itensAProduzir = emProducao.filter((it) => it.fase !== 'AGUARDANDO_ENVIO');
  const itensAguardandoEnvio = emProducao.filter((it) => it.fase === 'AGUARDANDO_ENVIO');

  // Contagem de PEDIDOS a enviar (pelo número do pedido, não por SKU). Itens de SKUs
  // diferentes que pertencem ao mesmo número de pedido contam como um único pedido.
  const pedidosMap = new Map();
  for (const it of producao) {
    const chave = it.numeroPedido || `__item_${it.id}`; // item sem número conta como pedido próprio
    if (!pedidosMap.has(chave)) pedidosMap.set(chave, []);
    pedidosMap.get(chave).push(it);
  }
  const totalAEnviar = pedidosMap.size;
  let qtdAProduzir = 0, qtdComEstoque = 0;
  for (const itens of pedidosMap.values()) {
    // Pedido precisa produzir se algum de seus itens ainda não foi produzido nem coberto por estoque.
    if (itens.some((it) => !it.cobertoPorEstoque && !it.produzido)) qtdAProduzir++;
    else qtdComEstoque++;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-extrabold text-grafite-900">Visão geral</h1>
        <p className="text-grafite-800/60 mt-1">Visão geral do estoque e da produção</p>
      </div>

      {/* Situação atual (sem filtro de data — são saldos/contagens do momento) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Estatistica titulo="Pedidos a enviar" valor={totalAEnviar} cor="text-marca-600" destaque sub={`${qtdAProduzir} a produzir · ${qtdComEstoque} com estoque`} />
        <Estatistica titulo="Disponível banco Cora" valor={moeda(d.saldoDisponivel)} cor="text-green-700" destaque />
        <Estatistica titulo="Lucro acumulado" valor={moeda(d.lucroAcumulado)} cor="text-marca-600" />
        <Estatistica titulo="Produtos cadastrados" valor={d.produtosCadastrados} />
        <Estatistica titulo="Materiais cadastrados" valor={d.materiaisCadastrados} />
        <Estatistica titulo="Estoque baixo" valor={d.materiaisBaixo} cor={d.materiaisBaixo > 0 ? 'text-marca-600' : 'text-grafite-900'} />
        <Estatistica titulo="Sem estoque" valor={d.materiaisSemEstoque} cor={d.materiaisSemEstoque > 0 ? 'text-red-600' : 'text-grafite-900'} />
      </div>

      {/* Resumo do período (com filtro de data) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <TituloBloco>Resumo do período</TituloBloco>
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.v} onClick={() => aplicarPreset(p.v)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${preset === p.v ? 'bg-marca-500 text-white border-marca-500' : 'border-grafite-900/15 text-grafite-800/60 hover:border-marca-300'}`}>
              {p.l}
            </button>
          ))}
          <div className="flex items-center gap-1 ml-1">
            <input type="date" className="input !py-1 !px-2 text-xs w-[135px]" value={filtroDe}
              onChange={(e) => { setPreset('custom'); setFiltroDe(e.target.value); }} />
            <span className="text-grafite-800/40 text-xs">até</span>
            <input type="date" className="input !py-1 !px-2 text-xs w-[135px]" value={filtroAte}
              onChange={(e) => { setPreset('custom'); setFiltroAte(e.target.value); }} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Estatistica titulo="Faturamento" valor={moeda(d.periodo?.faturamento || 0)} cor="text-green-700" destaque />
        <Estatistica titulo="Lucro líquido" valor={moeda(d.periodo?.lucro || 0)} cor={(d.periodo?.lucro || 0) >= 0 ? 'text-green-700' : 'text-red-600'} destaque sub={`Taxas: ${moeda(d.periodo?.taxas || 0)}`} />
        <Estatistica titulo="Produtos enviados" valor={numero(d.periodo?.produtosEnviados || 0)} />
        <Estatistica titulo="Custo de materiais" valor={moeda(d.periodo?.custoMateriais || 0)} />
        <Estatistica
          titulo="Perdas (teste / erro)"
          valor={moeda(d.periodo?.perdaTotalValor || 0)}
          cor={(d.periodo?.perdaTotalValor || 0) > 0 ? 'text-red-600' : 'text-grafite-900'}
          sub={`Teste: ${moeda(d.periodo?.perdaTesteValor || 0)} · Erro: ${moeda(d.periodo?.perdaErroValor || 0)}`}
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <Atalho to="/entradas" label="Registrar entrada" icone="M12 5v14M5 12l7 7 7-7" />
        <Atalho to="/devolucoes" label="Registrar devolução" icone="M3 10h11a4 4 0 010 8h-3M3 10l4-4M3 10l4 4" />
        <Atalho to="/produtos" label="Cadastrar produto" icone="M12 5v14M5 12h14" />
        <Atalho to="/materiais" label="Cadastrar material" icone="M12 5v14M5 12h14" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <SecaoLote
          titulo="Emissão de notas"
          ajuda="Pedidos novos entram aqui. Selecione e emita as notas — depois o pedido vai para a programação de envio."
          grupos={gruposEmissao}
          botaoLabel="Emitir notas"
          onExecutar={emitirNotasLote}
        />
        <SecaoLote
          titulo="Programação de envio"
          ajuda="Com a nota emitida, selecione e gere as etiquetas. Depois o pedido cai na produção."
          grupos={gruposProgramacao}
          botaoLabel="Gerar etiquetas"
          onExecutar={gerarEtiquetasLote}
          onDesfazer={desfazerNota}
          desfazerLabel="Desfazer nota (voltar para emissão)"
        />
        <NotasCard />
        <SecaoAProduzir itens={itensAProduzir} onProduzir={produzir} onFinalizar={finalizar} onEmbalar={embalar} onNovoPedido={() => setModalPedidoManual(true)} onEditar={setPedidoEditando} onExcluir={excluir}
          onCapa={marcarCapa} onPaginas={(it) => setPaginasModal(it)} onDesfazerPaginas={desfazerPaginas} onFoto={(it) => setFotoModal(it)} onEtiqueta={marcarEtiqueta}
          onDesfazerProduzir={desfazerProduzir} onDesfazerFinalizar={desfazerFinalizar} onDesfazerEtiqueta={desfazerEtiqueta} />
        <SecaoAguardandoEnvio itens={itensAguardandoEnvio} onEnviarPedido={setEnviandoPedido} onEditar={setPedidoEditando} onExcluir={excluir} />

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <TituloBloco>Materiais mais urgentes</TituloBloco>
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
          <TituloBloco className="mb-4">Últimas movimentações</TituloBloco>
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
            <TituloBloco>Últimos envios</TituloBloco>
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

      {enviandoPedido && (
        <ModalEnviar
          pedido={enviandoPedido}
          onClose={() => setEnviandoPedido(null)}
          onEnviado={onEnviado}
        />
      )}

      {paginasModal && (
        <ModalPaginas
          item={paginasModal}
          filamentos={filamentos}
          onClose={() => setPaginasModal(null)}
          onConfirmar={confirmarPaginas}
        />
      )}

      {fotoModal && (
        <ModalFoto
          item={fotoModal}
          onClose={() => setFotoModal(null)}
          onDefinir={definirFoto}
        />
      )}
    </div>
  );
}
