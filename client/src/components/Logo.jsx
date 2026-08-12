import { useState } from 'react';

// Logo da SAY STORE.
// Se existir o arquivo client/public/logo.png, ele é usado; caso contrário,
// uma versão vetorial da marca é exibida (mesmo estilo, funciona de imediato).
export default function Logo({ compact = false }) {
  const [erroImg, setErroImg] = useState(false);

  if (!erroImg) {
    return (
      <img
        src="/logo.png"
        alt="Say Store — 3D Personalizados"
        onError={() => setErroImg(true)}
        className={compact ? 'h-9 w-auto object-contain' : 'w-full max-h-28 object-contain'}
      />
    );
  }

  // --- Fallback vetorial da marca ---
  if (compact) {
    return (
      <div className="flex items-center gap-2.5">
        <PrinterMark className="w-8 h-8" />
        <Wordmark className="text-[15px]" subtitle={false} />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 py-1">
      <PrinterMark className="w-12 h-12" />
      <Wordmark className="text-lg" subtitle />
    </div>
  );
}

function Wordmark({ className = '', subtitle }) {
  return (
    <div className="leading-tight text-center">
      <div className={`font-display font-extrabold tracking-tight ${className}`}>
        <span className="text-marca-500">SAY</span> <span className="text-white">STORE</span>
      </div>
      {subtitle && (
        <div className="text-[9px] font-semibold uppercase tracking-[0.25em] text-marca-300/80 mt-0.5">
          3D · Personalizados
        </div>
      )}
    </div>
  );
}

// Marca da impressora 3D com "SS" estilizado.
function PrinterMark({ className = '' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="46" height="46" rx="10" fill="#111111" />
      <rect x="1.5" y="1.5" width="45" height="45" rx="9.5" stroke="#ffffff" strokeOpacity="0.12" />
      {/* pórtico / trilho superior */}
      <rect x="10" y="9" width="28" height="5" rx="2.5" fill="#E7E5E4" />
      <rect x="21.5" y="6.5" width="5" height="4" rx="1.2" fill="#A8A29E" />
      {/* bico extrusor */}
      <path d="M24 14v3l-1.4 1.6h2.8L24 17" fill="#A8A29E" />
      {/* SS estilizado */}
      <text x="24" y="33" textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="16" fontWeight="800" fill="#F59E0B" stroke="#111111" strokeWidth="0.6" paintOrder="stroke">SS</text>
      {/* base / mesa */}
      <rect x="8" y="36" width="32" height="5" rx="2.5" fill="#E7E5E4" />
      <circle cx="12" cy="38.5" r="0.9" fill="#78716C" />
      <circle cx="36" cy="38.5" r="0.9" fill="#78716C" />
    </svg>
  );
}
