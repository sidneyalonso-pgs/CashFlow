"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBulkPayments } from "../actions";

type Supplier = {
  id: string;
  legal_name: string;
  default_category_id: string | null;
  default_cost_center_id: string | null;
  default_description: string | null;
};

type Row = {
  id: number;
  company_id: string;
  supplier_id: string;
  description: string;
  gross_amount: string;
  date: string;
  mode: "pago" | "programado";
  category_id: string;
  cost_center_id: string;
};

function makeRow(id: number, today: string): Row {
  return { id, company_id: "", supplier_id: "", description: "", gross_amount: "", date: today, mode: "pago", category_id: "", cost_center_id: "" };
}

export function BulkPaymentForm({
  companies,
  suppliers,
  categories,
  costCenters,
}: {
  companies: Array<{ id: string; legal_name: string; trade_name: string | null }>;
  suppliers: Supplier[];
  categories: Array<{ id: string; name: string }>;
  costCenters: Array<{ id: string; code: string; name: string }>;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [rows, setRows] = useState<Row[]>([makeRow(1, today), makeRow(2, today), makeRow(3, today)]);
  const [nextId, setNextId] = useState(4);
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const suppliersById = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);

  function addRow() {
    setRows((prev) => [...prev, makeRow(nextId, today)]);
    setNextId((n) => n + 1);
  }

  function removeRow(id: number) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRow(id: number, field: keyof Row, value: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        if (field === "supplier_id") {
          const s = suppliersById.get(value);
          if (s) {
            updated.category_id = s.default_category_id ?? "";
            updated.cost_center_id = s.default_cost_center_id ?? "";
            if (!r.description) updated.description = s.default_description ?? "";
          }
        }
        return updated;
      })
    );
  }

  function handleSubmit() {
    const valid = rows.filter((r) => r.company_id && r.supplier_id && r.gross_amount && r.date);
    if (valid.length === 0) {
      setErrors(["Preencha pelo menos uma linha completa."]);
      return;
    }

    startTransition(async () => {
      const result = await createBulkPayments(
        valid.map((r) => ({
          company_id: r.company_id,
          supplier_id: r.supplier_id,
          description: r.description,
          gross_amount: Number(r.gross_amount),
          date: r.date,
          mode: r.mode,
          category_id: r.category_id || null,
          cost_center_id: r.cost_center_id || null,
        }))
      );
      if (result.errors.length > 0) {
        setErrors(result.errors);
      } else {
        router.push("/pagamentos");
      }
    });
  }

  const inputCls = "w-full rounded-ps-sm border border-ps-navy/15 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ps-green focus:border-ps-green";
  const thCls = "text-left px-3 py-2 text-xs uppercase tracking-wide text-ps-muted whitespace-nowrap";

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto bg-white rounded-ps shadow-ps-sm border border-ps-navy/5">
        <table className="w-full text-sm">
          <thead className="bg-ps-bg-2">
            <tr>
              <th className={thCls}>Empresa *</th>
              <th className={thCls}>Fornecedor *</th>
              <th className={thCls}>Descrição</th>
              <th className={thCls}>Valor *</th>
              <th className={thCls}>Data *</th>
              <th className={thCls}>Modo</th>
              <th className={thCls}>Categoria</th>
              <th className={thCls}>Centro de custo</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className={`border-t border-ps-navy/5 ${i % 2 === 1 ? "bg-ps-bg-2/30" : ""}`}>
                <td className="px-3 py-2 min-w-[160px]">
                  <select value={row.company_id} onChange={(e) => updateRow(row.id, "company_id", e.target.value)} className={inputCls}>
                    <option value="">Selecione...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 min-w-[180px]">
                  <select value={row.supplier_id} onChange={(e) => updateRow(row.id, "supplier_id", e.target.value)} className={inputCls}>
                    <option value="">Selecione...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.legal_name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 min-w-[180px]">
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) => updateRow(row.id, "description", e.target.value)}
                    placeholder="(opcional)"
                    className={inputCls}
                  />
                </td>
                <td className="px-3 py-2 min-w-[110px]">
                  <input
                    type="number"
                    step="0.01"
                    value={row.gross_amount}
                    onChange={(e) => updateRow(row.id, "gross_amount", e.target.value)}
                    placeholder="0,00"
                    className={inputCls}
                  />
                </td>
                <td className="px-3 py-2 min-w-[140px]">
                  <input
                    type="date"
                    value={row.date}
                    onChange={(e) => updateRow(row.id, "date", e.target.value)}
                    className={inputCls}
                  />
                </td>
                <td className="px-3 py-2 min-w-[130px]">
                  <select value={row.mode} onChange={(e) => updateRow(row.id, "mode", e.target.value as "pago" | "programado")} className={inputCls}>
                    <option value="pago">Já pago</option>
                    <option value="programado">Programado</option>
                  </select>
                </td>
                <td className="px-3 py-2 min-w-[160px]">
                  <select value={row.category_id} onChange={(e) => updateRow(row.id, "category_id", e.target.value)} className={inputCls}>
                    <option value="">(sem categoria)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 min-w-[160px]">
                  <select value={row.cost_center_id} onChange={(e) => updateRow(row.id, "cost_center_id", e.target.value)} className={inputCls}>
                    <option value="">(sem CC)</option>
                    {costCenters.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length <= 1}
                    className="p-1.5 text-ps-muted hover:text-red-500 disabled:opacity-30 transition-colors"
                    title="Remover linha"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-2 text-sm text-ps-navy font-medium hover:text-ps-green transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
          </svg>
          Adicionar linha
        </button>
        <span className="text-xs text-ps-muted">{rows.filter(r => r.company_id && r.supplier_id && r.gross_amount && r.date).length} de {rows.length} linhas preenchidas</span>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-ps-sm p-4 space-y-1">
          {errors.map((e, i) => (
            <p key={i} className="text-sm text-red-600">{e}</p>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-6 py-2.5 text-sm disabled:opacity-60 hover:brightness-105 transition-all"
        >
          {isPending ? "Salvando..." : "Salvar todos os pagamentos"}
        </button>
        <a href="/pagamentos" className="px-4 py-2.5 text-sm rounded-ps-sm border border-ps-navy/15 text-ps-ink hover:bg-ps-bg-2 transition-colors">
          Cancelar
        </a>
      </div>
    </div>
  );
}
