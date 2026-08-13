-- CreateTable
CREATE TABLE "Embalagem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ItemEmbalagem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "embalagemId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "quantidade" REAL NOT NULL,
    CONSTRAINT "ItemEmbalagem_embalagemId_fkey" FOREIGN KEY ("embalagemId") REFERENCES "Embalagem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemEmbalagem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UsoEmbalagem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "embalagemId" INTEGER NOT NULL,
    "quantidade" REAL NOT NULL DEFAULT 1,
    "custoTotal" REAL NOT NULL DEFAULT 0,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "envioId" INTEGER,
    "pedidoId" INTEGER,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsoEmbalagem_embalagemId_fkey" FOREIGN KEY ("embalagemId") REFERENCES "Embalagem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UsoEmbalagem_envioId_fkey" FOREIGN KEY ("envioId") REFERENCES "RegistroEnvio" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UsoEmbalagem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoPlataforma" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Embalagem_nome_key" ON "Embalagem"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "ItemEmbalagem_embalagemId_materialId_key" ON "ItemEmbalagem"("embalagemId", "materialId");

-- AlterTable
ALTER TABLE "RegistroEnvio" ADD COLUMN "custoEmbalagem" REAL NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MovimentacaoEstoque" ADD COLUMN "usoEmbalagemId" INTEGER;
