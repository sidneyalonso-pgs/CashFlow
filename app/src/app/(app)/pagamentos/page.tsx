import { companyLabel } from "@/lib/format";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatBRL } from "@/lib/calculations/money";
import { InlineDueDateEdit } from "./InlineDueDateEdit";
import { PaymentRowActions } from "./PaymentRowActions";

function getDisplayStatus(status: string, dueDate: string | null, today: string): string {
  if (status === "pago" || status === "cancelado") return status;
  if (!dueDate) return "em_aberto";
  return dueDate >= today ? "provisionado" : "em_aberto";
}

function SortLink({
  label,
  field,
  currentSort,
  currentDir,
  searchParams,
}: {
  label: string;
  field: string;
  currentSort: string;
  currentDir: string;
  searchParams: Record<string, string | undefined>;
}) {
  const isActive = currentSort === field;
  const nextDir = isActive && currentDir === "desc" ? "asc" : "desc";
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([k, v]) => { if (v && k !== "sort_by" && k !== "sort_dir") params.set(k, v); });
  params.set("sort_by", field);
  params.set("sort_dir", nextDir);

  return (
    <Link href={`?${params.toString()}`} className="flex items-center gap-1 hover:text-ps-ink transition-colors group">
      {label}
      <span className={`text-[10px] ${isActive ? "text-ps-green" : "text-ps-muted/40 group-hover:text-ps-muted"}`}>
        {isActive ? (currentDir === "desc" ? "↓" : "↑") : "↕"}
      </span>
    </Link>
  );
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: {
    company_id?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    sort_by?: string;
    sort_dir?: string;
  };
}) {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];

  const sortBy = searchParams.sort_by === "gross_amount" ? "gross_amount" : "due_date";
  const sortDir = searchParams.sort_dir === "asc";

  let query = supabase
    .from("payments")
    .select("id, description, gross_amount, due_date, status, companies(legal_name, trade_name), suppliers(legal_name)")
    .is("deleted_at", null)
    .order(sortBy, { ascending: sortDir });

  if (searchParams.company_id) query = query.eq("company_id", searchParams.company_id);

  // Filtro de status — mapeando para os valores reais do banco
  if (searchParams.status === "pago") {
    query = query.eq("status", "pago");
  } else if (searchParams.status === "provisionado") {
    query = query.neq("status", "pago").neq("status", "cancelado").gte("due_date", today);
  } else if (searchParams.status === "em_aberto") {
    query = query.neq("status", "pago").neq("status", "cancelado").lt("due_date", today);
  } else if (searchParams.status === "cancelado") {
    query = query.eq("status", "cancelado");
  }

  if (searchParams.date_from) query = query.gte("due_date", searchParams.date_from);
  if (searchParams.date_to) query = query.lte("due_date", searchParams.date_to);

  const [{ data: payments }, { data: companies }] = await Promise.all([
    query,
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
  ]);

  const rows = (payments ?? []).map((p: any) => ({
    ...p,
    displayStatus: getDisplayStatus(p.status, p.due_date, today),
  }));

  const sp = searchParams as Record<string, string | undefined>;
  const sortArgs = { currentSort: sortBy, currentDir: searchParams.sort_dir ?? "desc", searchParams: sp };

  return (
    <div>
      <PageHeader
        title="Pagamentos"
        subtitle="Lance pagamentos avulsos ou gerencie os pagamentos recorrentes"
        actions={
          <div className="flex gap-2">
            <Link
              href="/pagamentos/recorrentes"
              className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors"
            >
              Pagamentos recorrentes
            </Link>
            <Link
              href="/pagamentos/novo-em-massa"
              className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors"
            >
              Lançar em massa
            </Link>
            <Link
              href="/pagamentos/novo"
              className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors"
            >
              Lançar pagamento
            </Link>
          </div>
        }
      />

      {/* Filtros */}
      <form className="flex flex-wrap gap-3 mb-4">
        <select
          name="company_id"
          defaultValue={searchParams.company_id ?? ""}
          className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
        >
          <option value="">Todas as empresas</option>
          {(companies ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.trade_name || c.legal_name}
            </option>
          ))}
        </select>

        <select
          name="status"
          defaultValue={searchParams.status ?? ""}
          className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
        >
          <option value="">Todos os status</option>
          <option value="pago">Pago</option>
          <option value="provisionado">Provisionado (futuro)</option>
          <option value="em_aberto">Em aberto (vencido)</option>
          <option value="cancelado">Cancelado</option>
        </select>

        <div className="flex items-center gap-2">
          <label className="text-xs text-ps-muted">De</label>
          <input
            type="date"
            name="date_from"
            defaultValue={searchParams.date_from ?? ""}
            className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
          />
          <label className="text-xs text-ps-muted">até</label>
          <input
            type="date"
            name="date_to"
            defaultValue={searchParams.date_to ?? ""}
            className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
          />
        </div>

        {/* Preservar sort nos filtros */}
        {searchParams.sort_by && <input type="hidden" name="sort_by" value={searchParams.sort_by} />}
        {searchParams.sort_dir && <input type="hidden" name="sort_dir" value={searchParams.sort_dir} />}

        <button className="text-sm text-ps-navy underline" type="submit">
          Filtrar
        </button>
        {(searchParams.company_id || searchParams.status || searchParams.date_from || searchParams.date_to) && (
          <Link href="/pagamentos" className="text-sm text-ps-muted underline">
            Limpar
          </Link>
        )}
      </form>

      {/* Tabela */}
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 whitespace-nowrap">Empresa</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Fornecedor</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Descrição</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">
                <SortLink label="Vencimento" field="due_date" {...sortArgs} />
              </th>
              <th className="text-left px-4 py-3 whitespace-nowrap">
                <SortLink label="Valor" field="gross_amount" {...sortArgs} />
              </th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Status</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p: any) => (
              <tr key={p.id} className="border-t border-ps-navy/5 hover:bg-ps-bg-2/60 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">{companyLabel(p.companies)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{p.suppliers?.legal_name ?? "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link href={`/pagamentos/${p.id}`} className="font-medium text-ps-ink hover:underline">
                    {p.description}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <InlineDueDateEdit paymentId={p.id} dueDate={p.due_date} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap tabular-nums">{formatBRL(p.gross_amount)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={p.displayStatus} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <PaymentRowActions
                    paymentId={p.id}
                    displayStatus={p.displayStatus}
                    grossAmount={p.gross_amount}
                    dueDate={p.due_date}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ps-muted">
                  Nenhum pagamento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
