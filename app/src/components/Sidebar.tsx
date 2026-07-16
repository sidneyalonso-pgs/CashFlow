import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Visão geral" },
  { href: "/cash-flow", label: "Cash Flow" },
  { href: "/pagamentos", label: "Pagamentos" },
  { href: "/receitas", label: "Receitas" },
  { href: "/movimentacoes", label: "Movimentações" },
  { href: "/conciliacao", label: "Conciliação" },
  { href: "/investimentos", label: "Investimentos" },
  { href: "/fpa", label: "FP&A" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/cadastros", label: "Cadastros" },
  { href: "/configuracoes", label: "Configurações" },
];

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-ps-navy text-white min-h-screen flex flex-col">
      <div className="px-6 py-6 border-b border-white/10">
        <img src="/logos/pagsmile-logo-transparent.png" alt="PagSmile" className="h-8" />
        <p className="mt-2 text-xs text-white/60 font-mono tracking-wide uppercase">Treasury</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-3 py-2 rounded-ps-sm text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
