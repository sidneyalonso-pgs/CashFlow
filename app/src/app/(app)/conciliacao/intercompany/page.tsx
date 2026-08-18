import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatBRL } from "@/lib/calculations/money";
import { VincularButton, DesvincularButton } from "./LinkButtons";

const SAIDA = ["pix_enviado", "ted_enviado", "debito_bancario", "reembolso"];
const ENTRADA = ["pix_recebido", "ted_recebido"];
/** Janela de tolerância entre as duas pernas: o crédito pode cair no dia seguinte. */
const DIAS_TOLERANCIA = 3;

function dia(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
function diffDias(a: string, b: string) {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

type Perna = {
  tabela: "transfers" | "revenues";
  id: string;
  companyId: string;
  empresa: string;
  valor: number;
  data: string;
  descricao: string;
  origem: string;
};

export default async function IntercompanyPage() {
  const supabase = createClient();

  const [{ data: empresasRaw }, { data: contasRaw }] = await Promise.all([
    supabase.from("companies").select("id, legal_name, trade_name"),
    supabase.from("bank_accounts").select("id, company_id"),
  ]);
  const nome = new Map<string, string>(
    ((empresasRaw ?? []) as any[]).map((c) => [c.id, c.trade_name || c.legal_name])
  );
  const empresaDaConta = new Map<string, string>(((contasRaw ?? []) as any[]).map((a) => [a.id, a.company_id]));

  const [{ data: transfRaw, error: erroColuna }, { data: revRaw }] = await Promise.all([
    supabase
      .from("transfers")
      .select("id, tipo, amount, transfer_date, description, counterpart_name, company_id, from_account_id, to_account_id, intercompany_ref"),
    supabase
      .from("revenue_realizations")
      .select("amount, received_at, revenues!inner(id, company_id, description, deleted_at, intercompany_ref)"),
  ]);

  if (erroColuna) {
    return (
      <div>
        <PageHeader title="Vínculos entre empresas" subtitle="Conciliação de movimento intercompany" />
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 border-l-4 border-l-amber-500 p-5">
          <p className="font-semibold text-ps-ink mb-1">Falta aplicar a migration 0019</p>
          <p className="text-sm text-ps-muted">
            A coluna <code className="font-mono text-xs bg-ps-bg-2 px-1.5 py-0.5 rounded">intercompany_ref</code> ainda
            não existe no banco. Rode <code className="font-mono text-xs bg-ps-bg-2 px-1.5 py-0.5 rounded">0019_intercompany_ref.sql</code> no
            SQL Editor do Supabase e recarregue esta página.
          </p>
          <p className="text-xs text-ps-muted-2 mt-3 font-mono">{erroColuna.message}</p>
        </div>
      </div>
    );
  }

  const transfers = ((transfRaw ?? []) as any[]).filter((t) => t.company_id);
  const receitas = ((revRaw ?? []) as any[]).filter((r) => r.revenues && !r.revenues.deleted_at);

  // Pernas de saída: transferência que tirou dinheiro de uma conta nossa.
  const saidas: Perna[] = transfers
    .filter((t) => SAIDA.includes(t.tipo) && t.from_account_id)
    .map((t) => ({
      tabela: "transfers" as const,
      id: t.id,
      companyId: empresaDaConta.get(t.from_account_id) ?? t.company_id,
      empresa: nome.get(empresaDaConta.get(t.from_account_id) ?? t.company_id) ?? "—",
      valor: Number(t.amount) || 0,
      data: t.transfer_date,
      descricao: t.description ?? "",
      origem: `Transferência${t.counterpart_name ? ` para ${t.counterpart_name}` : ""}`,
      ref: t.intercompany_ref as string | null,
    }))
    .map((p) => p as Perna & { ref: string | null });

  // Pernas de entrada: receita recebida, ou transferência que trouxe dinheiro para uma conta nossa.
  const entradas: Array<Perna & { ref: string | null }> = [
    ...receitas.map((r) => ({
      tabela: "revenues" as const,
      id: r.revenues.id as string,
      companyId: r.revenues.company_id as string,
      empresa: nome.get(r.revenues.company_id) ?? "—",
      valor: Number(r.amount) || 0,
      data: r.received_at as string,
      descricao: (r.revenues.description as string) ?? "",
      origem: "Receita recebida",
      ref: (r.revenues.intercompany_ref as string | null) ?? null,
    })),
    ...transfers
      .filter((t) => ENTRADA.includes(t.tipo) && t.to_account_id)
      .map((t) => ({
        tabela: "transfers" as const,
        id: t.id as string,
        companyId: empresaDaConta.get(t.to_account_id) ?? t.company_id,
        empresa: nome.get(empresaDaConta.get(t.to_account_id) ?? t.company_id) ?? "—",
        valor: Number(t.amount) || 0,
        data: t.transfer_date as string,
        descricao: (t.description as string) ?? "",
        origem: `Transferência${t.counterpart_name ? ` de ${t.counterpart_name}` : ""}`,
        ref: (t.intercompany_ref as string | null) ?? null,
      })),
  ];

  // ── já vinculados ────────────────────────────────────────────────────────
  const vinculados = new Map<string, Array<Perna & { ref: string | null }>>();
  for (const p of [...saidas, ...entradas]) {
    if (!p.ref) continue;
    const atual = vinculados.get(p.ref) ?? [];
    atual.push(p);
    vinculados.set(p.ref, atual);
  }

  // ── candidatos: mesma quantia, poucos dias de diferença, empresas diferentes ──
  const candidatos: Array<{ saida: Perna; entrada: Perna }> = [];
  for (const s of saidas) {
    if (s.ref) continue;
    for (const e of entradas) {
      if (e.ref) continue;
      if (Math.abs(e.valor - s.valor) > 0.005) continue;
      const d = diffDias(s.data, e.data);
      if (d < 0 || d > DIAS_TOLERANCIA) continue;
      if (e.companyId === s.companyId) continue;
      candidatos.push({ saida: s, entrada: e });
    }
  }

  const volume = candidatos.reduce((acc, c) => acc + c.saida.valor, 0);

  return (
    <div>
      <PageHeader
        title="Vínculos entre empresas"
        subtitle="Dinheiro que saiu de uma empresa do grupo e entrou em outra"
        actions={
          <Link
            href="/conciliacao"
            className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors"
          >
            Voltar à Conciliação
          </Link>
        }
      />

      <div className="bg-ps-navy text-white rounded-ps px-5 py-3.5 text-sm leading-relaxed mb-6">
        Quando as duas pernas do mesmo movimento ficam vinculadas, elas saem juntas das entradas e
        das saídas do consolidado — o grupo não ganhou nem perdeu nada. <strong className="font-semibold">O saldo
        não muda</strong>: sai uma entrada e uma saída de igual valor. Na visão de cada empresa
        isoladamente, as duas continuam aparecendo normalmente.
      </div>

      <h3 className="font-semibold text-ps-ink mb-2">
        Pares sugeridos {candidatos.length > 0 && <span className="text-ps-muted font-normal text-sm">— {candidatos.length} par{candidatos.length > 1 ? "es" : ""}, {formatBRL(volume)}</span>}
      </h3>
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden mb-8">
        {candidatos.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ps-muted">
            Nenhum par pendente. São procurados lançamentos de mesma quantia, em empresas diferentes,
            com até {DIAS_TOLERANCIA} dias entre a saída e a entrada.
          </p>
        ) : (
          <ul className="divide-y divide-ps-navy/5">
            {candidatos.map((c, i) => (
              <li key={`${c.saida.id}-${c.entrada.id}-${i}`} className="px-5 py-4 flex items-center justify-between gap-6 flex-wrap">
                <div className="flex-1 min-w-[280px] space-y-1.5">
                  <p className="text-lg font-bold tabular-nums text-ps-ink">{formatBRL(c.saida.valor)}</p>
                  <p className="text-sm">
                    <span className="text-red-600 font-medium">↑ Saiu de {c.saida.empresa}</span>{" "}
                    <span className="text-ps-muted">em {dia(c.saida.data)} — {c.saida.origem}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-ps-green-700 font-medium">↓ Entrou em {c.entrada.empresa}</span>{" "}
                    <span className="text-ps-muted">em {dia(c.entrada.data)} — {c.entrada.origem}</span>
                  </p>
                  {c.entrada.descricao && <p className="text-xs text-ps-muted-2">“{c.entrada.descricao}”</p>}
                </div>
                <VincularButton
                  a={{ tabela: c.saida.tabela, id: c.saida.id }}
                  b={{ tabela: c.entrada.tabela, id: c.entrada.id }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <h3 className="font-semibold text-ps-ink mb-2">
        Já vinculados {vinculados.size > 0 && <span className="text-ps-muted font-normal text-sm">— {vinculados.size}</span>}
      </h3>
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden">
        {vinculados.size === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ps-muted">Nenhum vínculo criado ainda.</p>
        ) : (
          <ul className="divide-y divide-ps-navy/5">
            {Array.from(vinculados.entries()).map(([ref, pernas]) => (
              <li key={ref} className="px-5 py-4 flex items-center justify-between gap-6 flex-wrap">
                <div className="flex-1 min-w-[280px]">
                  <p className="text-base font-bold tabular-nums text-ps-ink">{formatBRL(pernas[0]?.valor ?? 0)}</p>
                  <p className="text-sm text-ps-muted mt-0.5">
                    {pernas.map((p) => `${p.empresa} (${dia(p.data)})`).join(" → ")}
                  </p>
                  {pernas.length < 2 && (
                    <p className="text-xs text-amber-700 mt-1">
                      Só uma perna está vinculada — sem a outra, nada é eliminado do consolidado.
                    </p>
                  )}
                </div>
                <DesvincularButton ref={ref} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-ps-muted mt-4">
        A sugestão é por quantia e data, não por identificação do banco — confira antes de vincular.
        Um par só é eliminado do consolidado quando as duas pernas pertencem a empresas diferentes
        e as duas estão no filtro que você está olhando.
      </p>
    </div>
  );
}
