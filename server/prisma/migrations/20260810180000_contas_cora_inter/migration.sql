-- Saldo disponível fica em um único banco (Cora) e o lucro em um único banco (Inter).
-- Renomeia as contas padrão e desativa o Caixa genérico.
UPDATE "ContaFinanceira" SET "nome" = 'Cora', "tipo" = 'BANCO' WHERE "nome" = 'Banco Principal';
UPDATE "ContaFinanceira" SET "nome" = 'Inter', "tipo" = 'RESERVA_LUCRO' WHERE "nome" = 'Reserva de Lucro';
UPDATE "ContaFinanceira" SET "ativo" = false WHERE "nome" = 'Caixa';
