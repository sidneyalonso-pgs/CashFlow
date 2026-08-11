-- bank_statement_imports e bank_statement_entries nunca tiveram politica de DELETE.
-- Com RLS habilitado e sem policy para o comando, o Postgres nao apaga nenhuma linha
-- (nao gera erro, so afeta zero linhas) - por isso excluir um extrato na tela de
-- Conciliacao "parecia funcionar" mas o registro continuava lá.

create policy "bank_statement_imports_delete" on bank_statement_imports for delete using (
  has_company_access(company_id) and current_user_role() in ('administrador', 'tesouraria', 'conciliacao')
);

create policy "bank_statement_entries_delete" on bank_statement_entries for delete using (
  current_user_role() in ('administrador', 'tesouraria', 'conciliacao')
);
