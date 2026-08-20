const express = require('express');
const prisma = require('../prisma');
const router = express.Router();

// Afazeres do Dashboard (checklist).
router.get('/', async (req, res, next) => {
  try {
    const tarefas = await prisma.tarefa.findMany({ orderBy: { criadoEm: 'asc' } });
    res.json(tarefas);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const texto = (req.body.texto || '').trim();
    if (!texto) return res.status(400).json({ erro: 'Digite o afazer.' });
    const tarefa = await prisma.tarefa.create({ data: { texto } });
    res.status(201).json(tarefa);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = {};
    if (req.body.texto !== undefined) {
      const texto = String(req.body.texto).trim();
      if (!texto) return res.status(400).json({ erro: 'O texto não pode ficar vazio.' });
      data.texto = texto;
    }
    if (req.body.feito !== undefined) data.feito = !!req.body.feito;
    const tarefa = await prisma.tarefa.update({ where: { id }, data });
    res.json(tarefa);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.tarefa.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
