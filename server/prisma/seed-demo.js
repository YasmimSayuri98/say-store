const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Categorias
  const categorias = ['Filamento', 'Acessório', 'Material de produção', 'Embalagem', 'Material de envio', 'Etiqueta', 'Outros'];
  for (const nome of categorias) {
    await prisma.categoriaMaterial.upsert({ where: { nome }, update: {}, create: { nome } });
  }

  // Unidades
  const unidades = [
    { nome: 'Grama', sigla: 'g', grandeza: 'massa' },
    { nome: 'Quilograma', sigla: 'kg', grandeza: 'massa' },
    { nome: 'Mililitro', sigla: 'ml', grandeza: 'volume' },
    { nome: 'Litro', sigla: 'l', grandeza: 'volume' },
    { nome: 'Centímetro', sigla: 'cm', grandeza: 'comprimento' },
    { nome: 'Metro', sigla: 'm', grandeza: 'comprimento' },
    { nome: 'Unidade', sigla: 'un', grandeza: 'contagem' },
    { nome: 'Rolo', sigla: 'rolo', grandeza: 'contagem' },
    { nome: 'Pacote', sigla: 'pct', grandeza: 'contagem' },
  ];
  for (const u of unidades) {
    await prisma.unidadeMedida.upsert({ where: { sigla: u.sigla }, update: {}, create: u });
  }

  const cat = async (nome) => (await prisma.categoriaMaterial.findUnique({ where: { nome } })).id;
  const uni = async (sigla) => (await prisma.unidadeMedida.findUnique({ where: { sigla } })).id;

  // Fornecedor
  const forn = await prisma.fornecedor.upsert({ where: { nome: 'Loja 3D Brasil' }, update: {}, create: { nome: 'Loja 3D Brasil' } });

  // Materiais de demonstração
  const materiaisSeed = [
    { nome: 'PLA branco', categoria: 'Filamento', sigla: 'g', quantidade: 1500, minima: 300, custoMedio: 0.1133,
      filamento: { tipo: 'PLA', marca: 'Genérica', cor: 'Branco', pesoOriginalRolo: 1000, pesoDisponivel: 1500 } },
    { nome: 'PLA preto', categoria: 'Filamento', sigla: 'g', quantidade: 800, minima: 300, custoMedio: 0.12,
      filamento: { tipo: 'PLA', marca: 'Genérica', cor: 'Preto', pesoOriginalRolo: 1000, pesoDisponivel: 800 } },
    { nome: 'Cola', categoria: 'Material de produção', sigla: 'g', quantidade: 200, minima: 50, custoMedio: 0.05 },
    { nome: 'Argola', categoria: 'Acessório', sigla: 'un', quantidade: 100, minima: 20, custoMedio: 0.30 },
    { nome: 'Ímã', categoria: 'Acessório', sigla: 'un', quantidade: 60, minima: 20, custoMedio: 0.40 },
    { nome: 'Caixa de envio', categoria: 'Material de envio', sigla: 'un', quantidade: 40, minima: 15, custoMedio: 1.20 },
    { nome: 'Etiqueta', categoria: 'Etiqueta', sigla: 'un', quantidade: 500, minima: 100, custoMedio: 0.15 },
    { nome: 'Fita adesiva', categoria: 'Embalagem', sigla: 'cm', quantidade: 5000, minima: 1000, custoMedio: 0.002 },
  ];

  const matIds = {};
  for (const m of materiaisSeed) {
    const material = await prisma.material.create({
      data: {
        nome: m.nome, categoriaId: await cat(m.categoria), unidadeId: await uni(m.sigla),
        quantidade: m.quantidade, quantidadeMinima: m.minima, custoMedio: m.custoMedio,
        filamento: m.filamento ? { create: m.filamento } : undefined,
      },
    });
    matIds[m.nome] = material.id;
    // Registra uma entrada inicial e movimentação para histórico
    await prisma.entradaEstoque.create({
      data: { materialId: material.id, quantidade: m.quantidade, valorTotal: Math.round(m.quantidade * m.custoMedio * 100) / 100,
        custoUnitario: m.custoMedio, custoMedioApos: m.custoMedio, fornecedorId: forn.id, observacao: 'Estoque inicial (seed)' },
    });
    await prisma.movimentacaoEstoque.create({
      data: { materialId: material.id, tipo: 'ENTRADA_COMPRA', quantidadeAnterior: 0, quantidadeMovimentada: m.quantidade,
        quantidadeResultante: m.quantidade, motivo: 'Estoque inicial (seed)' },
    });
  }

  // Produtos + fichas técnicas
  const chaveiro = await prisma.produto.create({ data: { nome: 'Chaveiro personalizado', sku: 'CHV-001', descricao: 'Chaveiro impresso em 3D' } });
  const carrossel = await prisma.produto.create({ data: { nome: 'Carrossel de fotos', sku: 'CAR-001', descricao: 'Carrossel decorativo' } });
  const letreiro = await prisma.produto.create({ data: { nome: 'Letreiro 3D', sku: 'LET-001', descricao: 'Letreiro personalizado' } });

  const ficha = async (produtoId, itens) => {
    for (const it of itens) {
      await prisma.itemFichaTecnica.create({ data: { produtoId, materialId: matIds[it.material], quantidade: it.qtd } });
    }
  };

  await ficha(chaveiro.id, [
    { material: 'PLA branco', qtd: 20 }, { material: 'PLA preto', qtd: 5 }, { material: 'Argola', qtd: 1 },
    { material: 'Cola', qtd: 2 }, { material: 'Etiqueta', qtd: 1 }, { material: 'Caixa de envio', qtd: 1 }, { material: 'Fita adesiva', qtd: 30 },
  ]);
  await ficha(carrossel.id, [
    { material: 'PLA branco', qtd: 120 }, { material: 'Cola', qtd: 5 }, { material: 'Ímã', qtd: 2 },
    { material: 'Etiqueta', qtd: 1 }, { material: 'Caixa de envio', qtd: 1 }, { material: 'Fita adesiva', qtd: 50 },
  ]);
  await ficha(letreiro.id, [
    { material: 'PLA preto', qtd: 200 }, { material: 'Cola', qtd: 10 }, { material: 'Etiqueta', qtd: 1 },
    { material: 'Caixa de envio', qtd: 1 }, { material: 'Fita adesiva', qtd: 60 },
  ]);

  // Recalcular custos dos produtos
  const { recalcularCustoProduto } = require('../src/services/custoService');
  for (const p of [chaveiro, carrossel, letreiro]) await recalcularCustoProduto(prisma, p.id);

  // Plataformas de venda (idempotente — a migration já as insere, aqui garantimos no reset)
  const plataformasSeed = [
    { nome: 'Shopee', comissaoPercentual: 14, taxaFixaPorItem: 4, percentualFreteGratis: 6 },
    { nome: 'TikTok Shop', comissaoPercentual: 6, taxaFixaPorItem: 6, percentualFreteGratis: 0 },
  ];
  for (const pl of plataformasSeed) {
    await prisma.plataformaVenda.upsert({ where: { nome: pl.nome }, update: {}, create: pl });
  }
  const plataformas = await prisma.plataformaVenda.findMany();

  // Margem alvo, custos extras e preços de venda de exemplo por plataforma
  const { custoFinalProduto, precoSugerido } = require('../src/services/precoService');
  const precificacaoSeed = [
    { produto: chaveiro, custosExtras: 0.5, margem: 30 },
    { produto: carrossel, custosExtras: 1.5, margem: 35 },
    { produto: letreiro, custosExtras: 2.0, margem: 35 },
  ];
  for (const pr of precificacaoSeed) {
    await prisma.produto.update({
      where: { id: pr.produto.id },
      data: { custosExtras: pr.custosExtras, margemLucroAlvo: pr.margem },
    });
    const prod = await prisma.produto.findUnique({ where: { id: pr.produto.id } });
    const custoFinal = custoFinalProduto(prod);
    for (const pl of plataformas) {
      const preco = precoSugerido(custoFinal, pl, pr.margem) || 0;
      await prisma.precoProduto.upsert({
        where: { produtoId_plataformaId: { produtoId: prod.id, plataformaId: pl.id } },
        update: { precoVenda: preco },
        create: { produtoId: prod.id, plataformaId: pl.id, precoVenda: preco },
      });
    }
  }

  // Contas financeiras e configuração (idempotente).
  // Saldo disponível fica no banco Cora; o lucro no banco Inter.
  const contasSeed = [
    { nome: 'Cora', tipo: 'BANCO' },
    { nome: 'Inter', tipo: 'RESERVA_LUCRO' },
  ];
  for (const c of contasSeed) {
    await prisma.contaFinanceira.upsert({ where: { nome: c.nome }, update: {}, create: c });
  }
  const contaOperacional = await prisma.contaFinanceira.findUnique({ where: { nome: 'Cora' } });
  const contaLucro = await prisma.contaFinanceira.findUnique({ where: { nome: 'Inter' } });
  await prisma.configuracaoFinanceira.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, percentualLucroPadrao: 20, contaOperacionalPadraoId: contaOperacional.id, contaLucroPadraoId: contaLucro.id },
  });

  console.log('Seed concluído com sucesso.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
