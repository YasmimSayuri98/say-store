const express = require('express');
const prisma = require('../prisma');
const router = express.Router();

// Normaliza os campos do fornecedor a partir do corpo da requisição.
// tipo: FISICA (loja física) ou ECOMMERCE (loja online); ecommerce só faz sentido quando ECOMMERCE.
function normalizar(body) {
  const nome = (body.nome || '').trim();
  const tipo = body.tipo === 'ECOMMERCE' ? 'ECOMMERCE' : 'FISICA';
  const ecommerce = tipo === 'ECOMMERCE' && body.ecommerce ? String(body.ecommerce).trim() : null;
  return { nome, tipo, ecommerce };
}

router.get('/', async (req, res, next) => {
  try {
    const f = await prisma.fornecedor.findMany({ orderBy: { nome: 'asc' } });
    res.json(f);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { nome, tipo, ecommerce } = normalizar(req.body);
    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
    if (tipo === 'ECOMMERCE' && !ecommerce) return res.status(400).json({ erro: 'Informe qual é o ecommerce.' });
    const existe = await prisma.fornecedor.findUnique({ where: { nome } });
    if (existe) return res.status(409).json({ erro: 'Fornecedor já existe.' });
    const f = await prisma.fornecedor.create({ data: { nome, tipo, ecommerce } });
    res.status(201).json(f);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { nome, tipo, ecommerce } = normalizar(req.body);
    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
    if (tipo === 'ECOMMERCE' && !ecommerce) return res.status(400).json({ erro: 'Informe qual é o ecommerce.' });
    const existente = await prisma.fornecedor.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ erro: 'Fornecedor não encontrado.' });
    const colisao = await prisma.fornecedor.findUnique({ where: { nome } });
    if (colisao && colisao.id !== id) return res.status(409).json({ erro: 'Já existe outro fornecedor com esse nome.' });
    const f = await prisma.fornecedor.update({ where: { id }, data: { nome, tipo, ecommerce } });
    res.json(f);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existente = await prisma.fornecedor.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ erro: 'Fornecedor não encontrado.' });
    const emUso = await prisma.entradaEstoque.count({ where: { fornecedorId: id } });
    if (emUso > 0) return res.status(409).json({ erro: 'Este fornecedor tem entradas de estoque vinculadas e não pode ser excluído.' });
    await prisma.fornecedor.delete({ where: { id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
