import { companyLabel } from "@/lib/format";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import { formatBRL } from "@/lib/calculations/money";
import { RevenueSettleButton } from "./RevenueSettleButton";
import { EditRevenueButton } from "./EditRevenueButton";

function SortLink({ label, field, currentSort, currentDir, searchParams }: any) {
  const isActive = currentSort === field;
  const nextDir = isActive && currentDir === "desc" ? "asc" : "desc";
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([k, v]: any) => {
    if (v && k !== "sort_by" && k !== "sort_dir") params.set(k, v as string);
  });
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

export default async function RevenuesPage({
  searchParams,
}: {
  searchParams: {
    company_id?: string;
    category_id?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    sort_by?: string;
    sort_dir?: string;
  };
}) {
  const supabase = createClient();

  const sortBy = searchParams.sort_by === "amount" ? "expected_amount"
    : searchParams.sort_by === "category" ? "category_id"
    : "expected_date";
  const sortAsc = searchParams.sort_dir === "asc";

  let query = supabase
    .from("revenues")
    .select("id, description, category_id, expected_amount, realized_amount, expected_date, status, notes, companies(legal_name, trade_name), categories(name)")
    .is("deleted_at", null)
    .order(sortBy, { ascending: sortAsc });

  if (searchParams.company_id) query = query.eq("company_id", searchParams.company_id);
  if (searchParams.category_id) query = query.eq("category_id", searchParams.category_id);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.date_from) query = query.gte("expected_date", searchParams.date_from);
  if (searchParams.date_to) query = query.lte("expected_date", searchParams.date_to);

  const [{ data: revenues }, { data: bankAccounts }, { data: categories }, { data: companies }] = await Promise.all([
    query,
    supabase.from("bank_accounts").select("id, bank_name, nickname").order("bank_name"),
    supabase.from("categories").select("id, name").in("allowed_direction", ["entrada", "ambas"]).order("name"),
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
  ]);

  const sp = searchParams;

  return (
    <div>
      <PageHeader
        title="Receitas"
        subtitle="Receitas recebidas e estimativas futuras"
        actions={
          <div className="flex gap-2">
            <Link
              href="/receitas/importar"
              className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors"
            >
              Importar Excel
            </Link>
            <Link
              href="/receitas/novo"
              className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors"
            >
              Nova receita
            </Link>
          </div>
        }
      />

      <form className="flex flex-wrap gap-3 mb-4">
        <select name="company_id" defaultValue={sp.company_id ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Todas as empresas</option>
          {(companies ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
          ))}
        </select>

        <select name="category_id" defaultValue={sp.category_id ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Todas as categorias</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select name="status" defaultValue={sp.status ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Todos os status</option>
          <option value="recebida">Recebida</option>
          <option value="estimada">Estimada</option>
          <option value="confirmada">Confirmada</option>
          <option value="atrasada">Atrasada</option>
          <option value="cancelada">Cancelada</option>
        </select>

        <input type="date" name="date_from" defaultValue={sp.date_from ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm" />
        <input type="date" name="date_to" defaultValue={sp.date_to ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm" />

        <button className="text-sm text-ps-navy underline" type="submit">Filtrar</button>
        <Link href="/receitas" className="text-sm text-ps-muted underline self-center">Limpar</Link>
      </form>

      <DataTable
        rows={revenues ?? []}
        rowKey={(r: any) => r.id}
        columns={[
          { header: "Empresa", cell: (r: any) => companyLabel(r.companies) },
          {
            header: <SortLink label="Categoria" field="category" currentSort={sp.sort_by} currentDir={sp.sort_dir ?? "desc"} searchParams={sp} />,
            cell: (r: any) => r.categories?.name ?? "—",
          },
          { header: "Descrição", cell: (r: any) => <span className="font-medium text-ps-ink">{r.description}</span> },
          {
            header: <SortLink label="Data" field="expected_date" currentSort={sp.sort_by} currentDir={sp.sort_dir ?? "desc"} searchParams={sp} />,
            cell: (r: any) => r.expected_date,
          },
          {
            header: <SortLink label="Valor" field="amount" currentSort={sp.sort_by} currentDir={sp.sort_dir ?? "desc"} searchParams={sp} />,
            cell: (r: any) => (
              <span className="tabular-nums text-ps-green-700">{formatBRL(r.realized_amount ?? r.expected_amount)}</span>
            ),
          },
          { header: "Status", cell: (r: any) => <StatusBadge status={r.status} /> },
          {
            header: "Ações",
            cell: (r: any) => (
              <div className="flex gap-2">
                <EditRevenueButton revenue={r} categories={categories ?? []} />
                {["estimada", "confirmada", "atrasada", "reprogramada"].includes(r.status) && (
                  <RevenueSettleButton revenueId={r.id} bankAccounts={bankAccounts ?? []} />
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
