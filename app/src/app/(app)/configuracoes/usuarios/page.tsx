import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { UserRow } from "./UserRow";
import { InviteUserButton } from "./InviteUserButton";

export default async function UsersPage() {
  const supabase = createClient();

  const [{ data: profiles }, { data: companies }, { data: allAccess }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
    supabase.from("user_company_access").select("id, user_id, company_id"),
  ]);

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Perfis de acesso e empresas autorizadas"
        actions={<InviteUserButton />}
      />

      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">Perfil</th>
              <th className="text-left px-4 py-3">Empresas autorizadas</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => (
              <UserRow
                key={p.id}
                profile={p}
                companies={companies ?? []}
                access={(allAccess ?? []).filter((a) => a.user_id === p.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
