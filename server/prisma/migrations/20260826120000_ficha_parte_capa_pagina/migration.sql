-- ItemFichaTecnica: adiciona coluna "parte" (GERAL | CAPA | PAGINA) e troca o índice único
-- para (produtoId, materialId, parte), permitindo o mesmo material em partes diferentes.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_ItemFichaTecnica" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "produtoId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "quantidade" REAL NOT NULL,
    "parte" TEXT NOT NULL DEFAULT 'GERAL',
    CONSTRAINT "ItemFichaTecnica_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemFichaTecnica_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_ItemFichaTecnica" ("id", "produtoId", "materialId", "quantidade")
SELECT "id", "produtoId", "materialId", "quantidade" FROM "ItemFichaTecnica";

DROP TABLE "ItemFichaTecnica";
ALTER TABLE "new_ItemFichaTecnica" RENAME TO "ItemFichaTecnica";

CREATE UNIQUE INDEX "ItemFichaTecnica_produtoId_materialId_parte_key" ON "ItemFichaTecnica"("produtoId", "materialId", "parte");

PRAGMA foreign_keys=ON;
