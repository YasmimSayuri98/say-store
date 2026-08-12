const express = require('express');
const prisma = require('../prisma');
const { round4 } = require('../utils/money');
const router = express.Router();

// tipo: ADICIONAR | REMOVER | DEFINIR
router.post('/', async (req, res, next) => {
  try {
    const b = req.body;
    const materialId = Number(b.materialId);
    const tipo = b.tipo;
    const quantidade = round4(b.quantidade);
    const motivo = (b.motivo || '').trim();
    if (!materialId) return res.status(400).json({ erro: 'Material é obrigatório.' });
    if (!['ADICIONAR', 'REMOVER', 'DEFINIR'].includes(tipo)) return res.status(400).json({ erro: 'Tipo de ajuste inválido.' });
    if (!(quantidade >= 0)) return res.status(400).json({ erro: 'Quantidade inválida.' });
    if (!motivo) return res.status(400).json({ erro: 'Justificativa (motivo) é obrigatória.' });

    const resultado = await prisma.$transaction(async (tx) => {
      const material = await tx.material.findUnique({ where: { id: materialId } });
      if (!material) throw Object.assign(new Error('Material não encontrado.'), { status: 404 });

      const qtdAnterior = material.quantidade;
      let qtdResultante;
      let movTipo;
      let qtdMovimentada;

      if (tipo === 'ADICIONAR') {
        qtdResultante = round4(qtdAnterior + quantidade);
        movTipo = 'AJUSTE_POSITIVO';
        qtdMovimentada = quantidade;
      } else if (tipo === 'REMOVER') {
        qtdResultante = round4(qtdAnterior - quantidade);
        if (qtdResultante < 0) throw Object.assign(new Error('Ajuste deixaria o estoque negativo.'), { status: 400 });
        movTipo = 'AJUSTE_NEGATIVO';
        qtdMovimentada = quantidade;
      } else { // DEFINIR
        qtdResultante = quantidade;
        const delta = round4(qtdResultante - qtdAnterior);
        movTipo = 'CORRECAO';
        qtdMovimentada = Math.abs(delta);
      }

      await tx.ajusteEstoque.create({ data: { materialId, tipo, quantidade, motivo, observacao: b.observacao || null } });
      await tx.material.update({ where: { id: materialId }, data: { quantidade: qtdResultante } });
      const mov = await tx.movimentacaoEstoque.create({
        data: {
          materialId, tipo: movTipo,
          quantidadeAnterior: qtdAnterior, quantidadeMovimentada: qtdMovimentada,
          quantidadeResultante: qtdResultante, motivo, observacao: b.observacao || null,
        },
      });
      return mov;
    });

    res.status(201).json(resultado);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

module.exports = router;
