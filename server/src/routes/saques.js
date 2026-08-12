const express = require('express');
const prisma = require('../prisma');
const { round2 } = require('../utils/money');
const { aplicarMovimentacao, getConfig } = require('../services/financeiroService');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const saques = await prisma.saquePlataforma.findMany({
      include: { plataforma: true, contaDestino: true, contaLucro: true },
      orderBy: { data: 'desc' },
    });
    res.json(saques);
  } catch (e) { next(e); }
});

// Registrar um saque da plataforma.
// valorBruto entra na conta operacional; um percentual é automaticamente
// direcionado à conta de reserva de lucro (banco separado).
router.post('/', async (req, res, next) => {
  try {
    const b = req.body;
    const valorBruto = round2(b.valorBruto || 0);
    if (!(valorBruto > 0)) return res.status(400).json({ erro: 'Informe o valor do saque.' });

    const cfg = await getConfig(prisma);
    const percentualLucro = b.percentualLucro != null ? round2(b.percentualLucro) : (cfg.percentualLucroPadrao || 0);
    if (percentualLucro < 0 || percentualLucro > 100) return res.status(400).json({ erro: 'Percentual de lucro deve estar entre 0 e 100.' });

    const contaDestinoId = Number(b.contaDestinoId || cfg.contaOperacionalPadraoId);
    const contaLucroId = b.contaLucroId != null ? Number(b.contaLucroId) : (cfg.contaLucroPadraoId || null);
    if (!contaDestinoId) return res.status(400).json({ erro: 'Selecione a conta de destino.' });
    if (percentualLucro > 0 && !contaLucroId) return res.status(400).json({ erro: 'Selecione a conta de reserva de lucro.' });
    if (contaLucroId && contaLucroId === contaDestinoId) return res.status(400).json({ erro: 'A conta de lucro deve ser diferente da conta de destino.' });

    const valorLucro = round2(valorBruto * (percentualLucro / 100));
    const valorLiquido = round2(valorBruto - valorLucro);

    const saque = await prisma.$transaction(async (tx) => {
      const s = await tx.saquePlataforma.create({
        data: {
          plataformaId: b.plataformaId ? Number(b.plataformaId) : null,
          contaDestinoId, contaLucroId: contaLucroId || null,
          valorBruto, percentualLucro, valorLucro, valorLiquido,
          data: b.data ? new Date(b.data) : new Date(),
          observacao: b.observacao || null,
        },
      });
      const plataformaNome = s.plataformaId ? (await tx.plataformaVenda.findUnique({ where: { id: s.plataformaId } }))?.nome : null;
      const rotulo = plataformaNome ? `Saque ${plataformaNome}` : 'Saque de plataforma';

      await aplicarMovimentacao(tx, {
        contaId: contaDestinoId, tipo: 'ENTRADA', origem: 'SAQUE_PLATAFORMA',
        valor: valorLiquido, descricao: rotulo, data: s.data, saqueId: s.id,
      });
      if (valorLucro > 0 && contaLucroId) {
        await aplicarMovimentacao(tx, {
          contaId: contaLucroId, tipo: 'ENTRADA', origem: 'DIRECIONAMENTO_LUCRO',
          valor: valorLucro, descricao: `${rotulo} — ${percentualLucro}% de lucro`, data: s.data, saqueId: s.id,
        });
      }
      return s;
    });

    res.status(201).json(saque);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

module.exports = router;
