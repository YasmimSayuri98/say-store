import { useState } from 'react';
import { api } from '../api';
import { setToken } from '../auth';
import Logo from '../components/Logo';

export default function Login({ onEntrar }) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setEntrando(true);
    try {
      const { token } = await api.post('/login', { senha });
      setToken(token);
      onEntrar();
    } catch (err) {
      setErro(err.message || 'Não foi possível entrar.');
      setEntrando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-grafite-900 p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="w-48"><Logo /></div>
        </div>
        <form onSubmit={entrar} className="bg-white rounded-2xl shadow-2xl p-6 space-y-4">
          <div>
            <h1 className="text-lg font-display font-bold text-grafite-900">Acesso ao sistema</h1>
            <p className="text-sm text-grafite-800/50 mt-0.5">Digite a senha para continuar.</p>
          </div>
          <div>
            <label className="label">Senha</label>
            <input
              type="password"
              className="input"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoFocus
            />
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={entrando}>
            {entrando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
