"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkSettlePayments } from "../actions";

type PendingPayment = {
  id: string;
  description: string;
  company_name: string;
  supplier_name: string;
  due_date: string;
};

export function BulkSettleForm({
  payments,
  bankAccounts,
}: {
  payments: PendingPayment[];
  bankAccounts: Array<{ id: string; bank_name: string; nickname: string | null }>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [values, setValues] = useState<Record<string, { amount: string; paidAt: string; bankAccountId: string }>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateValue(id: string, field: "amount" | "paidAt" | "bankAccountId", value: string) {
    setValues((prev) => {
      const current = prev[id] ?? { amount: "", paidAt: "", bankAccountId: "" };
      return { ...prev, [id]: { ...current, [field]: value } };
    });
  }

  function handleSubmit() {
    const entries = Array.from(selected).map((id) => ({
      id,
      amount: Number(values[id]?.amount ?? 0),
      paidAt: values[id]?.paidAt ?? "",
      bankAccountId: values[id]?.bankAccountId || null,
    }));

    const invalid = entries.filter((e) => !e.amount || e.amount <= 0 || !e.paidAt);
    if (invalid.length > 0) {
      setErrors(["Preencha valor e data para todos os pagamentos selecionados."]);
      return;
    }

    startTransition(async () => {
      const result = await bulkSettlePayments(entries);
      if (result.errors.length > 0) setErrors(result.errors);
      else {
        setErrors([]);
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  if (payments.length === 0) {
    return <p className="text-sm text-ps-muted">Nenhum pagamento pendente de valor no momento.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3"></th>
              <th className="text-left px-4 py-3">Descrição</th>
              <th className="text-left px-4 py-3">Empresa</th>
              <th className="text-left px-4 py-3">Fornecedor</th>
              <th className="text-left px-4 py-3">Valor</th>
              <th className="text-left px-4 py-3">Data do pagamento</th>
              <th className="text-left px-4 py-3">Conta</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-ps-navy/5">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                </td>
                <td className="px-4 py-3 font-medium text-ps-ink">{p.description}</td>
                <td className="px-4 py-3">{p.company_name}</td>
                <td className="px-4 py-3">{p.supplier_name}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    step="0.01"
                    disabled={!selected.has(p.id)}
                    value={values[p.id]?.amount ?? ""}
                    onChange={(e) => updateValue(p.id, "amount", e.target.value)}
                    className="w-28 rounded-ps-sm border border-ps-navy/15 px-2 py-1 text-sm disabled:bg-ps-bg-2"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="date"
                    disabled={!selected.has(p.id)}
                    value={values[p.id]?.paidAt ?? ""}
                    onChange={(e) => updateValue(p.id, "paidAt", e.target.value)}
                    className="rounded-ps-sm border border-ps-navy/15 px-2 py-1 text-sm disabled:bg-ps-bg-2"
                  />
                </td>
                <td className="px-4 py-3">
                  <select
                    disabled={!selected.has(p.id)}
                    value={values[p.id]?.bankAccountId ?? ""}
                    onChange={(e) => updateValue(p.id, "bankAccountId", e.target.value)}
                    className="rounded-ps-sm border border-ps-navy/15 px-2 py-1 text-sm bg-white disabled:bg-ps-bg-2"
                  >
                    <option value="">—</option>
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nickname ?? a.bank_name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {errors.length > 0 && (
        <ul className="text-sm text-red-600">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      <button
        onClick={handleSubmit}
        disabled={selected.size === 0 || isPending}
        className="bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-5 py-2 text-sm disabled:opacity-60"
      >
        {isPending ? "Baixando..." : `Baixar ${selected.size} selecionado(s)`}
      </button>
    </div>
  );
}
