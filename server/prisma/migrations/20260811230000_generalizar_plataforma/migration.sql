-- CreateTable
CREATE TABLE "IntegracaoPlataforma" (
    "plataformaId" INTEGER NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "appId" TEXT,
    "appSecret" TEXT,
    "lojaId" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiraEm" DATETIME,
    "ultimaSincronizacao" DATETIME,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "IntegracaoPlataforma_plataformaId_fkey" FOREIGN KEY ("plataformaId") REFERENCES "PlataformaVenda" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PedidoPlataforma" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plataformaId" INTEGER NOT NULL,
    "numeroPedido" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "prazoEnvio" DATETIME,
    "dataPedido" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "PedidoPlataforma_plataformaId_fkey" FOREIGN KEY ("plataformaId") REFERENCES "PlataformaVenda" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemPedidoPlataforma" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedidoId" INTEGER NOT NULL,
    "produtoId" INTEGER,
    "envioId" INTEGER,
    "skuPlataforma" TEXT NOT NULL,
    "nomePlataforma" TEXT NOT NULL,
    "quantidade" REAL NOT NULL,
    "produzido" BOOLEAN NOT NULL DEFAULT false,
    "produzidoEm" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemPedidoPlataforma_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoPlataforma" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemPedidoPlataforma_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ItemPedidoPlataforma_envioId_fkey" FOREIGN KEY ("envioId") REFERENCES "RegistroEnvio" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Migra dados existentes da Shopee (models antigos) para os genéricos, atribuindo à
-- PlataformaVenda "Shopee" já cadastrada.
INSERT INTO "IntegracaoPlataforma" ("plataformaId", "tipo", "appId", "appSecret", "lojaId", "accessToken", "refreshToken", "accessTokenExpiraEm", "ultimaSincronizacao", "ativo", "atualizadoEm")
SELECT (SELECT "id" FROM "PlataformaVenda" WHERE "nome" = 'Shopee'), 'SHOPEE', CAST("partnerId" AS TEXT), "partnerKey", CAST("shopId" AS TEXT), "accessToken", "refreshToken", "accessTokenExpiraEm", "ultimaSincronizacao", "ativo", "atualizadoEm"
FROM "ConfiguracaoShopee"
WHERE (SELECT "id" FROM "PlataformaVenda" WHERE "nome" = 'Shopee') IS NOT NULL;

INSERT INTO "PedidoPlataforma" ("id", "plataformaId", "numeroPedido", "status", "prazoEnvio", "dataPedido", "criadoEm", "atualizadoEm")
SELECT "id", (SELECT "id" FROM "PlataformaVenda" WHERE "nome" = 'Shopee'), "orderSn", "status", "prazoEnvio", "dataPedido", "criadoEm", "atualizadoEm"
FROM "PedidoShopee";

INSERT INTO "ItemPedidoPlataforma" ("id", "pedidoId", "produtoId", "envioId", "skuPlataforma", "nomePlataforma", "quantidade", "produzido", "produzidoEm", "criadoEm")
SELECT "id", "pedidoId", "produtoId", "envioId", "skuShopee", "nomeShopee", "quantidade", "produzido", "produzidoEm", "criadoEm"
FROM "ItemPedidoShopee";

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
    "itemPedidoPlataformaId" INTEGER,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovimentacaoEstoque_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MovimentacaoEstoque_envioId_fkey" FOREIGN KEY ("envioId") REFERENCES "RegistroEnvio" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MovimentacaoEstoque_itemPedidoPlataformaId_fkey" FOREIGN KEY ("itemPedidoPlataformaId") REFERENCES "ItemPedidoPlataforma" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MovimentacaoEstoque" ("criadoEm", "envioId", "id", "materialId", "motivo", "observacao", "produtoId", "quantidadeAnterior", "quantidadeMovimentada", "quantidadeResultante", "tipo", "itemPedidoPlataformaId")
SELECT "criadoEm", "envioId", "id", "materialId", "motivo", "observacao", "produtoId", "quantidadeAnterior", "quantidadeMovimentada", "quantidadeResultante", "tipo", "itemPedidoShopeeId" FROM "MovimentacaoEstoque";
DROP TABLE "MovimentacaoEstoque";
ALTER TABLE "new_MovimentacaoEstoque" RENAME TO "MovimentacaoEstoque";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- DropTable (models antigos, já migrados acima)
DROP TABLE "ItemPedidoShopee";
DROP TABLE "PedidoShopee";
DROP TABLE "ConfiguracaoShopee";

-- CreateIndex
CREATE UNIQUE INDEX "PedidoPlataforma_numeroPedido_key" ON "PedidoPlataforma"("numeroPedido");

-- CreateIndex
CREATE UNIQUE INDEX "ItemPedidoPlataforma_pedidoId_skuPlataforma_key" ON "ItemPedidoPlataforma"("pedidoId", "skuPlataforma");
