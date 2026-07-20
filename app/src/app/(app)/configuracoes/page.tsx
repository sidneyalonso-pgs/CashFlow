import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

const SETTINGS = [
  { href: "/configuracoes/usuarios", label: "Usuários", description: "Perfis de acesso e vínculo com empresas" },
  { href: "/configuracoes/senha", label: "Minha senha", description: "Alterar a senha da sua conta" },
  { href: "/configuracoes/2fa", label: "Autenticação em duas etapas", description: "Ativar segundo fator de segurança" },
  { href: "/configuracoes/auditoria", label: "Auditoria", description: "Histórico de alterações do sistema" },
];

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Configurações" subtitle="Administração do sistema" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SETTINGS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 hover:shadow-ps transition-shadow"
          >
            <h3 className="font-semibold text-ps-ink">{s.label}</h3>
            <p className="text-sm text-ps-muted mt-1">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
