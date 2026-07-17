-- PagSmile Treasury — permite excluir fornecedores (não existia policy de delete)

create policy "suppliers_delete" on suppliers
  for delete using (current_user_role() in ('administrador', 'tesouraria'));
