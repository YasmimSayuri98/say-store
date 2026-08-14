const { round4 } = require('../utils/money');

// Desconta os materiais da ficha técnica para produzir `quantidade` unidades de um produto.
// Bloqueia se faltar material (não deixa negativar). `produto` deve vir com itensFicha+material.
async function descontarMateriais(tx, produto, quantidade, motivo, refs = {}) {
  if (!produto.itensFicha || produto.itensFicha.length === 0) {
    throw Object.assign(new Error(`Produto sem ficha técnica: ${produto.nome}.`), { status: 400 });
  }
  const consumo = produto.itensFicha.map((fi) => ({ material: fi.material, necessario: round4(fi.quantidade * quantidade) }));
  const faltando = consumo.find((c) => c.material.quantidade < c.necessario);
  if (faltando) {
    throw Object.assign(
      new Error(`Estoque insuficiente de ${faltando.material.nome}: disponível ${faltando.material.quantidade}, necessário ${faltando.necessario}.`),
      { status: 409 }
    );
  }
  for (const { material, necessario } of consumo) {
    const qtdAnterior = material.quantidade;
    const qtdResultante = round4(qtdAnterior - necessario);
    await tx.material.update({ where: { id: material.id }, data: { quantidade: qtdResultante } });
    await tx.movimentacaoEstoque.create({
      data: {
        materialId: material.id, tipo: 'SAIDA_PRODUCAO_PLATAFORMA',
        quantidadeAnterior: qtdAnterior, quantidadeMovimentada: necessario, quantidadeResultante: qtdResultante,
        motivo, ...refs,
      },
    });
  }
}

// Devolve ao estoque os materiais da ficha (desfazer produção).
async function estornarMateriais(tx, produto, quantidade, motivo, refs = {}) {
  for (const fi of produto.itensFicha) {
    const necessario = round4(fi.quantidade * quantidade);
    const material = await tx.material.findUnique({ where: { id: fi.materialId } });
    const qtdAnterior = material.quantidade;
    const qtdResultante = round4(qtdAnterior + necessario);
    await tx.material.update({ where: { id: material.id }, data: { quantidade: qtdResultante } });
    await tx.movimentacaoEstoque.create({
      data: {
        materialId: material.id, tipo: 'ENTRADA_ESTORNO_PRODUCAO_PLATAFORMA',
        quantidadeAnterior: qtdAnterior, quantidadeMovimentada: necessario, quantidadeResultante: qtdResultante,
        motivo, ...refs,
      },
    });
  }
}

// Marca um item de pedido como "produzido". Se houver estoque de produto pronto suficiente,
// consome do estoque (sem descontar material). Senão, desconta os materiais da ficha.
// Retorna { produzidoDoEstoque }.
async function marcarProduzido(tx, item, produto) {
  const qtd = item.quantidade;
  if (produto.estoque >= qtd) {
    await tx.produto.update({ where: { id: produto.id }, data: { estoque: round4(produto.estoque - qtd) } });
    return { produzidoDoEstoque: true };
  }
  await descontarMateriais(
    tx, produto, qtd,
    `Produção pedido ${item.pedido.plataforma.nome} ${item.pedido.numeroPedido}`,
    { itemPedidoPlataformaId: item.id }
  );
  return { produzidoDoEstoque: false };
}

// Desfaz o "produzido": devolve a unidade ao estoque de produto (se veio de estoque) ou
// estorna os materiais (se foi produzido descontando material).
async function desfazerProduzido(tx, item, produto) {
  if (item.produzidoDoEstoque) {
    await tx.produto.update({ where: { id: produto.id }, data: { estoque: round4(produto.estoque + item.quantidade) } });
  } else {
    await estornarMateriais(
      tx, produto, item.quantidade,
      `Estorno produção pedido ${item.pedido.plataforma.nome} ${item.pedido.numeroPedido}`,
      { itemPedidoPlataformaId: item.id }
    );
  }
}

module.exports = { descontarMateriais, estornarMateriais, marcarProduzido, desfazerProduzido };
