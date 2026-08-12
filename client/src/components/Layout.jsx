import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import Logo from './Logo';
import { clearToken } from '../auth';

const grupos = [
  {
    titulo: 'Visão geral',
    links: [
      { to: '/', label: 'Dashboard', icone: 'M3 12l9-9 9 9M5 10v10h14V10', end: true },
      { to: '/valor-estoque', label: 'Valor do estoque', icone: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
    ],
  },
  {
    titulo: 'Estoque',
    links: [
      { to: '/materiais', label: 'Materiais', icone: 'M20 7L12 3 4 7v10l8 4 8-4V7zM4 7l8 4 8-4M12 11v10' },
      { to: '/entradas', label: 'Entrada de estoque', icone: 'M12 5v14M5 12l7 7 7-7' },
      { to: '/ajustes', label: 'Ajuste manual', icone: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z' },
      { to: '/lista-compras', label: 'Lista de compras', icone: 'M6 2l1.5 4h13L19 14H8L6 2zM8 20a1 1 0 100 2 1 1 0 000-2zM18 20a1 1 0 100 2 1 1 0 000-2z' },
    ],
  },
  {
    titulo: 'Produção',
    links: [
      { to: '/produtos', label: 'Produtos', icone: 'M20 7L12 3 4 7v10l8 4 8-4V7zM12 11v10M4 7l8 4 8-4' },
      { to: '/envios', label: 'Registrar envios', icone: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' },
      { to: '/historico-envios', label: 'Histórico de envios', icone: 'M12 8v4l3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0z' },
    ],
  },
  {
    titulo: 'Vendas e finanças',
    links: [
      { to: '/plataformas', label: 'Plataformas', icone: 'M3 3h18v14H3zM3 21h18M8 21v-4M16 21v-4' },
      { to: '/precificacao', label: 'Precificação', icone: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
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
    ],
  },
  {
    titulo: 'Registros',
    links: [
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

export default function Layout() {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="min-h-screen flex bg-base-100">
      {aberto && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setAberto(false)} />}
      <aside className={`fixed md:sticky top-0 z-40 w-64 bg-grafite-900 text-base-200 h-screen flex flex-col transition-transform ${aberto ? '' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center justify-center px-5 py-4 border-b border-white/5">
          <Logo />
        </div>

        <nav className="flex-1 overflow-y-auto sidebar-scroll px-3 py-4 space-y-5">
          {grupos.map((g) => (
            <div key={g.titulo}>
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">{g.titulo}</div>
              <div className="space-y-0.5">
                {g.links.map((l) => (
                  <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setAberto(false)}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-marca-500 text-white font-medium shadow-suave'
                          : 'text-base-200/70 hover:text-white hover:bg-white/5'
                      }`}>
                    <Icone d={l.icone} />
                    <span>{l.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-white/5">
          <button
            onClick={() => { clearToken(); window.location.reload(); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-base-200/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] shrink-0">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            <span>Sair</span>
          </button>
          <div className="px-3 pt-2 text-[10px] text-white/25">Versão 1.0</div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-20 bg-grafite-900 border-b border-white/5 px-4 h-14 flex items-center gap-3">
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
