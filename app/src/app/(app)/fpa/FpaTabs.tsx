import Link from "next/link";

export function FpaTabs({ ativa }: { ativa: "visao" | "dre" }) {
  const cls = (on: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 -mb-px ${on ? "border-ps-green text-ps-ink" : "border-transparent text-ps-muted hover:text-ps-ink"}`;
  return (
    <div className="flex gap-2 border-b border-ps-navy/[0.08] mb-6">
      <Link href="/fpa" className={cls(ativa === "visao")}>Visão geral</Link>
      <Link href="/fpa/dre" className={cls(ativa === "dre")}>DRE Gerencial</Link>
    </div>
  );
}
