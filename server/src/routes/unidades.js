const express = require('express');
const prisma = require('../prisma');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const uns = await prisma.unidadeMedida.findMany({ orderBy: { nome: 'asc' } });
    res.json(uns);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const nome = (req.body.nome || '').trim();
    const sigla = (req.body.sigla || '').trim();
    const grandeza = (req.body.grandeza || 'contagem').trim();
    if (!nome || !sigla) return res.status(400).json({ erro: 'Nome e sigla são obrigatórios.' });
    const existe = await prisma.unidadeMedida.findFirst({ where: { OR: [{ nome }, { sigla }] } });
    if (existe) return res.status(409).json({ erro: 'Unidade já existe.' });
    const un = await prisma.unidadeMedida.create({ data: { nome, sigla, grandeza } });
    res.status(201).json(un);
  } catch (e) { next(e); }
});

module.exports = router;
