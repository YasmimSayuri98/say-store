import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import Logo from './Logo';
import { clearToken } from '../auth';

// Disposição reorganizada por fluxo de trabalho: do estoque → produção → pós-venda → dinheiro.
const grupos = [
  {
    titulo: 'Início',
    links: [
      { to: '/', label: 'Dashboard', icone: 'M3 12l9-9 9 9M5 10v10h14V10', end: true },
    ],
  },
  {
    titulo: 'Estoque',
    links: [
      { to: '/materiais', label: 'Materiais', icone: 'M20 7L12 3 4 7v10l8 4 8-4V7zM4 7l8 4 8-4M12 11v10' },
      { to: '/entradas', label: 'Entrada de estoque', icone: 'M12 5v14M5 12l7 7 7-7' },
      { to: '/ajustes', label: 'Ajuste manual', icone: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z' },
      { to: '/lista-compras', label: 'Lista de compras', icone: 'M6 2l1.5 4h13L19 14H8L6 2zM8 20a1 1 0 100 2 1 1 0 000-2zM18 20a1 1 0 100 2 1 1 0 000-2z' },
      { to: '/valor-estoque', label: 'Valor do estoque', icone: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
      { to: '/fornecedores', label: 'Fornecedores', icone: 'M3 7h18v12H3zM3 7l2-3h14l2 3M9 12h6' },
    ],
  },
  {
    titulo: 'Produção',
    links: [
      { to: '/produtos', label: 'Produtos', icone: 'M20 7L12 3 4 7v10l8 4 8-4V7zM12 11v10M4 7l8 4 8-4' },
      { to: '/embalagens', label: 'Embalagens', icone: 'M21 8l-9-5-9 5m18 0l-9 5-9-5m18 0v8l-9 5-9-5V8' },
      { to: '/perdas', label: 'Perdas e testes', icone: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01' },
    ],
  },
  {
    titulo: 'Pedidos e pós-venda',
    links: [
      { to: '/historico-envios', label: 'Pedidos enviados', icone: 'M12 8v4l3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0z' },
      { to: '/devolucoes', label: 'Devoluções', icone: 'M3 10h11a4 4 0 010 8h-3M3 10l4-4M3 10l4 4' },
      { to: '/relatorios-envio', label: 'Gastos de envios', icone: 'M9 17v-6M12 17v-10M15 17v-4M4 4v16h16' },
    ],
  },
  {
    titulo: 'Preços e vendas',
    links: [
      { to: '/plataformas', label: 'Plataformas', icone: 'M3 3h18v14H3zM3 21h18M8 21v-4M16 21v-4' },
      { to: '/precificacao', label: 'Precificação', icone: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
      { to: '/preco-sugerido', label: 'Calculadora de preços', icone: 'M9 7h6M9 11h6M9 15h4M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z' },
      { to: '/faturamento', label: 'Faturamento e lucro', icone: 'M3 3v18h18M7 14l3-3 3 3 5-6' },
    ],
  },
  {
    titulo: 'Financeiro',
    links: [
      { to: '/financeiro', label: 'Visão financeira', icone: 'M3 3v18h18M18 9l-5 5-3-3-4 4' },
      { to: '/contas-financeiras', label: 'Contas', icone: 'M3 7h18v12H3zM3 7l2-3h14l2 3M16 13h2' },
      { to: '/saques', label: 'Saques', icone: 'M12 3v12m0 0l-4-4m4 4l4-4M4 21h16' },
      { to: '/contas-pagar', label: 'Contas a pagar', icone: 'M4 5h16v14H4zM4 9h16M9 14h6' },
      { to: '/movimentacoes', label: 'Movimentações', icone: 'M3 3v18h18M7 14l4-4 4 4 5-5' },
    ],
  },
];

function Icone({ d }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] shrink-0">
      <path d={d} />
    </svg>
  );
}

function ItemNav({ l, onNavigate }) {
  return (
    <NavLink
      to={l.to}
      end={l.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `relative group flex items-center gap-3 pl-3.5 pr-3 py-2 rounded-xl text-sm transition-all duration-150 ${
          isActive
            ? 'bg-white/[0.07] text-white font-medium'
            : 'text-base-200/55 hover:text-white hover:bg-white/[0.035]'
        }`}
    >
      {({ isActive }) => (
        <>
          {/* Barra de destaque do item ativo */}
          <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full transition-all duration-200 ${isActive ? 'h-5 bg-marca-400' : 'h-0 bg-transparent'}`} />
          <span className={isActive ? 'text-marca-300' : 'text-base-200/40 group-hover:text-base-200/70'}>
            <Icone d={l.icone} />
          </span>
          <span className="truncate">{l.label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const [aberto, setAberto] = useState(false);
  const fechar = () => setAberto(false);
  return (
    <div className="min-h-screen flex bg-base-100">
      {aberto && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={fechar} />}
      <aside className={`fixed md:sticky top-0 z-40 w-64 h-screen flex flex-col bg-gradient-to-b from-grafite-950 to-grafite-900 text-base-200 border-r border-white/[0.06] transition-transform ${aberto ? '' : '-translate-x-full md:translate-x-0'}`}>
        {/* Cabeçalho: logo em painel sutil + fio da marca */}
        <div className="px-4 pt-5 pb-4">
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] px-4 py-3 flex items-center justify-center">
            <Logo />
          </div>
          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-marca-500/40 to-transparent" />
        </div>

        <nav className="flex-1 overflow-y-auto sidebar-scroll px-3 pb-4 space-y-6">
          {grupos.map((g) => (
            <div key={g.titulo}>
              <div className="flex items-center gap-2 px-3 mb-2">
                <span className="w-1 h-1 rounded-full bg-marca-500/80" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">{g.titulo}</span>
              </div>
              <div className="space-y-0.5">
                {g.links.map((l) => <ItemNav key={l.to} l={l} onNavigate={fechar} />)}
              </div>
            </div>
          ))}
        </nav>

        {/* Rodapé */}
        <div className="px-3 py-3 border-t border-white/[0.06]">
          <button
            onClick={() => { clearToken(); window.location.reload(); }}
            className="w-full flex items-center gap-3 pl-3.5 pr-3 py-2 rounded-xl text-sm text-base-200/55 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] shrink-0">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            <span>Sair</span>
          </button>
          <div className="flex items-center justify-between px-3 pt-2.5">
            <span className="text-[10px] text-white/20">Say Store</span>
            <span className="text-[10px] text-white/20">v1.0</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-20 bg-grafite-950 border-b border-white/[0.06] px-4 h-14 flex items-center gap-3">
          <button className="btn btn-ghost btn-sm p-2 text-white" onClick={() => setAberto((a) => !a)} aria-label="Abrir menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" /></svg>
          </button>
          <Logo compact />
        </header>
        <main className="flex-1 p-5 md:p-8 max-w-7xl w-full mx-auto"><Outlet /></main>
      </div>
    </div>
  );
}
