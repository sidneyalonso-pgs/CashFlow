-- Corrige erro "relation "profiles" does not exist" ao criar usuário.
-- A função SECURITY DEFINER não fixava o search_path, então ao rodar
-- no contexto do schema auth ela não enxergava a tabela public.profiles.

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'visualizador');
  return new;
end;
$$ language plpgsql security definer set search_path = public;
