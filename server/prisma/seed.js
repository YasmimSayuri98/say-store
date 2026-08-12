const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Seed LIMPO: cria apenas a configuração básica para o sistema começar a ser usado
// (unidades, categorias, plataformas com taxas e contas financeiras). Não cria materiais,
// produtos, fichas, preços nem pedidos de exemplo. Totalmente idempotente (só upserts).
// Para popular com dados de demonstração, use: node prisma/seed-demo.js
async function main() {
  // Categorias de material
  const categorias = ['Filamento', 'Acessório', 'Material de produção', 'Embalagem', 'Material de envio', 'Etiqueta', 'Outros'];
  for (const nome of categorias) {
    await prisma.categoriaMaterial.upsert({ where: { nome }, update: {}, create: { nome } });
  }

  // Unidades de medida
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

  // Plataformas de venda (taxas de referência — ajuste depois conforme seu contrato)
  const plataformasSeed = [
    { nome: 'Shopee', comissaoPercentual: 14, taxaFixaPorItem: 4, percentualFreteGratis: 6 },
    { nome: 'TikTok Shop', comissaoPercentual: 6, taxaFixaPorItem: 6, percentualFreteGratis: 0 },
  ];
  for (const pl of plataformasSeed) {
    await prisma.plataformaVenda.upsert({ where: { nome: pl.nome }, update: {}, create: pl });
  }

  // Contas financeiras: saldo disponível no Cora, reserva de lucro no Inter
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

  console.log('Seed limpo concluído: configuração básica pronta, sem dados de exemplo.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
