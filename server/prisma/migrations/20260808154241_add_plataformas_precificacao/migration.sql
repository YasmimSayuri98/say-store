-- CreateTable
CREATE TABLE "PlataformaVenda" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "comissaoPercentual" REAL NOT NULL DEFAULT 0,
    "taxaFixaPorItem" REAL NOT NULL DEFAULT 0,
    "percentualFreteGratis" REAL NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PrecoProduto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "produtoId" INTEGER NOT NULL,
    "plataformaId" INTEGER NOT NULL,
    "precoVenda" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "PrecoProduto_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PrecoProduto_plataformaId_fkey" FOREIGN KEY ("plataformaId") REFERENCES "PlataformaVenda" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ItemRegistroEnvio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "envioId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "quantidade" REAL NOT NULL,
    "precoVendaUnitario" REAL NOT NULL DEFAULT 0,
    "custoUnitario" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "ItemRegistroEnvio_envioId_fkey" FOREIGN KEY ("envioId") REFERENCES "RegistroEnvio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemRegistroEnvio_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ItemRegistroEnvio" ("envioId", "id", "produtoId", "quantidade") SELECT "envioId", "id", "produtoId", "quantidade" FROM "ItemRegistroEnvio";
DROP TABLE "ItemRegistroEnvio";
ALTER TABLE "new_ItemRegistroEnvio" RENAME TO "ItemRegistroEnvio";
CREATE TABLE "new_Produto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "custoAtualMateriais" REAL NOT NULL DEFAULT 0,
    "custosExtras" REAL NOT NULL DEFAULT 0,
    "margemLucroAlvo" REAL NOT NULL DEFAULT 0,
    "ultimoCalculoCusto" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);
INSERT INTO "new_Produto" ("ativo", "atualizadoEm", "criadoEm", "custoAtualMateriais", "descricao", "id", "nome", "sku", "ultimoCalculoCusto") SELECT "ativo", "atualizadoEm", "criadoEm", "custoAtualMateriais", "descricao", "id", "nome", "sku", "ultimoCalculoCusto" FROM "Produto";
DROP TABLE "Produto";
ALTER TABLE "new_Produto" RENAME TO "Produto";
CREATE UNIQUE INDEX "Produto_sku_key" ON "Produto"("sku");
CREATE TABLE "new_RegistroEnvio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dataEnvio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT,
    "custoTotalMateriais" REAL NOT NULL DEFAULT 0,
    "plataformaId" INTEGER,
    "faturamentoBruto" REAL NOT NULL DEFAULT 0,
    "totalTaxas" REAL NOT NULL DEFAULT 0,
    "custoTotalProdutos" REAL NOT NULL DEFAULT 0,
    "lucro" REAL NOT NULL DEFAULT 0,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistroEnvio_plataformaId_fkey" FOREIGN KEY ("plataformaId") REFERENCES "PlataformaVenda" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RegistroEnvio" ("criadoEm", "custoTotalMateriais", "dataEnvio", "id", "observacao") SELECT "criadoEm", "custoTotalMateriais", "dataEnvio", "id", "observacao" FROM "RegistroEnvio";
DROP TABLE "RegistroEnvio";
ALTER TABLE "new_RegistroEnvio" RENAME TO "RegistroEnvio";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PlataformaVenda_nome_key" ON "PlataformaVenda"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "PrecoProduto_produtoId_plataformaId_key" ON "PrecoProduto"("produtoId", "plataformaId");

-- Plataformas padrão (valores de referência de 2026 — edite pela tela de Plataformas)
-- Shopee: 14% comissão + R$ 4,00/item (+6% se aderir ao Frete Grátis, aqui pré-preenchido)
-- TikTok Shop: 6% comissão + R$ 6,00/item
INSERT INTO "PlataformaVenda" ("nome", "comissaoPercentual", "taxaFixaPorItem", "percentualFreteGratis", "ativo", "criadoEm", "atualizadoEm")
VALUES
  ('Shopee', 14, 4, 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('TikTok Shop', 6, 6, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
