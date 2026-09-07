-- O status de foto "ENVIADA" foi renomeado para "SALVA". Migra os registros existentes.
UPDATE "ItemPedidoPlataforma" SET "fotoStatus" = 'SALVA' WHERE "fotoStatus" = 'ENVIADA';
