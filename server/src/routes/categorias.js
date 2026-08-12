const express = require('express');
const prisma = require('../prisma');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const cats = await prisma.categoriaMaterial.findMany({ orderBy: { nome: 'asc' } });
    res.json(cats);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const nome = (req.body.nome || '').trim();
    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
    const existe = await prisma.categoriaMaterial.findUnique({ where: { nome } });
    if (existe) return res.status(409).json({ erro: 'Categoria já existe.' });
    const cat = await prisma.categoriaMaterial.create({ data: { nome } });
    res.status(201).json(cat);
  } catch (e) { next(e); }
});

module.exports = router;
