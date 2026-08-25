-- Produto: gramas de filamento das páginas (álbuns SKU LIV-FOT-PERS)
ALTER TABLE "Produto" ADD COLUMN "paginaGramas" REAL NOT NULL DEFAULT 0;

-- ItemPedidoPlataforma: status da foto, etiqueta impressa e produção em duas partes (capa/páginas) para álbuns
ALTER TABLE "ItemPedidoPlataforma" ADD COLUMN "fotoStatus" TEXT;
ALTER TABLE "ItemPedidoPlataforma" ADD COLUMN "etiquetaImpressa" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ItemPedidoPlataforma" ADD COLUMN "etiquetaImpressaEm" DATETIME;
ALTER TABLE "ItemPedidoPlataforma" ADD COLUMN "capaFeita" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ItemPedidoPlataforma" ADD COLUMN "capaFeitaEm" DATETIME;
ALTER TABLE "ItemPedidoPlataforma" ADD COLUMN "paginasFeitas" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ItemPedidoPlataforma" ADD COLUMN "paginasFeitasEm" DATETIME;
ALTER TABLE "ItemPedidoPlataforma" ADD COLUMN "paginaFilamentoId" INTEGER;

-- Sincroniza fotoStatus com o fotoImpressa já existente
UPDATE "ItemPedidoPlataforma" SET "fotoStatus" = 'IMPRESSA' WHERE "fotoImpressa" = true;
