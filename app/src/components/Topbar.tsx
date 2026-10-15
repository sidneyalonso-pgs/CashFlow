import { SignOutButton } from "./SignOutButton";

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

// Sem altura própria: o cabeçalho de cada página sobe até o topo da faixa verde e o usuário
// fica no canto direito, na altura do título (alinhado à logo do menu).
export function Topbar({ userEmail, userName }: { userEmail?: string; userName?: string }) {
  const nome = (userName ?? "").trim() || (userEmail ?? "").split("@")[0];
  return (
    <header className="relative z-20 h-0 print:hidden">
      <div className="absolute top-6 right-8 flex items-center gap-3 rounded-full bg-ps-navy pr-4 py-1 pl-1" title={userEmail}>
        <span
          aria-hidden="true"
          className="w-10 h-10 rounded-full bg-ps-mint text-ps-navy-900 font-semibold text-sm flex items-center justify-center ring-2 ring-white/25 shrink-0"
        >
          {iniciais(nome)}
        </span>
        <span className="text-sm font-medium text-white">{nome}</span>
        <span className="w-px h-4 bg-white/25" />
        <SignOutButton />
      </div>
    </header>
  );
}
