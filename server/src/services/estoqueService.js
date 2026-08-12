// Determina a situação de estoque de um material.
function situacaoEstoque(quantidade, quantidadeMinima) {
  if (quantidade <= 0) return 'SEM_ESTOQUE';
  if (quantidade <= quantidadeMinima) return 'BAIXO';
  return 'NORMAL';
}

module.exports = { situacaoEstoque };
