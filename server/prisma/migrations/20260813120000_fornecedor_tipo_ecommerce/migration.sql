-- AlterTable: adiciona tipo (física/ecommerce) e nome do ecommerce ao Fornecedor
ALTER TABLE "Fornecedor" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'FISICA';
ALTER TABLE "Fornecedor" ADD COLUMN "ecommerce" TEXT;
