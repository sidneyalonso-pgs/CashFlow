import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ReconcileRow } from "./ReconcileRow";
import { ExportReconciliationButton } from "./ExportReconciliationButton";
import { SessionDeleteButton } from "./SessionDeleteButton";
import { companyLabel } from "@/lib/format";

const BANK_COLORS: Record<string, string> = {
  "Banco Inter": "bg-orange-400",
  "Inter": "bg-orange-400",
  "Itaú": "bg-orange-600",
  "Bradesco": "bg-red-600",
  "Santander": "bg-red-500",
  "Caixa": "bg-blue-700",
  "BB": "bg-yellow-500",
  "Banco do Brasil": "bg-yellow-500",
  "Nubank": "bg-purple-600",
};

const TRANSFER_LABELS: Record<string, string> = {
  pix_enviado: "Pix enviado",
  pix_recebido: "Pix recebido",
  ted_enviado: "TED enviado",
  ted_recebido: "TED recebido",
  reembolso: "Reembolso",
  debito_bancario: "Débito bancário",
  transferencia_interna: "Transferência entre contas",
};

function bankDot(bankName: string | null) {
  const key = Object.keys(BANK_COLORS).find((k) =>
    (bankName ?? "").toLowerCase().includes(k.toLowerCase())
  );
  return key ? BANK_COLORS[key] : "bg-ps-navy/30";
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: { open?: string };
}) {
  const supabase = createClient();
  const openImportId = searchParams.open;

  // Buscar todos os imports com info da conta e empresa
  const { data: imports } = await supabase
    .from("bank_statement_imports")
    .select("id, file_name, created_at, imported_rows, total_rows, bank_account_id, bank_accounts(nickname, bank_name, company_id, companies(legal_name, trade_name))")
    .order("created_at", { ascending: false });

  // Buscar contagem de entradas por status para cada import
  const { data: entryCounts } = await supabase
    .from("bank_statement_entries")
    .select("import_id, reconciliation_status");

  // Agrupar contagens por import_id
  const countsByImport: Record<string, { total: number; conciliado: number; pendente: number; ignorado: number }> = {};
  for (const e of entryCounts ?? []) {
    if (!countsByImport[e.import_id]) countsByImport[e.import_id] = { total: 0, conciliado: 0, pendente: 0, ignorado: 0 };
    countsByImport[e.import_id].total++;
    if (e.reconciliation_status === "conciliado_manualmente") countsByImport[e.import_id].conciliado++;
    else if (e.reconciliation_status === "ignorado") countsByImport[e.import_id].ignorado++;
    else countsByImport[e.import_id].pendente++;
  }

  // Stats globais
  const totalImports = (imports ?? []).length;
  const globalTotal = Object.values(countsByImport).reduce((s, c) => s + c.total, 0);
  const globalConciliado = Object.values(countsByImport).reduce((s, c) => s + c.conciliado + c.ignorado, 0);
  const globalPct = globalTotal > 0 ? Math.round((globalConciliado / globalTotal) * 100) : 0;
  const globalPendente = globalTotal - globalConciliado;

  // Workspace do import aberto
  let entries: any[] = [];
  let reconciledEntries: any[] = [];
  let reconciledMap: Record<string, { key: string; label: string; amount: number; date: string }> = {};
  let paymentCandidates: any[] = [];
  let revenueCandidates: any[] = [];
  let investmentApplicationCandidates: any[] = [];
  let investmentRedemptionCandidates: any[] = [];
  let transferOutflowCandidates: any[] = [];
  let transferInflowCandidates: any[] = [];
  let openImport: any = null;

  if (openImportId) {
    openImport = (imports ?? []).find((i: any) => i.id === openImportId);
    const bankAccountId = openImport?.bank_account_id;

    // Entradas pendentes deste import
    const { data: pendingData } = await supabase
      .from("bank_statement_entries")
      .select("id, entry_date, bank_description, amount, direction")
      .eq("import_id", openImportId)
      .eq("reconciliation_status", "pendente")
      .order("entry_date");

    // Entradas conciliadas deste import
    const { data: reconciledData } = await supabase
      .from("bank_statement_entries")
      .select("id, entry_date, bank_description, amount, direction, reconciliation_status, reconciliations(entity_type, entity_id, payments(description, gross_amount, effective_payment_date), revenues(description, realized_amount, realized_date), investments(institution, product, applied_amount, applied_date, redeemed_amount, redeemed_date), transfers(tipo, description, counterpart_name, amount, transfer_date))")
      .eq("import_id", openImportId)
      .in("reconciliation_status", ["conciliado_manualmente", "ignorado"])
      .order("entry_date");

    entries = pendingData ?? [];
    reconciledEntries = reconciledData ?? [];

    const companyId: string | null = (openImport?.bank_accounts as any)?.company_id ?? null;

    if (bankAccountId) {
      // Derivar intervalo de datas das entradas
      const allDates = [...(pendingData ?? []), ...(reconciledData ?? [])].map((e: any) => e.entry_date).sort();
      const minDate = allDates[0] ?? new Date().toISOString().slice(0, 7) + "-01";
      const maxDate = allDates[allDates.length - 1] ?? minDate;

      // Busca pagamentos por empresa (não por conta específica) pra não perder lançamentos sem paying_bank_account_id
      let paymentsQuery = supabase
        .from("payments")
        .select("id, description, gross_amount, effective_payment_date")
        .eq("status", "pago")
        .eq("reconciliation_status", "pendente")
        .gte("effective_payment_date", minDate)
        .lte("effective_payment_date", maxDate);
      if (companyId) paymentsQuery = paymentsQuery.eq("company_id", companyId);

      let revenuesQuery = supabase
        .from("revenues")
        .select("id, description, realized_amount, realized_date")
        .eq("status", "recebida")
        .eq("reconciliation_status", "pendente")
        .gte("realized_date", minDate)
        .lte("realized_date", maxDate);
      if (companyId) revenuesQuery = revenuesQuery.eq("company_id", companyId);

      const [{ data: paymentsData }, { data: revenuesData }, { data: investmentsData }, { data: transfersData }] = await Promise.all([
        paymentsQuery,
        revenuesQuery,
        supabase
          .from("investments")
          .select("id, institution, product, applied_amount, applied_date, redeemed_amount, redeemed_date, status")
          .eq("bank_account_id", bankAccountId)
          .gte("applied_date", minDate)
          .lte("applied_date", maxDate),
        supabase
          .from("transfers")
          .select("id, tipo, description, counterpart_name, amount, transfer_date, from_account_id, to_account_id")
          .gte("transfer_date", minDate)
          .lte("transfer_date", maxDate)
          .or(`from_account_id.eq.${bankAccountId},to_account_id.eq.${bankAccountId}`),
      ]);

      const reconciledInvestmentIds = new Set(
        (reconciledData ?? [])
          .flatMap((e: any) => e.reconciliations ?? [])
          .filter((r: any) => r.entity_type === "investment_application" || r.entity_type === "investment_redemption")
          .map((r: any) => r.entity_id)
      );
      const reconciledTransferIds = new Set(
        (reconciledData ?? [])
          .flatMap((e: any) => e.reconciliations ?? [])
          .filter((r: any) => r.entity_type === "transfer")
          .map((r: any) => r.entity_id)
      );

      paymentCandidates = (paymentsData ?? []).map((p) => ({
        key: `payment:${p.id}`,
        entityType: "payment" as const,
        entityId: p.id,
        label: p.description,
        amount: Number(p.gross_amount),
        date: p.effective_payment_date,
      }));

      revenueCandidates = (revenuesData ?? []).map((r) => ({
        key: `revenue:${r.id}`,
        entityType: "revenue" as const,
        entityId: r.id,
        label: r.description,
        amount: Number(r.realized_amount),
        date: r.realized_date,
      }));

      for (const inv of investmentsData ?? []) {
        if (!reconciledInvestmentIds.has(`app:${inv.id}`)) {
          investmentApplicationCandidates.push({
            key: `investment_application:${inv.id}`,
            entityType: "investment_application" as const,
            entityId: inv.id,
            label: `Aplicação: ${inv.product} — ${inv.institution}`,
            amount: Number(inv.applied_amount),
            date: inv.applied_date,
          });
        }
        if (inv.redeemed_date && !reconciledInvestmentIds.has(`red:${inv.id}`)) {
          investmentRedemptionCandidates.push({
            key: `investment_redemption:${inv.id}`,
            entityType: "investment_redemption" as const,
            entityId: inv.id,
            label: `Resgate: ${inv.product} — ${inv.institution}`,
            amount: Number(inv.redeemed_amount),
            date: inv.redeemed_date,
          });
        }
      }

      for (const t of transfersData ?? []) {
        if (reconciledTransferIds.has(t.id)) continue;
        const label = `${TRANSFER_LABELS[t.tipo] ?? t.tipo}${t.counterpart_name ? ` — ${t.counterpart_name}` : t.description ? ` — ${t.description}` : ""}`;
        const candidate = {
          key: `transfer:${t.id}`,
          entityType: "transfer" as const,
          entityId: t.id,
          label,
          amount: Number(t.amount),
          date: t.transfer_date,
        };
        if (t.from_account_id === bankAccountId) transferOutflowCandidates.push(candidate);
        if (t.to_account_id === bankAccountId) transferInflowCandidates.push(candidate);
      }

      // Montar mapa de conciliados
      for (const e of reconciledData ?? []) {
        const rec = (e.reconciliations as any)?.[0];
        if (!rec) continue;
        if (rec.entity_type === "payment" && rec.payments) {
          reconciledMap[e.id] = { key: `payment:${rec.entity_id}`, label: rec.payments.description, amount: Number(rec.payments.gross_amount), date: rec.payments.effective_payment_date };
        } else if (rec.entity_type === "revenue" && rec.revenues) {
          reconciledMap[e.id] = { key: `revenue:${rec.entity_id}`, label: rec.revenues.description, amount: Number(rec.revenues.realized_amount), date: rec.revenues.realized_date };
        } else if (rec.entity_type === "investment_application" && rec.investments) {
          reconciledMap[e.id] = { key: `investment_application:${rec.entity_id}`, label: `Aplicação: ${rec.investments.product} — ${rec.investments.institution}`, amount: Number(rec.investments.applied_amount), date: rec.investments.applied_date };
        } else if (rec.entity_type === "investment_redemption" && rec.investments) {
          reconciledMap[e.id] = { key: `investment_redemption:${rec.entity_id}`, label: `Resgate: ${rec.investments.product} — ${rec.investments.institution}`, amount: Number(rec.investments.redeemed_amount), date: rec.investments.redeemed_date };
        } else if (rec.entity_type === "transfer" && rec.transfers) {
          const t = rec.transfers;
          const label = `${TRANSFER_LABELS[t.tipo] ?? t.tipo}${t.counterpart_name ? ` — ${t.counterpart_name}` : t.description ? ` — ${t.description}` : ""}`;
          reconciledMap[e.id] = { key: `transfer:${rec.entity_id}`, label, amount: Number(t.amount), date: t.transfer_date };
        }
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Conciliação"
        subtitle="Concilie extratos bancários com pagamentos e receitas"
        actions={
          <div className="flex gap-2">
            <ExportReconciliationButton bankAccountId={openImport?.bank_account_id} />
            <Link
              href="/conciliacao/importar"
              className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors"
            >
              + Importar extrato
            </Link>
          </div>
        }
      />

      {/* Stats strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-4">
          <p className="text-xs text-ps-muted uppercase tracking-wide mb-1">Extratos importados</p>
          <p className="text-2xl font-semibold tabular-nums">{totalImports}</p>
        </div>
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-4">
          <p className="text-xs text-ps-muted uppercase tracking-wide mb-1">Entradas pendentes</p>
          <p className={`text-2xl font-semibold tabular-nums ${globalPendente > 0 ? "text-amber-600" : "text-ps-green"}`}>
            {globalPendente}
          </p>
        </div>
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-4">
          <p className="text-xs text-ps-muted uppercase tracking-wide mb-1">Taxa de conciliação</p>
          <div className="flex items-end gap-2">
            <p className={`text-2xl font-semibold tabular-nums ${globalPct === 100 ? "text-ps-green" : "text-ps-ink"}`}>
              {globalPct}%
            </p>
            <span className="text-xs text-ps-muted mb-1">{globalConciliado}/{globalTotal} entradas</span>
          </div>
          <div className="mt-2 h-1.5 bg-ps-bg-2 rounded-full overflow-hidden">
            <div className="h-full bg-ps-green rounded-full transition-all" style={{ width: `${globalPct}%` }} />
          </div>
        </div>
      </div>

      {totalImports === 0 ? (
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-10 text-center">
          <p className="text-ps-muted mb-3">Nenhum extrato importado ainda.</p>
          <Link href="/conciliacao/importar" className="text-sm text-ps-navy underline">
            Importar primeiro extrato
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(imports ?? []).map((imp: any) => {
            const acc = imp.bank_accounts as any;
            const company = companyLabel(acc?.companies);
            const nickname = acc?.nickname ?? acc?.bank_name ?? "Conta";
            const bankName = acc?.bank_name ?? "";
            const dot = bankDot(bankName);
            const counts = countsByImport[imp.id] ?? { total: 0, conciliado: 0, pendente: 0, ignorado: 0 };
            const done = counts.conciliado + counts.ignorado;
            const pct = counts.total > 0 ? Math.round((done / counts.total) * 100) : 0;
            const isOpen = openImportId === imp.id;

            return (
              <div key={imp.id} className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden">
                {/* Session card header */}
                <div className={`flex items-center gap-3 px-4 py-3 ${isOpen ? "border-b border-ps-navy/5" : ""}`}>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-ps-ink">{company} — {nickname}</span>
                      <span className="text-xs text-ps-muted">{imp.file_name}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-ps-muted">Importado em {fmtDate(imp.created_at.slice(0, 10))}</span>
                      <span className="text-xs text-ps-muted">{counts.total} lançamentos</span>
                      {counts.pendente > 0 && (
                        <span className="text-xs font-medium text-amber-600">{counts.pendente} pendentes</span>
                      )}
                      {counts.pendente === 0 && counts.total > 0 && (
                        <span className="text-xs font-medium text-ps-green">✓ Concluído</span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="hidden sm:flex items-center gap-2 flex-shrink-0 w-32">
                    <div className="flex-1 h-1.5 bg-ps-bg-2 rounded-full overflow-hidden">
                      <div className="h-full bg-ps-green rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-ps-muted w-8 text-right">{pct}%</span>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <SessionDeleteButton importId={imp.id} />
                    <Link
                      href={isOpen ? "/conciliacao" : `/conciliacao?open=${imp.id}`}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        isOpen
                          ? "bg-ps-bg-2 text-ps-muted hover:bg-ps-bg-2"
                          : "bg-ps-navy/5 text-ps-navy hover:bg-ps-navy/10"
                      }`}
                    >
                      {isOpen ? "Fechar" : "Conciliar"}
                    </Link>
                  </div>
                </div>

                {/* Inline workspace */}
                {isOpen && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
                        <tr>
                          <th className="text-left px-4 py-3">Data</th>
                          <th className="text-left px-4 py-3">Descrição do banco</th>
                          <th className="text-left px-4 py-3">Valor</th>
                          <th className="text-left px-4 py-3">Corresponder a</th>
                          <th className="text-left px-4 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry: any) => (
                          <ReconcileRow
                            key={entry.id}
                            entry={entry}
                            candidates={
                              entry.direction === "entrada"
                                ? [...revenueCandidates, ...investmentRedemptionCandidates, ...transferInflowCandidates]
                                : [...paymentCandidates, ...investmentApplicationCandidates, ...transferOutflowCandidates]
                            }
                          />
                        ))}
                        {reconciledEntries.map((entry: any) => (
                          <ReconcileRow
                            key={entry.id}
                            entry={entry}
                            candidates={[]}
                            reconciled={reconciledMap[entry.id] ?? null}
                          />
                        ))}
                        {entries.length === 0 && reconciledEntries.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-ps-muted">
                              Nenhuma entrada encontrada neste extrato.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
