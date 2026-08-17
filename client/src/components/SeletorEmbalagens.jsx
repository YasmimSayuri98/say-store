import { useEffect, useState } from 'react';
import { api } from '../api';
import { moeda } from '../format';

// Seletor de embalagens usadas num envio: uma ou mais linhas de { embalagemId, quantidade }.
// Só para controle de estoque — não afeta preço/lucro. `linhas`/`setLinhas` vêm do pai.
export default function SeletorEmbalagens({ linhas, setLinhas }) {
  const [opcoes, setOpcoes] = useState([]);

  useEffect(() => { api.get('/embalagens?ativo=true').then(setOpcoes).catch(() => {}); }, []);

  function add() { setLinhas([...linhas, { embalagemId: '', quantidade: '1' }]); }
  function remove(i) { setLinhas(linhas.filter((_, idx) => idx !== i)); }
  function set(i, campo, valor) { setLinhas(linhas.map((l, idx) => idx === i ? { ...l, [campo]: valor } : l)); }

  const porId = new Map(opcoes.map((o) => [String(o.id), o]));

  return (
    <div>
      <label className="label">Embalagem usada * (baixa do estoque)</label>
      {opcoes.length === 0 ? (
        <p className="text-xs text-red-600">Nenhum tipo de embalagem cadastrado. Cadastre em “Embalagens” antes de enviar (a embalagem é obrigatória).</p>
      ) : (
        <>
          <div className="space-y-2">
            {linhas.map((l, i) => {
              const emb = porId.get(String(l.embalagemId));
              return (
                <div key={i} className="flex gap-2 items-center">
                  <select className="input flex-1" value={l.embalagemId} onChange={(e) => set(i, 'embalagemId', e.target.value)}>
                    <option value="">Selecione a embalagem</option>
                    {opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </select>
                  <input type="number" min="1" step="1" className="input w-20" title="Qtde de pacotes" value={l.quantidade} onChange={(e) => set(i, 'quantidade', e.target.value)} />
                  <span className="text-xs text-grafite-800/50 w-20 text-right">{emb ? moeda(emb.custoEstimado * (Number(l.quantidade) || 0)) : ''}</span>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(i)}>×</button>
                </div>
              );
            })}
          </div>
          <button className="btn btn-secondary btn-sm mt-2" onClick={add}>+ Adicionar embalagem</button>
        </>
      )}
    </div>
  );
}

// Converte as linhas do seletor no payload da API (só linhas válidas).
export function linhasEmbalagemPayload(linhas) {
  return (linhas || [])
    .filter((l) => l.embalagemId && Number(l.quantidade) > 0)
    .map((l) => ({ embalagemId: Number(l.embalagemId), quantidade: Number(l.quantidade) }));
}
