-- Papel "piloto": acesso restrito à Central Piloto (Operações > Central Piloto).
--
-- ATENÇÃO ao rodar: ALTER TYPE ... ADD VALUE não pode ser usado na mesma transação em que o
-- novo valor é referenciado (mesma regra da migration 0020). Rode este arquivo sozinho.

alter type user_role add value if not exists 'piloto';
