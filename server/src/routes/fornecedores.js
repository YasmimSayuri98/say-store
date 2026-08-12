const express = require('express');
const prisma = require('../prisma');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const f = await prisma.fornecedor.findMany({ orderBy: { nome: 'asc' } });
    res.json(f);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const nome = (req.body.nome || '').trim();
    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
    const existe = await prisma.fornecedor.findUnique({ where: { nome } });
    if (existe) return res.status(409).json({ erro: 'Fornecedor já existe.' });
    const f = await prisma.fornecedor.create({ data: { nome } });
    res.status(201).json(f);
  } catch (e) { next(e); }
});

module.exports = router;
