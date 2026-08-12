export default function Modal({ titulo, children, onClose, largura = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 bg-grafite-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${largura} max-h-[90vh] overflow-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-base-200">
          <h2 className="text-lg font-display font-bold text-grafite-900">{titulo}</h2>
          <button className="text-grafite-800/40 hover:text-grafite-900 hover:bg-base-200 w-8 h-8 rounded-lg flex items-center justify-center transition" onClick={onClose} aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
