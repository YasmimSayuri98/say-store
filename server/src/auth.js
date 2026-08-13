const crypto = require('crypto');

const VALIDADE_MS = 30 * 24 * 3600 * 1000; // 30 dias

// Segredo usado para assinar o token de acesso. Em produção vem de AUTH_SECRET.
// Lido no momento do uso (não no carregamento do módulo) para não depender da ordem em que
// as variáveis de ambiente são carregadas. O fallback só serve para o desenvolvimento local.
function getSecret() {
  return process.env.AUTH_SECRET || 'dev-secret-troque-em-producao';
}

function assinar(payloadB64) {
  return crypto.createHmac('sha256', getSecret()).update(payloadB64).digest('hex');
}

// Gera um token no formato payloadBase64.assinaturaHex.
function gerarToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + VALIDADE_MS })).toString('base64url');
  return `${payload}.${assinar(payload)}`;
}

// Valida assinatura e expiração. Retorna true/false.
function verificarToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [payloadB64, assinatura] = token.split('.');
  if (!payloadB64 || !assinatura) return false;

  const esperada = assinar(payloadB64);
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

// Compara a senha informada com APP_PASSWORD em tempo constante.
function senhaCorreta(senhaInformada) {
  const esperada = process.env.APP_PASSWORD || '';
  if (!esperada) return false;
  const a = Buffer.from(String(senhaInformada || ''));
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { gerarToken, verificarToken, senhaCorreta };
