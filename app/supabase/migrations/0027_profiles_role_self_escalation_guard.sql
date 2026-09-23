-- Defesa em profundidade: a policy "profiles_update_own_or_admin" permite update da propria
-- linha (id = auth.uid()), mas RLS e por linha, nao por coluna - isso deixava qualquer usuario
-- trocar o proprio "role" para "administrador" caso algum codigo (server action, etc.) fizesse
-- o update sem checar quem esta chamando. Ja corrigimos as server actions em
-- configuracoes/usuarios/actions.ts, mas o banco tambem passa a bloquear na origem: um usuario
-- so pode mudar o proprio role se ja for administrador.
create or replace function bloquear_auto_promocao_role()
returns trigger as $$
begin
  if new.role is distinct from old.role and current_user_role() <> 'administrador' then
    raise exception 'Apenas administradores podem alterar o perfil (role) de um usuario.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_bloquear_auto_promocao_role
  before update on profiles
  for each row
  execute function bloquear_auto_promocao_role();
