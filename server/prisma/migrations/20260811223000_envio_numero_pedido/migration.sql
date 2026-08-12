-- AlterTable
ALTER TABLE "RegistroEnvio" ADD COLUMN "numeroPedido" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ItemPedidoShopee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedidoId" INTEGER NOT NULL,
    "produtoId" INTEGER,
    "envioId" INTEGER,
    "skuShopee" TEXT NOT NULL,
    "nomeShopee" TEXT NOT NULL,
    "quantidade" REAL NOT NULL,
    "produzido" BOOLEAN NOT NULL DEFAULT false,
    "produzidoEm" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemPedidoShopee_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoShopee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemPedidoShopee_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ItemPedidoShopee_envioId_fkey" FOREIGN KEY ("envioId") REFERENCES "RegistroEnvio" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ItemPedidoShopee" ("id","pedidoId","produtoId","skuShopee","nomeShopee","quantidade","produzido","produzidoEm","criadoEm")
  SELECT "id","pedidoId","produtoId","skuShopee","nomeShopee","quantidade","produzido","produzidoEm","criadoEm" FROM "ItemPedidoShopee";
DROP TABLE "ItemPedidoShopee";
ALTER TABLE "new_ItemPedidoShopee" RENAME TO "ItemPedidoShopee";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "RegistroEnvio_numeroPedido_key" ON "RegistroEnvio"("numeroPedido");

-- CreateIndex
CREATE UNIQUE INDEX "ItemPedidoShopee_pedidoId_skuShopee_key" ON "ItemPedidoShopee"("pedidoId", "skuShopee");
