const express = require('express');
const prisma = require('../prisma');
const { round4 } = require('../utils/money');
const { parseDataDia } = require('../utils/data');
const { aplicarEmbalagens } = require('../services/embalagemService');
const router = express.Router();

// Calcula, a partir da ficha técnica do produto, se há estoque suficiente para a quantidade pedida.
function checarEstoque(produto, quantidadePedida) {
  if (!produto || produto.itensFicha.length === 0) return { suficiente: true, faltando: [] };
  const faltando = [];
  for (const fi of produto.itensFicha) {
    const necessario = round4(fi.quantidade * quantidadePedida);
    if (fi.material.quantidade < necessario) {
      faltando.push({
        materialId: fi.materialId, nome: fi.material.nome,
        necessario, disponivel: fi.material.quantidade, unidade: fi.material.unidade.sigla,
      });
    }
  }
  return { suficiente: faltando.length === 0, faltando };
}

// Lista unificada de produção: itens pendentes de QUALQUER plataforma integrada, ordenados por
// prazo de envio. É a lista consumida pelo Dashboard.
router.get('/', async (req, res, next) => {
  try {
    const dias = req.query.dias ? Number(req.query.dias) : 14;
    const limite = new Date(Date.now() + dias * 24 * 3600 * 1000);

    const itens = await prisma.itemPedidoPlataforma.findMany({
      where: {
        enviado: false,
        pedido: { OR: [{ prazoEnvio: null }, { prazoEnvio: { lte: limite } }] },
      },
      include: {
        pedido: { include: { plataforma: true } },
        produto: { include: { itensFicha: { include: { material: { include: { unidade: true } } } } } },
      },
      orderBy: [{ pedido: { prazoEnvio: 'asc' } }],
    });

    const resultado = itens.map((it) => {
      const check = checarEstoque(it.produto, it.quantidade);
      const personalizado = !!(it.produto && it.produto.personalizado);
      const prontoParaEnviar = it.produzido && (!personalizado || it.fotoImpressa);
      return {
        id: it.id,
        pedidoId: it.pedidoId,
        numeroPedido: it.pedido.numeroPedido,
        plataformaId: it.pedido.plataformaId,
        plataformaNome: it.pedido.plataforma.nome,
        prazoEnvio: it.pedido.prazoEnvio,
        statusPedido: it.pedido.status,
        produtoId: it.produtoId,
        produtoNome: it.produto ? it.produto.nome : null,
        skuPlataforma: it.skuPlataforma,
        nomePlataforma: it.nomePlataforma,
        observacao: it.pedido.observacao,
        quantidade: it.quantidade,
        semVinculo: !it.produtoId,
        estoqueSuficiente: check.suficiente,
        faltando: check.faltando,
        personalizado,
        fotoImpressa: it.fotoImpressa,
        produzido: it.produzido,
        fase: prontoParaEnviar ? 'AGUARDANDO_ENVIO' : 'PRODUCAO',
        prontoParaEnviar,
      };
    });

    res.json(resultado);
  } catch (e) { next(e); }
});

// Cadastra um pedido manualmente (ex.: plataforma sem integração de API disponível ainda, como
// a TikTok Shop). Entra na mesma lista de produção, com as mesmas travas de duplicidade dos
// pedidos sincronizados automaticamente.
router.post('/manual', async (req, res, next) => {
  try {
    const { plataformaId, numeroPedido, prazoEnvio, itens, observacao } = req.body;
    if (!plataformaId) return res.status(400).json({ erro: 'Selecione a plataforma.' });
    const numero = numeroPedido ? String(numeroPedido).trim() : '';
    if (!numero) return res.status(400).json({ erro: 'Informe o número do pedido.' });
    if (!Array.isArray(itens) || itens.length === 0) return res.status(400).json({ erro: 'Adicione ao menos um produto.' });

    const plataforma = await prisma.plataformaVenda.findUnique({ where: { id: Number(plataformaId) } });
    if (!plataforma) return res.status(404).json({ erro: 'Plataforma não encontrada.' });

    const jaExistePedido = await prisma.pedidoPlataforma.findUnique({ where: { numeroPedido: numero } });
    if (jaExistePedido) return res.status(409).json({ erro: `Já existe um pedido cadastrado com o número ${numero}.` });
    const jaExisteEnvio = await prisma.registroEnvio.findUnique({ where: { numeroPedido: numero } });
    if (jaExisteEnvio) return res.status(409).json({ erro: `Já existe um envio registrado para o pedido ${numero}.` });

    const idsProdutos = itens.map((it) => Number(it.produtoId));
    const produtos = await prisma.produto.findMany({ where: { id: { in: idsProdutos } } });
    const produtosPorId = new Map(produtos.map((p) => [p.id, p]));
    for (const it of itens) {
      if (!produtosPorId.has(Number(it.produtoId))) return res.status(400).json({ erro: 'Selecione um produto válido em todas as linhas.' });
      if (!(Number(it.quantidade) > 0)) return res.status(400).json({ erro: 'Quantidade deve ser maior que zero em todas as linhas.' });
    }

    const pedido = await prisma.pedidoPlataforma.create({
      data: {
        plataformaId: Number(plataformaId),
        numeroPedido: numero,
        status: 'MANUAL',
        prazoEnvio: parseDataDia(prazoEnvio) || null,
        observacao: observacao && String(observacao).trim() ? String(observacao).trim() : null,
        dataPedido: new Date(),
        itens: {
          create: itens.map((it) => {
            const produto = produtosPorId.get(Number(it.produtoId));
            return {
              produtoId: produto.id,
              skuPlataforma: produto.sku,
              nomePlataforma: produto.nome,
              quantidade: Number(it.quantidade),
            };
          }),
        },
      },
      include: { itens: true },
    });
    res.status(201).json(pedido);
  } catch (e) { next(e); }
});

router.post('/:itemId/produzir', async (req, res, next) => {
  try {
    const itemId = Number(req.params.itemId);
    const resultado = await prisma.$transaction(async (tx) => {
      const item = await tx.itemPedidoPlataforma.findUnique({
        where: { id: itemId },
        include: { pedido: { include: { plataforma: true } }, produto: { include: { itensFicha: { include: { material: true } } } } },
      });
      if (!item) throw Object.assign(new Error('Item não encontrado.'), { status: 404 });
      if (item.produzido) throw Object.assign(new Error('Este item já foi marcado como produzido (estoque já descontado).'), { status: 409 });
      if (!item.produtoId || !item.produto) throw Object.assign(new Error('Vincule um produto do catálogo a este item antes de marcar como produzido.'), { status: 400 });

      // Já existe um envio manual registrado para este número de pedido cobrindo este mesmo
      // produto? Então o estoque já foi descontado por lá — só marca como produzido, sem
      // descontar de novo (evita duplicidade entre Envios e a Produção por plataforma).
      const envioExistente = await tx.registroEnvio.findUnique({
        where: { numeroPedido: item.pedido.numeroPedido },
        include: { itens: true },
      });
      // Um envio manual já cobrindo este pedido representa o ciclo completo (produção + envio),
      // então marca as duas etapas de uma vez, sem descontar o estoque de novo.
      const jaCobertoPorEnvio = envioExistente && envioExistente.itens.some((i) => i.produtoId === item.produtoId);
      if (jaCobertoPorEnvio) {
        const agora = new Date();
        return tx.itemPedidoPlataforma.update({
          where: { id: item.id },
          data: { produzido: true, produzidoEm: agora, envioId: envioExistente.id, enviado: true, enviadoEm: agora },
        });
      }

      if (item.produto.itensFicha.length === 0) throw Object.assign(new Error(`Produto sem ficha técnica: ${item.produto.nome}.`), { status: 400 });

      const consumo = item.produto.itensFicha.map((fi) => ({
        material: fi.material,
        necessario: round4(fi.quantidade * item.quantidade),
      }));
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
            quantidadeAnterior: qtdAnterior, quantidadeMovimentada: necessario,
            quantidadeResultante: qtdResultante,
            motivo: `Produção pedido ${item.pedido.plataforma.nome} ${item.pedido.numeroPedido}`,
            itemPedidoPlataformaId: item.id,
          },
        });
      }

      return tx.itemPedidoPlataforma.update({ where: { id: item.id }, data: { produzido: true, produzidoEm: new Date() } });
    });
    res.json(resultado);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

router.post('/:itemId/desfazer', async (req, res, next) => {
  try {
    const itemId = Number(req.params.itemId);
    const resultado = await prisma.$transaction(async (tx) => {
      const item = await tx.itemPedidoPlataforma.findUnique({
        where: { id: itemId },
        include: { pedido: { include: { plataforma: true } }, produto: { include: { itensFicha: true } } },
      });
      if (!item) throw Object.assign(new Error('Item não encontrado.'), { status: 404 });
      if (!item.produzido) throw Object.assign(new Error('Este item ainda não foi marcado como produzido.'), { status: 400 });
      if (!item.produto) throw Object.assign(new Error('Produto vinculado não encontrado; não é possível desfazer automaticamente.'), { status: 400 });

      for (const fi of item.produto.itensFicha) {
        const necessario = round4(fi.quantidade * item.quantidade);
        const material = await tx.material.findUnique({ where: { id: fi.materialId } });
        const qtdAnterior = material.quantidade;
        const qtdResultante = round4(qtdAnterior + necessario);
        await tx.material.update({ where: { id: material.id }, data: { quantidade: qtdResultante } });
        await tx.movimentacaoEstoque.create({
          data: {
            materialId: material.id, tipo: 'ENTRADA_ESTORNO_PRODUCAO_PLATAFORMA',
            quantidadeAnterior: qtdAnterior, quantidadeMovimentada: necessario,
            quantidadeResultante: qtdResultante,
            motivo: `Estorno produção pedido ${item.pedido.plataforma.nome} ${item.pedido.numeroPedido}`,
            itemPedidoPlataformaId: item.id,
          },
        });
      }

      return tx.itemPedidoPlataforma.update({ where: { id: item.id }, data: { produzido: false, produzidoEm: null } });
    });
    res.json(resultado);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

// Marca/desmarca a impressão da foto do cliente (relevante para produtos personalizados;
// não tem efeito no estoque).
router.post('/:itemId/foto-impressa', async (req, res, next) => {
  try {
    const itemId = Number(req.params.itemId);
    const item = await prisma.itemPedidoPlataforma.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });
    if (item.fotoImpressa) return res.status(409).json({ erro: 'Foto já marcada como impressa.' });
    const atualizado = await prisma.itemPedidoPlataforma.update({
      where: { id: itemId }, data: { fotoImpressa: true, fotoImpressaEm: new Date() },
    });
    res.json(atualizado);
  } catch (e) { next(e); }
});

router.post('/:itemId/foto-impressa/desfazer', async (req, res, next) => {
  try {
    const itemId = Number(req.params.itemId);
    const item = await prisma.itemPedidoPlataforma.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });
    if (!item.fotoImpressa) return res.status(400).json({ erro: 'Foto ainda não estava marcada como impressa.' });
    const atualizado = await prisma.itemPedidoPlataforma.update({
      where: { id: itemId }, data: { fotoImpressa: false, fotoImpressaEm: null },
    });
    res.json(atualizado);
  } catch (e) { next(e); }
});

// Etapa final: marca o item como enviado (some das listas de produção/aguardando envio).
// Aceita `embalagens` (opcional): a embalagem usada é baixada do estoque, vinculada ao pedido.
router.post('/:itemId/enviar', async (req, res, next) => {
  try {
    const itemId = Number(req.params.itemId);
    const resultado = await prisma.$transaction(async (tx) => {
      const item = await tx.itemPedidoPlataforma.findUnique({ where: { id: itemId }, include: { produto: true } });
      if (!item) throw Object.assign(new Error('Item não encontrado.'), { status: 404 });
      if (item.enviado) throw Object.assign(new Error('Este item já foi marcado como enviado.'), { status: 409 });
      if (!item.produzido) throw Object.assign(new Error('Marque o produto como feito antes de enviar.'), { status: 400 });
      if (item.produto && item.produto.personalizado && !item.fotoImpressa) {
        throw Object.assign(new Error('Marque a foto como impressa antes de enviar (produto personalizado).'), { status: 400 });
      }

      await aplicarEmbalagens(tx, req.body.embalagens, { pedidoId: item.pedidoId });

      return tx.itemPedidoPlataforma.update({
        where: { id: itemId }, data: { enviado: true, enviadoEm: new Date() },
      });
    });
    res.json(resultado);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

router.post('/:itemId/enviar/desfazer', async (req, res, next) => {
  try {
    const itemId = Number(req.params.itemId);
    const item = await prisma.itemPedidoPlataforma.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });
    if (!item.enviado) return res.status(400).json({ erro: 'Este item ainda não estava marcado como enviado.' });
    const atualizado = await prisma.itemPedidoPlataforma.update({
      where: { id: itemId }, data: { enviado: false, enviadoEm: null },
    });
    res.json(atualizado);
  } catch (e) { next(e); }
});

router.put('/:itemId/vincular', async (req, res, next) => {
  try {
    const itemId = Number(req.params.itemId);
    const { produtoId } = req.body;
    if (!produtoId) return res.status(400).json({ erro: 'Informe o produto.' });
    const produto = await prisma.produto.findUnique({ where: { id: Number(produtoId) } });
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
    const item = await prisma.itemPedidoPlataforma.update({ where: { id: itemId }, data: { produtoId: produto.id } });
    res.json(item);
  } catch (e) { next(e); }
});

// Editar um pedido da lista de produção: número, prazo de envio e (se ainda não produzido)
// o produto e a quantidade.
router.put('/:itemId', async (req, res, next) => {
  try {
    const itemId = Number(req.params.itemId);
    const { numeroPedido, prazoEnvio, produtoId, quantidade, plataformaId, observacao } = req.body;

    const item = await prisma.itemPedidoPlataforma.findUnique({ where: { id: itemId }, include: { pedido: true } });
    if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });

    // Plataforma (se mudou): valida que existe.
    let novaPlataformaId = item.pedido.plataformaId;
    if (plataformaId != null && Number(plataformaId) !== item.pedido.plataformaId) {
      const plataforma = await prisma.plataformaVenda.findUnique({ where: { id: Number(plataformaId) } });
      if (!plataforma) return res.status(404).json({ erro: 'Plataforma não encontrada.' });
      novaPlataformaId = plataforma.id;
    }

    // Número do pedido (se mudou): não pode colidir com outro pedido nem com um envio.
    const novoNumero = numeroPedido != null && String(numeroPedido).trim() ? String(numeroPedido).trim() : item.pedido.numeroPedido;
    if (novoNumero !== item.pedido.numeroPedido) {
      const jaPedido = await prisma.pedidoPlataforma.findUnique({ where: { numeroPedido: novoNumero } });
      if (jaPedido) return res.status(409).json({ erro: `Já existe um pedido com o número ${novoNumero}.` });
      const jaEnvio = await prisma.registroEnvio.findUnique({ where: { numeroPedido: novoNumero } });
      if (jaEnvio) return res.status(409).json({ erro: `Já existe um envio registrado para o pedido ${novoNumero}.` });
    }

    // Produto/quantidade só podem mudar enquanto o item não foi produzido (estoque ainda não descontado).
    const querMudarProduto = produtoId != null && Number(produtoId) !== item.produtoId;
    const querMudarQtd = quantidade != null && Number(quantidade) !== item.quantidade;
    const dataItem = {};
    if (querMudarProduto || querMudarQtd) {
      if (item.produzido) {
        return res.status(400).json({ erro: 'Este item já foi produzido (estoque descontado). Para mudar o produto ou a quantidade, exclua e cadastre de novo.' });
      }
      const idProduto = Number(produtoId != null ? produtoId : item.produtoId);
      const produto = await prisma.produto.findUnique({ where: { id: idProduto } });
      if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
      const qtd = Number(quantidade != null ? quantidade : item.quantidade);
      if (!(qtd > 0)) return res.status(400).json({ erro: 'Quantidade deve ser maior que zero.' });
      dataItem.produtoId = produto.id;
      dataItem.skuPlataforma = produto.sku;
      dataItem.nomePlataforma = produto.nome;
      dataItem.quantidade = qtd;
    }

    await prisma.$transaction(async (tx) => {
      await tx.pedidoPlataforma.update({
        where: { id: item.pedidoId },
        data: {
          numeroPedido: novoNumero,
          prazoEnvio: parseDataDia(prazoEnvio) || null,
          plataformaId: novaPlataformaId,
          ...(observacao !== undefined ? { observacao: observacao && String(observacao).trim() ? String(observacao).trim() : null } : {}),
        },
      });
      if (Object.keys(dataItem).length) {
        await tx.itemPedidoPlataforma.update({ where: { id: itemId }, data: dataItem });
      }
    });
    res.json({ ok: true });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

// Excluir um item/pedido da lista de produção. Se o estoque já tiver sido descontado por este
// item (produzido pela própria lista, sem envio manual), o estoque é estornado antes de excluir.
router.delete('/:itemId', async (req, res, next) => {
  try {
    const itemId = Number(req.params.itemId);
    await prisma.$transaction(async (tx) => {
      const item = await tx.itemPedidoPlataforma.findUnique({
        where: { id: itemId },
        include: { pedido: { include: { plataforma: true } }, produto: { include: { itensFicha: true } } },
      });
      if (!item) throw Object.assign(new Error('Item não encontrado.'), { status: 404 });

      // Estorna estoque só se foi descontado por esta produção (produzido e sem envio manual associado).
      if (item.produzido && !item.envioId && item.produto) {
        for (const fi of item.produto.itensFicha) {
          const necessario = round4(fi.quantidade * item.quantidade);
          const material = await tx.material.findUnique({ where: { id: fi.materialId } });
          const qtdAnterior = material.quantidade;
          const qtdResultante = round4(qtdAnterior + necessario);
          await tx.material.update({ where: { id: material.id }, data: { quantidade: qtdResultante } });
          await tx.movimentacaoEstoque.create({
            data: {
              materialId: material.id, tipo: 'ENTRADA_ESTORNO_PRODUCAO_PLATAFORMA',
              quantidadeAnterior: qtdAnterior, quantidadeMovimentada: necessario,
              quantidadeResultante: qtdResultante,
              motivo: `Estorno por exclusão do pedido ${item.pedido.plataforma.nome} ${item.pedido.numeroPedido}`,
            },
          });
        }
      }

      await tx.itemPedidoPlataforma.delete({ where: { id: itemId } });
      // Se o pedido ficou sem itens, remove o pedido também.
      const restantes = await tx.itemPedidoPlataforma.count({ where: { pedidoId: item.pedidoId } });
      if (restantes === 0) await tx.pedidoPlataforma.delete({ where: { id: item.pedidoId } });
    });
    res.status(204).end();
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
});

module.exports = router;
