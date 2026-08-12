const express = require('express');
const { gerarToken, senhaCorreta } = require('../auth');
const router = express.Router();

router.post('/', (req, res) => {
  if (!process.env.APP_PASSWORD) {
    return res.status(500).json({ erro: 'Senha de acesso não configurada no servidor (APP_PASSWORD).' });
  }
  if (!senhaCorreta(req.body.senha)) {
    return res.status(401).json({ erro: 'Senha incorreta.' });
  }
  res.json({ token: gerarToken() });
});

module.exports = router;
