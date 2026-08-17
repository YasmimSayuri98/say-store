import { useState } from 'react';

// Logo da loja. Se existir o arquivo client/public/logo.png, ele é exibido.
// Enquanto não houver, mostra um espaço reservado (placeholder) para a imagem própria.
export default function Logo({ compact = false }) {
  const [erroImg, setErroImg] = useState(false);

  if (!erroImg) {
    return (
      <img
        src="/logo.png"
        alt="Logo"
        onError={() => setErroImg(true)}
        className={compact ? 'h-9 w-auto object-contain' : 'w-full max-h-28 object-contain'}
      />
    );
  }

  // --- Placeholder: espaço para colocar a imagem própria ---
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-white/40">
        <IconeImagem className="w-6 h-6" />
        <span className="text-xs font-medium">Sua logo</span>
      </div>
    );
  }
  return (
    <div className="w-full h-20 rounded-xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-1 text-white/40">
      <IconeImagem className="w-7 h-7" />
      <span className="text-[11px] font-medium">Coloque sua logo aqui</span>
    </div>
  );
}

function IconeImagem({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}
