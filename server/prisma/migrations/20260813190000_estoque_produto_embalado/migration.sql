-- AlterTable: estoque de produto pronto
ALTER TABLE "Produto" ADD COLUMN "estoque" REAL NOT NULL DEFAULT 0;

-- AlterTable: nova etapa "embalado" e origem do "produzido" (estoque x material)
ALTER TABLE "ItemPedidoPlataforma" ADD COLUMN "produzidoDoEstoque" BOOLEAN;
ALTER TABLE "ItemPedidoPlataforma" ADD COLUMN "embalado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ItemPedidoPlataforma" ADD COLUMN "embaladoEm" DATETIME;
