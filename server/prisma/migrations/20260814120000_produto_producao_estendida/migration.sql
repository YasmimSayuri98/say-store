-- AlterTable: produção estendida (prazo maior na Shopee)
ALTER TABLE "Produto" ADD COLUMN "producaoEstendida" BOOLEAN NOT NULL DEFAULT false;
