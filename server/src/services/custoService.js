const { round4 } = require('../utils/money');

// Recalcula o custo de materiais de um produto a partir da ficha técnica.
// Recebe um cliente prisma (pode ser tx dentro de transação).
async function recalcularCustoProduto(db, produtoId) {
  const itens = await db.itemFichaTecnica.findMany({
    where: { produtoId },
    include: { material: true },
  });
  let custo = 0;
  for (const item of itens) {
    custo = round4(custo + round4(item.quantidade * item.material.custoMedio));
  }
  await db.produto.update({
    where: { id: produtoId },
    data: { custoAtualMateriais: custo, ultimoCalculoCusto: new Date() },
  });
  return custo;
}

// Recalcula todos os produtos que usam um determinado material.
async function recalcularProdutosPorMaterial(db, materialId) {
  const itens = await db.itemFichaTecnica.findMany({
    where: { materialId },
    select: { produtoId: true },
    distinct: ['produtoId'],
  });
  for (const { produtoId } of itens) {
    await recalcularCustoProduto(db, produtoId);
  }
}

module.exports = { recalcularCustoProduto, recalcularProdutosPorMaterial };
