-- Registro de devoluções de produtos (com opção de retornar ao estoque de produto pronto)
CREATE TABLE "Devolucao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "produtoId" INTEGER,
    "quantidade" REAL NOT NULL DEFAULT 1,
    "aptoEstoque" BOOLEAN NOT NULL DEFAULT false,
    "retornouEstoque" BOOLEAN NOT NULL DEFAULT false,
    "numeroPedido" TEXT,
    "motivo" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Devolucao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
