"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Visão geral", icon: "🏠" },
  { href: "/cash-flow", label: "Cash Flow", icon: "📈" },
  { href: "/pagamentos", label: "Pagamentos", icon: "💸" },
  { href: "/receitas", label: "Receitas", icon: "💰" },
  { href: "/movimentacoes", label: "Movimentações", icon: "🔄" },
  { href: "/conciliacao", label: "Conciliação", icon: "🏦" },
  { href: "/investimentos", label: "Investimentos", icon: "📊" },
  { href: "/fpa", label: "FP&A", icon: "🧮" },
  { href: "/relatorios", label: "Relatórios", icon: "📄" },
  { href: "/cadastros", label: "Cadastros", icon: "🗂️" },
  { href: "/configuracoes", label: "Configurações", icon: "⚙️" },
];

const STORAGE_KEY = "ps-sidebar-collapsed";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

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
      } shrink-0 bg-ps-navy text-white min-h-screen flex flex-col transition-all duration-200`}
    >
      <div className="px-3 py-6 border-b border-white/10 flex items-center justify-between">
        {!collapsed && (
          <div>
            <img src="/logos/pagsmile-logo-transparent.png" alt="PagSmile" className="h-8" />
            <p className="mt-2 text-xs text-white/60 font-mono tracking-wide uppercase">Treasury</p>
          </div>
        )}
        <button
          onClick={toggle}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className="text-white/60 hover:text-white hover:bg-white/10 rounded-ps-sm p-1.5 transition-colors mx-auto"
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-ps-sm text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
