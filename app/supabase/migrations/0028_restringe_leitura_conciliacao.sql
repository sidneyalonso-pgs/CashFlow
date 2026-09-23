-- reconciliations_select e import_errors_select liberavam leitura pra qualquer usuario
-- autenticado, sem checar perfil — inconsistente com o resto do modulo de conciliacao (que
-- restringe insert/update/delete a administrador/tesouraria/conciliacao). Alinha o select com
-- a mesma regra.
drop policy if exists "reconciliations_select" on reconciliations;
create policy "reconciliations_select" on reconciliations
  for select using (current_user_role() in ('administrador', 'tesouraria', 'conciliacao'));

drop policy if exists "import_errors_select" on import_errors;
create policy "import_errors_select" on import_errors
  for select using (
    current_user_role() in ('administrador', 'tesouraria', 'conciliacao')
    and exists (select 1 from import_batches b where b.id = import_batch_id)
  );
