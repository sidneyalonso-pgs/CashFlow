"use client";

import { useMemo, useState, useTransition } from "react";
import { createPaidPayment } from "../actions";

type Supplier = {
  id: string;
  legal_name: string;
  default_category_id: string | null;
  default_cost_center_id: string | null;
};

export function PaymentForm({
  companies,
  suppliers,
  categories,
  costCenters,
  bankAccounts,
}: {
  companies: Array<{ id: string; legal_name: string }>;
  suppliers: Supplier[];
  categories: Array<{ id: string; name: string }>;
  costCenters: Array<{ id: string; code: string; name: string }>;
  bankAccounts: Array<{ id: string; bank_name: string; nickname: string | null }>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [supplierId, setSupplierId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");

  const suppliersById = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);

  function handleSupplierChange(id: string) {
    setSupplierId(id);
    const supplier = suppliersById.get(id);
    setCategoryId(supplier?.default_category_id ?? "");
    setCostCenterId(supplier?.default_cost_center_id ?? "");
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createPaidPayment(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-6 space-y-4 max-w-xl">
      <div>
        <label className="block text-sm text-ps-ink-2 mb-1">Empresa</label>
        <select
          name="company_id"
          required
          className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
        >
          <option value="">Selecione...</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.legal_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-ps-ink-2 mb-1">Fornecedor</label>
        <select
          name="supplier_id"
          required
          value={supplierId}
          onChange={(e) => handleSupplierChange(e.target.value)}
          className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
        >
          <option value="">Selecione...</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.legal_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-ps-ink-2 mb-1">Descrição</label>
        <input
          name="description"
          required
          className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-ps-ink-2 mb-1">Valor pago</label>
          <input
            name="gross_amount"
            type="number"
            step="0.01"
            required
            className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-ps-ink-2 mb-1">Data do pagamento</label>
          <input
            name="paid_at"
            type="date"
            required
            className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-ps-ink-2 mb-1">
            Categoria <span className="text-xs text-ps-muted">(preenchida pelo fornecedor)</span>
          </label>
          <select
            name="category_id"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
          >
            <option value="">Selecione...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-ps-ink-2 mb-1">
            Centro de custo <span className="text-xs text-ps-muted">(preenchido pelo fornecedor)</span>
          </label>
          <select
            name="cost_center_id"
            value={costCenterId}
            onChange={(e) => setCostCenterId(e.target.value)}
            className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
          >
            <option value="">Selecione...</option>
            {costCenters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-ps-ink-2 mb-1">Conta pagadora</label>
        <select name="paying_bank_account_id" className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Selecione...</option>
          {bankAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nickname ?? a.bank_name}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-ps-ink-2">
        <input type="checkbox" name="recurring" className="rounded" />
        Isso é um pagamento recorrente (só para referência — pagamentos fixos automáticos ficam em "Pagamentos fixos")
      </label>

      <div>
        <label className="block text-sm text-ps-ink-2 mb-1">Observações</label>
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-5 py-2 text-sm disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Lançar como pago"}
      </button>
    </form>
  );
}
