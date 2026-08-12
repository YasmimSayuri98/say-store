-- CreateTable
CREATE TABLE "ContaFinanceira" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "saldoAtual" REAL NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MovimentacaoFinanceira" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contaId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "descricao" TEXT,
    "saldoApos" REAL NOT NULL,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saqueId" INTEGER,
    "parcelaId" INTEGER,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovimentacaoFinanceira_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "ContaFinanceira" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaquePlataforma" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plataformaId" INTEGER,
    "contaDestinoId" INTEGER NOT NULL,
    "contaLucroId" INTEGER,
    "valorBruto" REAL NOT NULL,
    "percentualLucro" REAL NOT NULL DEFAULT 0,
    "valorLucro" REAL NOT NULL DEFAULT 0,
    "valorLiquido" REAL NOT NULL DEFAULT 0,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaquePlataforma_plataformaId_fkey" FOREIGN KEY ("plataformaId") REFERENCES "PlataformaVenda" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SaquePlataforma_contaDestinoId_fkey" FOREIGN KEY ("contaDestinoId") REFERENCES "ContaFinanceira" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SaquePlataforma_contaLucroId_fkey" FOREIGN KEY ("contaLucroId") REFERENCES "ContaFinanceira" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContaPagar" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT,
    "valorTotal" REAL NOT NULL,
    "numeroParcelas" INTEGER NOT NULL DEFAULT 1,
    "observacao" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ParcelaConta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contaPagarId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "valor" REAL NOT NULL,
    "vencimento" DATETIME NOT NULL,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "dataPagamento" DATETIME,
    "contaFinanceiraId" INTEGER,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParcelaConta_contaPagarId_fkey" FOREIGN KEY ("contaPagarId") REFERENCES "ContaPagar" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParcelaConta_contaFinanceiraId_fkey" FOREIGN KEY ("contaFinanceiraId") REFERENCES "ContaFinanceira" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConfiguracaoFinanceira" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "percentualLucroPadrao" REAL NOT NULL DEFAULT 0,
    "contaLucroPadraoId" INTEGER,
    "contaOperacionalPadraoId" INTEGER,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ContaFinanceira_nome_key" ON "ContaFinanceira"("nome");

-- Contas financeiras padrão
INSERT INTO "ContaFinanceira" ("id", "nome", "tipo", "saldoAtual", "ativo", "criadoEm", "atualizadoEm") VALUES
  (1, 'Caixa', 'CAIXA', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (2, 'Banco Principal', 'BANCO', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (3, 'Reserva de Lucro', 'RESERVA_LUCRO', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Configuração financeira inicial: 20% do saque direcionado à Reserva de Lucro,
-- entrada operacional no Banco Principal (ajustável na tela de Visão financeira).
INSERT INTO "ConfiguracaoFinanceira" ("id", "percentualLucroPadrao", "contaLucroPadraoId", "contaOperacionalPadraoId", "atualizadoEm") VALUES
  (1, 20, 3, 2, CURRENT_TIMESTAMP);
