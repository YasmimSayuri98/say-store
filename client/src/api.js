import { getToken, clearToken } from './auth';

// Em produção, VITE_API_URL aponta para a API no Railway. Localmente fica vazio e usa o proxy do Vite.
const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  const token = getToken();
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(BASE + path, opts);

  // Token inválido/expirado: limpa e manda de volta para o login.
  if (res.status === 401 && path !== '/login') {
    clearToken();
    window.location.reload();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || 'Erro na requisição.');
  return data;
}

export const api = {
  get: (p) => req('GET', p),
  post: (p, b) => req('POST', p, b),
  put: (p, b) => req('PUT', p, b),
  patch: (p, b) => req('PATCH', p, b),
  del: (p) => req('DELETE', p),
};
