import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { numero, moeda } from '../format';

export default function AlertaPopup() {
  const [lista, setLista] = useState([]);
  const [alertasMargem, setAlertasMargem] = useState([]);
  const [visivel, setVisivel] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/lista-compras').catch(() => []),
      api.get('/precificacao/alertas-margem').catch(() => []),
    ]).then(([estoque, margem]) => {
      setLista(estoque);
      setAlertasMargem(margem);
      if (estoque.length > 0 || margem.length > 0) setVisivel(true);
    });
  }, []);

  if (!visivel) return null;
  const sem = lista.filter((m) => m.situacao === 'SEM_ESTOQUE');
  const baixo = lista.filter((m) => m.situacao === 'BAIXO');

  const Grupo = ({ titulo, itens, cls }) => itens.length === 0 ? null : (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`badge ${cls}`}>{titulo}</span>
        <span className="text-xs text-grafite-800/40">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</span>
      </div>
      <div className="rounded-lg border border-base-200 overflow-hidden">
        {itens.map((m, i) => (
          <div key={m.id} className={`flex justify-between items-center text-sm px-3 py-2 ${i % 2 ? 'bg-base-50' : 'bg-white'}`}>
            <span className="font-medium">{m.nome} <span className="text-grafite-800/40 font-normal">· {m.categoria}</span></span>
            <span className="tabular-nums text-grafite-800/70">{numero(m.quantidade)} / mín {numero(m.quantidadeMinima)} {m.unidade}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const GrupoMargem = ({ itens }) => itens.length === 0 ? null : (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="badge badge-baixo">Margem abaixo do alvo</span>
        <span className="text-xs text-grafite-800/40">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</span>
      </div>
      <div className="rounded-lg border border-base-200 overflow-hidden">
        {itens.map((a, i) => (
          <div key={a.produtoId + '-' + a.plataformaId} className={`text-sm px-3 py-2 ${i % 2 ? 'bg-base-50' : 'bg-white'}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium">{a.produtoNome} <span className="text-grafite-800/40 font-normal">· {a.plataformaNome}</span></span>
              <span className="tabular-nums text-red-600 font-medium">{numero(a.margemAtual)}% <span className="text-grafite-800/40 font-normal">(alvo {numero(a.margemAlvo)}%)</span></span>
            </div>
            <div className="text-xs text-grafite-800/60 mt-0.5">
              Preço atual {moeda(a.precoAtual)} → sugerido {a.precoSugerido != null ? moeda(a.precoSugerido) : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-grafite-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-auto">
        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
          <div className="w-10 h-10 rounded-xl bg-marca-50 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="#E8590C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-grafite-900">Atenção</h2>
            <p className="text-sm text-grafite-800/50">Estoque e precificação que precisam de revisão</p>
          </div>
        </div>
        <div className="px-6">
          <Grupo titulo="Sem estoque" itens={sem} cls="badge-sem" />
          <Grupo titulo="Estoque baixo" itens={baixo} cls="badge-baixo" />
          <GrupoMargem itens={alertasMargem} />
        </div>
        <div className="flex flex-wrap gap-2 justify-end px-6 py-4 border-t border-base-200 bg-base-50 rounded-b-2xl">
          <button className="btn btn-ghost" onClick={() => setVisivel(false)}>Fechar</button>
          {alertasMargem.length > 0 && (
            <button className="btn btn-secondary" onClick={() => { setVisivel(false); navigate('/precificacao'); }}>Ver precificação</button>
          )}
          {lista.length > 0 && (
            <>
              <button className="btn btn-secondary" onClick={() => { setVisivel(false); navigate('/lista-compras'); }}>Lista de compras</button>
              <button className="btn btn-primary" onClick={() => { setVisivel(false); navigate('/entradas'); }}>Registrar reposição</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
