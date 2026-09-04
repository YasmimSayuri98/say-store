-- Dados fiscais (NF-e) por produto
ALTER TABLE "Produto" ADD COLUMN "ncm" TEXT;
ALTER TABLE "Produto" ADD COLUMN "cfop" TEXT;
ALTER TABLE "Produto" ADD COLUMN "origemMercadoria" TEXT NOT NULL DEFAULT '0';
ALTER TABLE "Produto" ADD COLUMN "csosn" TEXT;
ALTER TABLE "Produto" ADD COLUMN "cest" TEXT;
ALTER TABLE "Produto" ADD COLUMN "unidadeTributavel" TEXT NOT NULL DEFAULT 'UN';
