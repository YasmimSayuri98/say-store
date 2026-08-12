const { verificarToken } = require('../auth');

// Protege as rotas: exige um token válido no cabeçalho Authorization: Bearer <token>.
module.exports = function exigirAutenticacao(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!verificarToken(token)) {
    return res.status(401).json({ erro: 'Não autenticado.' });
  }
  next();
};
