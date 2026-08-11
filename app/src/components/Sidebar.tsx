"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] shrink-0">
      <path d={path} />
    </svg>
  );
}

const NAV_SECTIONS: Array<{ label: string | null; items: Array<{ href: string; label: string; icon: string }> }> = [
  {
    label: null,
    items: [
      { href: "/", label: "Visão geral", icon: "M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" },
      { href: "/cash-flow", label: "Cash Flow", icon: "M3 17 9 11l4 4 8-8M21 7h-6M21 7v6" },
      { href: "/pagamentos", label: "Pagamentos", icon: "M2 7h20v12H2V7Zm0 4h20M6 15h4" },
      { href: "/receitas", label: "Receitas", icon: "M12 2v20M17 5.5c0-1.5-2-2.5-5-2.5s-5 1.2-5 3 2 2.7 5 3 5 1.3 5 3-2 3-5 3-5-1-5-2.5" },
    ],
  },
  {
    label: "Faturamento",
    items: [
      { href: "/faturamento", label: "Faturamento", icon: "M9 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M9 7h6M9 12h6M9 16h4" },
      { href: "/faturamento/notas-debito", label: "Notas de débito", icon: "M7 3h7l4 4v14H7V3Zm7 0v4h4M9 12h6M9 16h6" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/transferencias", label: "Transferências", icon: "M7 16l-4-4m0 0l4-4m-4 4h18M17 8l4 4m0 0l-4 4m4-4H3" },
      { href: "/investimentos", label: "Investimentos", icon: "M4 19h16M7 19v-6m5 6V8m5 11v-9" },
      { href: "/conciliacao", label: "Conciliação", icon: "M4 21V10l8-6 8 6v11M9 21v-6h6v6M4 10h16" },
    ],
  },
  {
    label: "Análise",
    items: [
      { href: "/movimentacoes", label: "Extrato geral", icon: "M7 4v11M7 15 3.5 11.5M7 15l3.5-3.5M17 20V9M17 9l3.5 3.5M17 9l-3.5 3.5" },
      { href: "/fpa", label: "FP&A", icon: "M4 4h16v16H4V4Zm3 4h2m3 0h7M7 12h2m3 0h4m-9 4h2m3 0h7" },
      { href: "/relatorios", label: "Relatórios", icon: "M7 3h7l4 4v14H7V3Zm7 0v4h4M9 12h6M9 16h6" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/cadastros", label: "Cadastros", icon: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" },
      { href: "/configuracoes", label: "Configurações", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a8 8 0 0 0-.15-1.5l2-1.5-2-3.4-2.3.9a8 8 0 0 0-2.6-1.5L14.5 2h-5l-.45 2.5a8 8 0 0 0-2.6 1.5l-2.3-.9-2 3.4 2 1.5A8 8 0 0 0 4 12a8 8 0 0 0 .15 1.5l-2 1.5 2 3.4 2.3-.9a8 8 0 0 0 2.6 1.5L9.5 22h5l.45-2.5a8 8 0 0 0 2.6-1.5l2.3.9 2-3.4-2-1.5A8 8 0 0 0 20 12Z" },
    ],
  },
];

const STORAGE_KEY = "ps-sidebar-collapsed";
const ALL_HREFS = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href));

// entre hrefs que compartilham prefixo (ex: /faturamento e /faturamento/notas-debito),
// o match mais especifico e' quem fica ativo
function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  if (pathname !== href && !pathname.startsWith(href + "/")) return false;
  const moreSpecific = ALL_HREFS.some(
    (other) => other !== href && other.length > href.length && (pathname === other || pathname.startsWith(other + "/"))
  );
  return !moreSpecific;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-64"
      } shrink-0 relative bg-ps-navy text-white min-h-screen flex flex-col transition-all duration-200 overflow-hidden`}
    >
      <div className="pointer-events-none absolute -top-24 -left-16 w-64 h-64 rounded-full bg-ps-green/10 blur-3xl" />

      <div className="relative px-3 py-6 border-b border-white/10 flex items-center justify-between">
        {!collapsed && (
          <div>
            <img src="/logos/pagsmile-logo-transparent.png" alt="PagSmile" className="h-8" />
            <p className="mt-2 text-xs text-white/50 font-mono tracking-wide uppercase">Treasury</p>
          </div>
        )}
        <button
          onClick={toggle}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="text-white/60 hover:text-white hover:bg-white/10 rounded-ps-sm p-1.5 transition-colors mx-auto"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <nav className="relative flex-1 px-3 py-4 space-y-4">
        {NAV_SECTIONS.map((section, idx) => (
          <div key={section.label ?? `section-${idx}`} className="space-y-1">
            {section.label && !collapsed && (
              <p className="px-3 pb-1 text-xs font-mono uppercase tracking-wide text-ps-green-300/70">{section.label}</p>
            )}
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`relative flex items-center gap-2.5 px-3 py-2 rounded-ps-sm text-sm transition-colors ${
                    active ? "bg-ps-green/15 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-ps-green" />}
                  <span className={active ? "text-ps-green-300" : ""}>
                    <Icon path={item.icon} />
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
