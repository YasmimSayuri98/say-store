-- Perdas de material (teste de produto ou erro de produção); desconta o material do estoque.
CREATE TABLE "Perda" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipo" TEXT NOT NULL,
    "produtoId" INTEGER,
    "nomeProdutoTeste" TEXT,
    "materialId" INTEGER NOT NULL,
    "quantidade" REAL NOT NULL,
    "custoTotal" REAL NOT NULL DEFAULT 0,
    "motivo" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Perda_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Perda_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
