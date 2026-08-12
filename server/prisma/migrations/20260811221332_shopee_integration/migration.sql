-- CreateTable
CREATE TABLE "ConfiguracaoShopee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "partnerId" INTEGER,
    "partnerKey" TEXT,
    "shopId" INTEGER,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiraEm" DATETIME,
    "ultimaSincronizacao" DATETIME,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PedidoShopee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderSn" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "prazoEnvio" DATETIME,
    "dataPedido" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ItemPedidoShopee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedidoId" INTEGER NOT NULL,
    "produtoId" INTEGER,
    "skuShopee" TEXT NOT NULL,
    "nomeShopee" TEXT NOT NULL,
    "quantidade" REAL NOT NULL,
    "produzido" BOOLEAN NOT NULL DEFAULT false,
    "produzidoEm" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemPedidoShopee_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoShopee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemPedidoShopee_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MovimentacaoEstoque" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "materialId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidadeAnterior" REAL NOT NULL,
    "quantidadeMovimentada" REAL NOT NULL,
    "quantidadeResultante" REAL NOT NULL,
    "motivo" TEXT,
    "observacao" TEXT,
    "produtoId" INTEGER,
    "envioId" INTEGER,
    "itemPedidoShopeeId" INTEGER,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovimentacaoEstoque_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MovimentacaoEstoque_envioId_fkey" FOREIGN KEY ("envioId") REFERENCES "RegistroEnvio" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MovimentacaoEstoque_itemPedidoShopeeId_fkey" FOREIGN KEY ("itemPedidoShopeeId") REFERENCES "ItemPedidoShopee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MovimentacaoEstoque" ("criadoEm", "envioId", "id", "materialId", "motivo", "observacao", "produtoId", "quantidadeAnterior", "quantidadeMovimentada", "quantidadeResultante", "tipo") SELECT "criadoEm", "envioId", "id", "materialId", "motivo", "observacao", "produtoId", "quantidadeAnterior", "quantidadeMovimentada", "quantidadeResultante", "tipo" FROM "MovimentacaoEstoque";
DROP TABLE "MovimentacaoEstoque";
ALTER TABLE "new_MovimentacaoEstoque" RENAME TO "MovimentacaoEstoque";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PedidoShopee_orderSn_key" ON "PedidoShopee"("orderSn");

-- CreateIndex
CREATE UNIQUE INDEX "ItemPedidoShopee_pedidoId_skuShopee_key" ON "ItemPedidoShopee"("pedidoId", "skuShopee");
