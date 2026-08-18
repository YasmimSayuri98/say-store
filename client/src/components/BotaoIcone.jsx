import { Link } from 'react-router-dom';

// Ícones (paths do SVG, viewBox 0 0 24 24).
export const ICONES = {
  editar: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
  excluir: 'M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H6a1 1 0 01-1-1V6M10 11v6M14 11v6',
  duplicar: 'M8 8h11a1 1 0 011 1v11a1 1 0 01-1 1H8a1 1 0 01-1-1V9a1 1 0 011-1zM4 16H3a1 1 0 01-1-1V4a1 1 0 011-1h11a1 1 0 011 1v1',
  ficha: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M8 13h8M8 17h8',
  produzir: 'M4 4h16v16H4zM12 8v8M8 12h8',
  toggle: 'M18.36 6.64a9 9 0 11-12.73 0M12 2v10',
};

const CORES = {
  normal: 'text-grafite-800/50 hover:text-marca-600 hover:bg-base-200',
  primary: 'text-marca-600 hover:text-marca-700 hover:bg-marca-50',
  danger: 'text-grafite-800/40 hover:text-red-600 hover:bg-red-50',
};

// Botão (ou Link) só com ícone. `titulo` vira tooltip. `cor`: normal | primary | danger.
export default function BotaoIcone({ icone, titulo, onClick, to, cor = 'normal' }) {
  const cls = `inline-flex p-2 rounded-lg transition-colors ${CORES[cor] || CORES.normal}`;
  const svg = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d={icone} />
    </svg>
  );
  if (to) return <Link to={to} title={titulo} aria-label={titulo} className={cls}>{svg}</Link>;
  return <button type="button" title={titulo} aria-label={titulo} onClick={onClick} className={cls}>{svg}</button>;
}
