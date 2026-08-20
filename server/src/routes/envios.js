const express = require('express');
const prisma = require('../prisma');
const { round4 } = require('../utils/money');
const { parseDataDia } = require('../utils/data');
const { custoFinalProduto, financeiroUnitario } = require('../services/precoService');
const { aplicarEmbalagens, estornarEmbalagensDoEnvio } = require('../services/embalagemService');
const router = express.Router();

// Consolida o consumo de materiais a partir de uma lista de {produtoId, quantidade}.
// `produtoIdsJaProduzidos` são produtos deste mesmo pedido que já tiveram o estoque descontado
// pelo checklist de Produção (aguardando envio) — não descontamos de novo, só finalizamos o ciclo.
async function calcularConsumo(db, itens, produtoIdsJaProduzidos = new Set()) {
  const consumo = new Map(); // materialId -> { material, quantidade }
  for (const it of itens) {
    const produtoId = Number(it.produtoId);
    const qtdEnviada = round4(it.quantidade);
    if (!(qtdEnviada > 0)) throw Object.assign(new Error('Quantidade enviada deve ser maior que zero.'), { status: 400 });
    const produto = await db.produto.findUnique({
      where: { id: produtoId },
      include: { itensFicha: { include: { material: { include: { unidade: true } } } } },
    });
    if (!produto) throw Object.assign(new Error('Produto não encontrado.'), { status: 404 });
    if (!produto.ativo) throw Object.assign(new Error(`Produto inativo não pode ser enviado: ${produto.nome}.`), { status: 400 });
    if (produtoIdsJaProduzidos.has(produtoId)) continue;
    if (produto.itensFicha.length === 0) throw Object.assign(new Error(`Produto sem ficha técnica: ${produto.nome}.`), { status: 400 });

    for (const item of produto.itensFicha) {
      const total = round4(item.quantidade * qtdEnviada);
      const atual = consumo.get(item.materialId);
      if (atual) atual.quantidade = round4(atual.quantidade + total);
      else consumo.set(item.materialId, { material: item.material, quantidade: total });
    }
  }
  return consumo;
}

function montarResumo(consumo) {
  const materiais = [];
  let custoTotal = 0;
  let temInsuficiente = false;
  for (const { material, quantidade } of consumo.values()) {
    const custo = round4(quantidade * material.custoMedio);
    custoTotal = round4(custoTotal + custo);
    const suficiente = material.quantidade >= quantidade;
    if (!suficiente) temInsuficiente = true;
    materiais.push({
      materialId: material.id,
      nome: material.nome,
      unidade: material.unidade.sigla,
      necessario: quantidade,
      disponivel: material.quantidade,
      faltando: suficiente ? 0 : round4(quantidade - material.quantidade),
      custoMedio: material.custoMedio,
      custo,
      suficiente,
    });
  }
  return { materiais, custoTotal, temInsuficiente };
}

// Calcula o financeiro do envio (faturamento, taxas, custo dos produtos e lucro),
// usando o preço de venda de cada produto na plataforma escolhida.
async function calcularFinanceiro(db, itens, plataformaId) {
  if (!plataformaId) {
    return {
      plataforma: null,
      itens: [],
      totalUnidades: 0,
      faturamentoBruto: 0,
      totalTaxas: 0,
      custoTotalProdutos: 0,
      lucro: 0,
      semPreco: [],
    };
  }
  const plataforma = await db.plataformaVenda.findUnique({ where: { id: Number(plataformaId) } });
  if (!plataforma) throw Object.assign(new Error('Plataforma não encontrada.'), { status: 404 });

  const linhas = [];
  const semPreco = [];
  let faturamentoBruto = 0, totalTaxas = 0, custoTotalProdutos = 0, totalUnidades = 0;

  for (const it of itens) {
    const produtoId = Number(it.produtoId);
    const qtd = round4(it.quantidade);
    const produto = await db.produto.findUnique({
      where: { id: produtoId },
      include: { precos: { where: { plataformaId: Number(plataformaId) } } },
    });
    const custoFinal = custoFinalProduto(produto);
    const preco = produto.precos[0] ? produto.precos[0].precoVenda : 0;
    if (!(preco > 0)) semPreco.push(produto.nome);
    const fin = financeiroUnitario(preco, custoFinal, plataforma);

    const faturamentoItem = round4(fin.preco * qtd);
    const taxasItem = round4(fin.taxas * qtd);
    const custoItem = round4(custoFinal * qtd);
    const lucroItem = round4(faturamentoItem - taxasItem - custoItem);

    faturamentoBruto = round4(faturamentoBruto + faturamentoItem);
    totalTaxas = round4(totalTaxas + taxasItem);
    custoTotalProdutos = round4(custoTotalProdutos + custoItem);
    totalUnidades = round4(totalUnidades + qtd);

    linhas.push({
      produtoId, nome: produto.nome, quantidade: qtd,
      precoVendaUnitario: fin.preco, custoUnitario: custoFinal,
      faturamento: faturamentoItem, taxas: taxasItem, lucro: lucroItem,
    });
  }

  const lucro = round4(faturamentoBruto - totalTaxas - custoTotalProdutos);
  const margem = faturamentoBruto > 0 ? round4((lucro / faturamentoBruto) * 100) : 0;

  return {
    plataforma, itens: linhas, totalUnidades,
    faturamentoBruto, totalTaxas, custoTotalProdutos, lucro, margem, semPreco,
  };
}

// Valida o número do pedido informado (opcional): impede registrar o mesmo pedido duas vezes
// via Envios, e impede registrar um envio para um pedido que já teve baixa de estoque pela
// Produção (Shopee/TikTok/...). Retorna o PedidoPlataforma correspondente (se existir) para
// permitir o vínculo automático dos itens ainda pendentes na confirmação.
async function validarNumeroPedido(db, numeroPedidoBruto) {
  const numeroPedido = numeroPedidoBruto ? String(numeroPedidoBruto).trim() : '';
  if (!numeroPedido) return { numeroPedido: null, pedidoPlataforma: null };

  const envioExistente = await db.registroEnvio.findUnique({ where: { numeroPedido } });
  if (envioExistente) {
    throw Object.assign(
      new Error(`Já existe um envio registrado para o pedido ${numeroPedido} (envio #${envioExistente.id}).`),
      { status: 409 }
    );
  }

  const pedidoPlataforma = await db.pedidoPlataforma.findUnique({
    where: { numeroPedido },
    include: { itens: true, plataforma: true },
  });
  if (pedidoPlataforma) {
    // Bloqueia só se já estiver totalmente concluído (enviado). Um item já "produzido" mas ainda
    // aguardando envio pode ser finalizado por este mesmo envio manual (ver vínculo automático abaixo).
    const jaEnviado = pedidoPlataforma.itens.find((i) => i.enviado);
    if (jaEnviado) {
      const quando = jaEnviado.enviadoEm ? new Date(jaEnviado.enviadoEm).toLocaleDateString('pt-BR') : '';
      throw Object.assign(
        new Error(`O pedido ${numeroPedido} já foi marcado como enviado pela Produção (${pedidoPlataforma.plataforma.nome})${quando ? ' em ' + quando : ''}. Não é possível registrar este envio novamente.`),
        { status: 409 }
      );
    }
  }
  return { numeroPedido, pedidoPlataforma };
}

// Produtos deste pedido já produzidos (aguardando envio) — não devem ter o estoque descontado de novo.
function produtoIdsJaProduzidos(pedidoPlataforma) {
  if (!pedidoPlataforma) return new Set();
  return new Set(
    pedidoPlataforma.itens.filter((i) => i.produzido && !i.enviado && i.produtoId).map((i) => i.produtoId)
  );
}

// Preview: valida e retorna resumo sem gravar
router.post('/preview', async (req, res, next) => {
  try {
    const itens = Array.isArray(req.body.itens) ? req.body.itens : [];
    if (itens.length === 0) return res.status(400).json({ erro: 'Informe ao menos um produto.' });
    const { pedidoPlataforma } = await validarNumeroPedido(prisma, req.body.numeroPedido);
    const consumo = await calcularConsumo(prisma, itens, produtoIdsJaProduzidos(pedidoPlataforma));
    const resumo = montarResumo(consumo);
    const financeiro = await calcularFinanceiro(prisma, itens, req.body.plataformaId);
    res.json({ ...resumo, financeiro });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

// Confirmar envio: baixa transacional
router.post('/', async (req, res, next) => {
  try {
    const itens = Array.isArray(req.body.itens) ? req.body.itens : [];
    if (itens.length === 0) return res.status(400).json({ erro: 'Informe ao menos um produto.' });
    const embsValidas = (Array.isArray(req.body.embalagens) ? req.body.embalagens : []).filter((e) => e && e.embalagemId && Number(e.quantidade) > 0);
    if (embsValidas.length === 0) return res.status(400).json({ erro: 'Selecione a embalagem usada no envio.' });

    const resultado = await prisma.$transaction(async (tx) => {
      const { numeroPedido, pedidoPlataforma } = await validarNumeroPedido(tx, req.body.numeroPedido);
      const consumo = await calcularConsumo(tx, itens, produtoIdsJaProduzidos(pedidoPlataforma));
      const resumo = montarResumo(consumo);
      if (resumo.temInsuficiente) {
        const falta = resumo.materiais.find((m) => !m.suficiente);
        throw Object.assign(
          new Error(`Não é possível confirmar este envio. O material ${falta.nome} possui ${falta.disponivel} ${falta.unidade} disponíveis, mas são necessários ${falta.necessario} ${falta.unidade}. Faltam ${falta.faltando} ${falta.unidade}.`),
          { status: 409 }
        );
      }

      const financeiro = await calcularFinanceiro(tx, itens, req.body.plataformaId);
      const finPorProduto = new Map(financeiro.itens.map((l) => [l.produtoId, l]));

      const envio = await tx.registroEnvio.create({
        data: {
          dataEnvio: parseDataDia(req.body.dataEnvio) || new Date(),
          observacao: req.body.observacao || null,
          numeroPedido,
          custoTotalMateriais: resumo.custoTotal,
          plataformaId: req.body.plataformaId ? Number(req.body.plataformaId) : null,
          faturamentoBruto: financeiro.faturamentoBruto,
          totalTaxas: financeiro.totalTaxas,
          custoTotalProdutos: financeiro.custoTotalProdutos,
          lucro: financeiro.lucro,
          itens: {
            create: itens.map((it) => {
              const fin = finPorProduto.get(Number(it.produtoId));
              return {
                produtoId: Number(it.produtoId),
                quantidade: round4(it.quantidade),
                precoVendaUnitario: fin ? fin.precoVendaUnitario : 0,
                custoUnitario: fin ? fin.custoUnitario : 0,
              };
            }),
          },
        },
      });

      for (const { material, quantidade } of consumo.values()) {
        const qtdAnterior = material.quantidade;
        const qtdResultante = round4(qtdAnterior - quantidade);
        await tx.material.update({ where: { id: material.id }, data: { quantidade: qtdResultante } });
        await tx.movimentacaoEstoque.create({
          data: {
            materialId: material.id, tipo: 'SAIDA_ENVIO',
            quantidadeAnterior: qtdAnterior, quantidadeMovimentada: quantidade,
            quantidadeResultante: qtdResultante, motivo: 'Saída por envio de produto',
            envioId: envio.id,
          },
        });
      }

      // Embalagem usada neste envio (opcional): baixa os materiais de embalagem do estoque e
      // grava o custo (não afeta o lucro do produto — é controle separado).
      const custoEmbalagem = await aplicarEmbalagens(tx, req.body.embalagens, { envioId: envio.id });
      if (custoEmbalagem > 0) {
        await tx.registroEnvio.update({ where: { id: envio.id }, data: { custoEmbalagem } });
        envio.custoEmbalagem = custoEmbalagem; // reflete no objeto retornado
      }

      // Vincula automaticamente os itens ainda pendentes desse pedido na Produção por plataforma
      // (mesmo produto incluído neste envio), marcando como produzidos E enviados SEM descontar
      // o estoque de novo — a baixa já foi feita acima pelo envio manual, e o próprio envio já
      // representa o ciclo completo (produção + envio).
      if (pedidoPlataforma) {
        const agora = new Date();
        const produtoIdsDoEnvio = new Set(itens.map((it) => Number(it.produtoId)));
        const paraVincular = pedidoPlataforma.itens.filter((i) => !i.enviado && i.produtoId && produtoIdsDoEnvio.has(i.produtoId));
        for (const i of paraVincular) {
          await tx.itemPedidoPlataforma.update({
            where: { id: i.id },
            data: {
              produzido: true, produzidoEm: i.produzido ? i.produzidoEm : agora,
              envioId: envio.id, enviado: true, enviadoEm: agora,
            },
          });
        }
      }

      return envio;
    });

    res.status(201).json(resultado);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { plataformaId } = req.query;
    const where = {};
    if (plataformaId === 'sem') where.plataformaId = null;
    else if (plataformaId) where.plataformaId = Number(plataformaId);
    const envios = await prisma.registroEnvio.findMany({
      where,
      include: { itens: { include: { produto: true } }, plataforma: true },
      orderBy: { dataEnvio: 'desc' },
    });
    res.json(envios);
  } catch (e) { next(e); }
});

// Excluir um envio: estorna o estoque consumido, desfaz o vínculo com a Produção por plataforma
// (os itens voltam a ficar pendentes) e remove o registro do histórico.
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.$transaction(async (tx) => {
      const envio = await tx.registroEnvio.findUnique({
        where: { id },
        include: { movimentacoes: { include: { material: true } }, itensPedidosPlataforma: true },
      });
      if (!envio) throw Object.assign(new Error('Envio não encontrado.'), { status: 404 });

      // Estorna o estoque descontado por este envio (movimentações de saída).
      for (const mov of envio.movimentacoes) {
        if (mov.tipo !== 'SAIDA_ENVIO') continue;
        const material = await tx.material.findUnique({ where: { id: mov.materialId } });
        const qtdAnterior = material.quantidade;
        const qtdResultante = round4(qtdAnterior + mov.quantidadeMovimentada);
        await tx.material.update({ where: { id: material.id }, data: { quantidade: qtdResultante } });
        await tx.movimentacaoEstoque.create({
          data: {
            materialId: material.id, tipo: 'ESTORNO',
            quantidadeAnterior: qtdAnterior, quantidadeMovimentada: mov.quantidadeMovimentada,
            quantidadeResultante: qtdResultante,
            motivo: `Estorno por exclusão do envio #${envio.id}`,
          },
        });
      }

      // Estorna também os materiais de embalagem usados neste envio.
      await estornarEmbalagensDoEnvio(tx, id);

      // Os itens de pedido de plataforma cobertos por este envio voltam a ficar pendentes
      // (produção + envio desfeitos), já que o estoque foi devolvido acima.
      for (const it of envio.itensPedidosPlataforma) {
        await tx.itemPedidoPlataforma.update({
          where: { id: it.id },
          data: { envioId: null, produzido: false, produzidoEm: null, enviado: false, enviadoEm: null },
        });
      }

      // Solta as movimentações antigas deste envio antes de removê-lo (FK ON DELETE SET NULL,
      // mas garantimos explicitamente para não deixar histórico órfão apontando para o envio).
      await tx.movimentacaoEstoque.updateMany({ where: { envioId: id }, data: { envioId: null } });

      // Remove o envio (ItemRegistroEnvio é apagado em cascata).
      await tx.registroEnvio.delete({ where: { id } });
    });
    res.status(204).end();
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const envio = await prisma.registroEnvio.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        itens: { include: { produto: true } },
        plataforma: true,
        movimentacoes: { include: { material: { include: { unidade: true } } } },
      },
    });
    if (!envio) return res.status(404).json({ erro: 'Envio não encontrado.' });
    res.json(envio);
  } catch (e) { next(e); }
});

// Preenche o faturamento/lucro APENAS dos envios que ficaram SEM preço (itens com
// precoVendaUnitario = 0) — tipicamente o backlog de vendas registradas antes de existir
// a precificação. Vendas já com preço registrado NÃO são alteradas, para não sobrescrever
// o histórico correto quando a precificação muda daqui pra frente.
router.post('/recalcular', async (req, res, next) => {
  try {
    const envios = await prisma.registroEnvio.findMany({ include: { itens: true }, orderBy: { id: 'asc' } });
    let atualizados = 0;
    for (const envio of envios) {
      if (!envio.plataformaId) continue; // sem plataforma não há preço de venda/lucro
      // Só mexe em envios com ao menos um item sem preço (backlog). Os demais ficam intactos.
      const temItemSemPreco = envio.itens.some((it) => !(Number(it.precoVendaUnitario) > 0));
      if (!temItemSemPreco) continue;

      const plataforma = await prisma.plataformaVenda.findUnique({ where: { id: envio.plataformaId } });
      if (!plataforma) continue;

      let faturamento = 0, taxas = 0, custoProdutos = 0, custoMateriais = 0;
      for (const it of envio.itens) {
        const produto = await prisma.produto.findUnique({
          where: { id: it.produtoId },
          include: { precos: { where: { plataformaId: envio.plataformaId } } },
        });
        if (!produto) continue;
        const q = it.quantidade;
        const jaPrecificado = Number(it.precoVendaUnitario) > 0;
        // Itens já com preço mantêm o snapshot original; só os sem preço são preenchidos.
        const custoFinal = jaPrecificado
          ? (Number(it.custoUnitario) || custoFinalProduto(produto))
          : custoFinalProduto(produto);
        const preco = jaPrecificado
          ? Number(it.precoVendaUnitario)
          : (produto.precos[0] ? produto.precos[0].precoVenda : 0);
        const fin = financeiroUnitario(preco, custoFinal, plataforma);
        faturamento = round4(faturamento + fin.preco * q);
        taxas = round4(taxas + fin.taxas * q);
        custoProdutos = round4(custoProdutos + custoFinal * q);
        custoMateriais = round4(custoMateriais + (produto.custoAtualMateriais || 0) * q);
        if (!jaPrecificado) {
          await prisma.itemRegistroEnvio.update({ where: { id: it.id }, data: { precoVendaUnitario: fin.preco, custoUnitario: custoFinal } });
        }
      }
      const lucro = round4(faturamento - taxas - custoProdutos);
      await prisma.registroEnvio.update({
        where: { id: envio.id },
        data: { faturamentoBruto: faturamento, totalTaxas: taxas, custoTotalProdutos: custoProdutos, custoTotalMateriais: custoMateriais, lucro },
      });
      atualizados++;
    }
    res.json({ atualizados });
  } catch (e) { next(e); }
});

module.exports = router;
