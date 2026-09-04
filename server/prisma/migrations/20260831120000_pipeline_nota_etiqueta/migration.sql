-- Pipeline do Dashboard: status de emissão de nota e de etiqueta por pedido
ALTER TABLE "PedidoPlataforma" ADD COLUMN "notaEmitida" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PedidoPlataforma" ADD COLUMN "notaEmitidaEm" DATETIME;
ALTER TABLE "PedidoPlataforma" ADD COLUMN "etiquetaGerada" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PedidoPlataforma" ADD COLUMN "etiquetaGeradaEm" DATETIME;

-- Pedidos que já existem não devem regredir para a etapa de emissão: marca como já emitido/etiquetado.
UPDATE "PedidoPlataforma" SET "notaEmitida" = true, "notaEmitidaEm" = CURRENT_TIMESTAMP, "etiquetaGerada" = true, "etiquetaGeradaEm" = CURRENT_TIMESTAMP;
