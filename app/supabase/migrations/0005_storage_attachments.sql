-- PagSmile Treasury — bucket privado para notas fiscais e documentos

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "attachments_storage_select"
on storage.objects for select
using (
  bucket_id = 'attachments'
  and auth.uid() is not null
);

create policy "attachments_storage_insert"
on storage.objects for insert
with check (
  bucket_id = 'attachments'
  and current_user_role() in ('administrador', 'tesouraria')
);
