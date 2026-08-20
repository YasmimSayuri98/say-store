const express = require('express');
const prisma = require('../prisma');
const router = express.Router();

// Bloco de notas/afazeres do Dashboard (registro único id=1).
router.get('/', async (req, res, next) => {
  try {
    const nota = await prisma.nota.findUnique({ where: { id: 1 } });
    res.json({ texto: nota ? nota.texto : '', atualizadoEm: nota ? nota.atualizadoEm : null });
  } catch (e) { next(e); }
});

router.put('/', async (req, res, next) => {
  try {
    const texto = typeof req.body.texto === 'string' ? req.body.texto : '';
    const nota = await prisma.nota.upsert({
      where: { id: 1 },
      create: { id: 1, texto },
      update: { texto },
    });
    res.json({ texto: nota.texto, atualizadoEm: nota.atualizadoEm });
  } catch (e) { next(e); }
});

module.exports = router;
