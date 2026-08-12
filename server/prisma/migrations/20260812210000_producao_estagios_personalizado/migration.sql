-- AlterTable
ALTER TABLE "Produto" ADD COLUMN "personalizado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ItemPedidoPlataforma" ADD COLUMN "fotoImpressa" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ItemPedidoPlataforma" ADD COLUMN "fotoImpressaEm" DATETIME;
ALTER TABLE "ItemPedidoPlataforma" ADD COLUMN "enviado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ItemPedidoPlataforma" ADD COLUMN "enviadoEm" DATETIME;
