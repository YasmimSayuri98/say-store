const { round4 } = require('../utils/money');

// Aplica o consumo de embalagens de um envio: baixa os materiais do estoque, registra as
// movimentações (SAIDA_EMBALAGEM) e cria um UsoEmbalagem por tipo usado. Retorna o custo total
// das embalagens (para o snapshot do envio e os relatórios).
//
// `embalagens`: [{ embalagemId, quantidade }]  (quantidade = quantos pacotes daquele tipo)
// `vinculo`: { envioId } ou { pedidoId } — de onde veio o envio.
async function aplicarEmbalagens(tx, embalagens, vinculo = {}) {
  if (!Array.isArray(embalagens) || embalagens.length === 0) return 0;

  let custoTotalGeral = 0;

  for (const linha of embalagens) {
    const embalagemId = Number(linha.embalagemId);
    const qtdPacotes = round4(linha.quantidade != null ? linha.quantidade : 1);
    if (!embalagemId) continue;
    if (!(qtdPacotes > 0)) throw Object.assign(new Error('Quantidade de embalagem deve ser maior que zero.'), { status: 400 });

    const embalagem = await tx.embalagem.findUnique({
      where: { id: embalagemId },
      include: { itens: { include: { material: { include: { unidade: true } } } } },
    });
    if (!embalagem) throw Object.assign(new Error('Tipo de embalagem não encontrado.'), { status: 404 });

    // Confere estoque de todos os materiais antes de baixar qualquer coisa.
    const consumos = embalagem.itens.map((it) => ({
      material: it.material,
      necessario: round4(it.quantidade * qtdPacotes),
    }));
    const faltando = consumos.find((c) => c.material.quantidade < c.necessario);
    if (faltando) {
      throw Object.assign(
        new Error(`Estoque insuficiente do material de embalagem ${faltando.material.nome}: disponível ${faltando.material.quantidade} ${faltando.material.unidade.sigla}, necessário ${faltando.necessario} ${faltando.material.unidade.sigla}.`),
        { status: 409 }
      );
    }

    // Custo (snapshot) desta embalagem = Σ material × custo médio.
    const custoTotal = consumos.reduce((s, c) => round4(s + c.necessario * c.material.custoMedio), 0);
    custoTotalGeral = round4(custoTotalGeral + custoTotal);

    const uso = await tx.usoEmbalagem.create({
      data: {
        embalagemId,
        quantidade: qtdPacotes,
        custoTotal,
        envioId: vinculo.envioId || null,
        pedidoId: vinculo.pedidoId || null,
      },
    });

    for (const { material, necessario } of consumos) {
      const qtdAnterior = material.quantidade;
      const qtdResultante = round4(qtdAnterior - necessario);
      await tx.material.update({ where: { id: material.id }, data: { quantidade: qtdResultante } });
      await tx.movimentacaoEstoque.create({
        data: {
          materialId: material.id, tipo: 'SAIDA_EMBALAGEM',
          quantidadeAnterior: qtdAnterior, quantidadeMovimentada: necessario,
          quantidadeResultante: qtdResultante,
          motivo: `Embalagem: ${embalagem.nome}`,
          envioId: vinculo.envioId || null,
          usoEmbalagemId: uso.id,
        },
      });
    }
  }

  return custoTotalGeral;
}

// Estorna as embalagens usadas (devolve estoque) a partir das movimentações SAIDA_EMBALAGEM
// de um envio, e remove os registros de uso. Usado ao excluir um envio.
async function estornarEmbalagensDoEnvio(tx, envioId) {
  const movs = await tx.movimentacaoEstoque.findMany({
    where: { envioId, tipo: 'SAIDA_EMBALAGEM' },
  });
  for (const mov of movs) {
    const material = await tx.material.findUnique({ where: { id: mov.materialId } });
    const qtdAnterior = material.quantidade;
    const qtdResultante = round4(qtdAnterior + mov.quantidadeMovimentada);
    await tx.material.update({ where: { id: material.id }, data: { quantidade: qtdResultante } });
    await tx.movimentacaoEstoque.create({
      data: {
        materialId: material.id, tipo: 'ESTORNO',
        quantidadeAnterior: qtdAnterior, quantidadeMovimentada: mov.quantidadeMovimentada,
        quantidadeResultante: qtdResultante,
        motivo: `Estorno embalagem por exclusão do envio #${envioId}`,
      },
    });
  }
  await tx.usoEmbalagem.deleteMany({ where: { envioId } });
}

module.exports = { aplicarEmbalagens, estornarEmbalagensDoEnvio };
