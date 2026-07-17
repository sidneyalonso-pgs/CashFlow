"use client";

import { useState, useTransition } from "react";
import { createReceivedRevenue, createEstimatedRevenue } from "../actions";

export function RevenueForm({
  companies,
  categories,
  bankAccounts,
}: {
  companies: Array<{ id: string; legal_name: string; trade_name: string | null }>;
  categories: Array<{ id: string; name: string }>;
  bankAccounts: Array<{ id: string; bank_name: string; nickname: string | null }>;
}) {
  const [mode, setMode] = useState<"recebida" | "estimada">("recebida");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const action = mode === "recebida" ? createReceivedRevenue : createEstimatedRevenue;
      const result = await action(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-6 space-y-4 max-w-xl">
      <div className="flex gap-2 p-1 bg-ps-bg-2 rounded-ps-sm w-fit">
        <button
          type="button"
          onClick={() => setMode("recebida")}
          className={`px-4 py-1.5 rounded-ps-sm text-sm font-medium transition-colors ${
            mode === "recebida" ? "bg-white shadow-ps-sm text-ps-ink" : "text-ps-muted"
          }`}
        >
          Já recebida
        </button>
        <button
          type="button"
          onClick={() => setMode("estimada")}
          className={`px-4 py-1.5 rounded-ps-sm text-sm font-medium transition-colors ${
            mode === "estimada" ? "bg-white shadow-ps-sm text-ps-ink" : "text-ps-muted"
          }`}
        >
          Estimada (futura)
        </button>
      </div>

      <div>
        <label className="block text-sm text-ps-ink-2 mb-1">Empresa</label>
        <select name="company_id" required className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Selecione...</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.trade_name || c.legal_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-ps-ink-2 mb-1">Descrição</label>
        <input name="description" required className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-ps-ink-2 mb-1">Valor {mode === "estimada" && "estimado"}</label>
          <input
            name="expected_amount"
            type="number"
            step="0.01"
            required
            className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-ps-ink-2 mb-1">
            {mode === "recebida" ? "Data do recebimento" : "Data prevista"}
          </label>
          <input
            name={mode === "recebida" ? "received_at" : "expected_date"}
            type="date"
            required
            className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {mode === "estimada" && (
        <div>
          <label className="block text-sm text-ps-ink-2 mb-1">Probabilidade (%)</label>
          <input
            name="probability_pct"
            type="number"
            min={0}
            max={100}
            defaultValue={100}
            className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
          />
        </div>
      )}

      <div>
        <label className="block text-sm text-ps-ink-2 mb-1">Categoria</label>
        <select name="category_id" required className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Selecione...</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {mode === "recebida" && (
        <div>
          <label className="block text-sm text-ps-ink-2 mb-1">Conta recebedora</label>
          <select name="receiving_bank_account_id" className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
            <option value="">Selecione...</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nickname ?? a.bank_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm text-ps-ink-2 mb-1">Observações</label>
        <textarea name="notes" rows={2} className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-5 py-2 text-sm disabled:opacity-60"
      >
        {isPending ? "Salvando..." : mode === "recebida" ? "Lançar como recebida" : "Cadastrar estimativa"}
      </button>
    </form>
  );
}
