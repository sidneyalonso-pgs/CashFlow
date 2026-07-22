"use client";

import { useState, useTransition } from "react";
import { updateSupplier } from "./actions";

type Supplier = {
  id: string;
  legal_name: string;
  cost_type: string;
  default_category_id: string | null;
  default_cost_center_id: string | null;
  default_description: string | null;
  status: string;
  is_recurring: boolean | null;
  recurring_amount: number | null;
  recurring_day_of_month: number | null;
  categories: { name: string } | null;
  cost_centers: { code: string; name: string } | null;
};

type Category = { id: string; name: string };
type CostCenter = { id: string; code: string; name: string };

const COST_TYPES = [
  { value: "despesas", label: "Despesas" },
  { value: "custo_direto", label: "Custo Direto" },
  { value: "custo_indireto", label: "Custo Indireto" },
];

function SupplierRow({
  supplier,
  categories,
  costCenters,
}: {
  supplier: Supplier;
  categories: Category[];
  costCenters: CostCenter[];
}) {
  const [isPending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [costType, setCostType] = useState(supplier.cost_type);
  const [categoryId, setCategoryId] = useState(supplier.default_category_id ?? "");
  const [costCenterId, setCostCenterId] = useState(supplier.default_cost_center_id ?? "");
  const [description, setDescription] = useState(supplier.default_description ?? "");
  const [status, setStatus] = useState(supplier.status);

  function mark(setter: (v: any) => void, value: any) {
    setter(value);
    setDirty(true);
    setSaved(false);
  }

  function handleSave() {
    const fd = new FormData();
    fd.set("legal_name", supplier.legal_name);
    fd.set("cost_type", costType);
    fd.set("default_category_id", categoryId);
    fd.set("default_cost_center_id", costCenterId);
    fd.set("default_description", description);
    fd.set("status", status);
    fd.set("tax_id", "");

    startTransition(async () => {
      const result = await updateSupplier(supplier.id, fd);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setDirty(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  const cellCls = "h-9 rounded border border-transparent px-2 text-sm bg-transparent transition-all focus:outline-none focus:ring-2 focus:ring-ps-green focus:border-ps-green focus:bg-white hover:border-ps-navy/20 hover:bg-white cursor-pointer w-full";

  return (
    <tr className={`border-t border-ps-navy/5 transition-colors ${dirty ? "bg-amber-50/60" : "hover:bg-ps-bg-2/40"}`}>
      {/* Razão social */}
      <td className="px-3 py-2 min-w-[200px]">
        <span className="text-sm font-medium text-ps-ink leading-tight">
          {supplier.legal_name}
          {supplier.is_recurring && (
            <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">recorrente</span>
          )}
        </span>
      </td>

      {/* Tipo de custo */}
      <td className="px-3 py-2 min-w-[140px]">
        <select value={costType} onChange={(e) => mark(setCostType, e.target.value)} className={cellCls}>
          {COST_TYPES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </td>

      {/* Categoria */}
      <td className="px-3 py-2 min-w-[200px]">
        <select value={categoryId} onChange={(e) => mark(setCategoryId, e.target.value)} className={cellCls}>
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </td>

      {/* Departamento */}
      <td className="px-3 py-2 min-w-[180px]">
        <select value={costCenterId} onChange={(e) => mark(setCostCenterId, e.target.value)} className={cellCls}>
          <option value="">—</option>
          {costCenters.map((c) => (
            <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
          ))}
        </select>
      </td>

      {/* Descrição padrão */}
      <td className="px-3 py-2 min-w-[220px]">
        <input
          type="text"
          value={description}
          onChange={(e) => mark(setDescription, e.target.value)}
          placeholder="Descrição padrão..."
          className={cellCls}
        />
      </td>

      {/* Status */}
      <td className="px-3 py-2 min-w-[110px]">
        <select value={status} onChange={(e) => mark(setStatus, e.target.value)} className={cellCls}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
      </td>

      {/* Ações */}
      <td className="px-3 py-2 whitespace-nowrap">
        {error && <span className="text-xs text-red-500 mr-2">{error}</span>}
        {saved && !dirty && (
          <span className="text-xs text-ps-green font-medium">✓ Salvo</span>
        )}
        {dirty && (
          <button
            onClick={handleSave}
            disabled={isPending}
            className="text-xs bg-ps-green text-ps-navy-900 font-semibold rounded px-3 py-1.5 disabled:opacity-60 hover:brightness-105 transition-all"
          >
            {isPending ? "Salvando..." : "Salvar"}
          </button>
        )}
      </td>
    </tr>
  );
}

export function SuppliersTable({
  suppliers,
  categories,
  costCenters,
}: {
  suppliers: Supplier[];
  categories: Category[];
  costCenters: CostCenter[];
}) {
  const thCls = "text-left px-3 py-3 text-xs uppercase tracking-wide text-ps-muted whitespace-nowrap";

  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-ps-bg-2">
          <tr>
            <th className={thCls}>Razão social</th>
            <th className={thCls}>Tipo de custo</th>
            <th className={thCls}>Categoria</th>
            <th className={thCls}>Departamento</th>
            <th className={thCls}>Descrição padrão</th>
            <th className={thCls}>Status</th>
            <th className={thCls}></th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s) => (
            <SupplierRow
              key={s.id}
              supplier={s}
              categories={categories}
              costCenters={costCenters}
            />
          ))}
          {suppliers.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-ps-muted text-sm">
                Nenhum fornecedor cadastrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
