-- Remove a conta "Caixa": o saldo disponível fica somente no banco Cora.
DELETE FROM "MovimentacaoFinanceira" WHERE "contaId" IN (SELECT "id" FROM "ContaFinanceira" WHERE "nome" = 'Caixa');
DELETE FROM "ContaFinanceira" WHERE "nome" = 'Caixa';
