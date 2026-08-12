const CHAVE = 'saystore_token';

export function getToken() {
  return localStorage.getItem(CHAVE) || '';
}

export function setToken(token) {
  localStorage.setItem(CHAVE, token);
}

export function clearToken() {
  localStorage.removeItem(CHAVE);
}

export function estaLogado() {
  return !!getToken();
}
