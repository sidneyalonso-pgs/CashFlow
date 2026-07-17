"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { TextField, SelectField } from "@/components/FormField";
import { createInvestment } from "./actions";

export function NewInvestmentButton({
  companies,
  bankAccounts,
}: {
  companies: Array<{ id: string; legal_name: string; trade_name: string | null }>;
  bankAccounts: Array<{ id: string; bank_name: string; nickname: string | null }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createInvestment(formData);
      if (result.error) setError(result.error);
      else {
        setError(null);
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors"
      >
        Nova aplicação
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova aplicação financeira">
        <form action={handleSubmit} className="space-y-3">
          <SelectField
            label="Empresa"
            name="company_id"
            required
            options={companies.map((c) => ({ value: c.id, label: c.trade_name || c.legal_name }))}
          />
          <SelectField
            label="Conta de origem"
            name="bank_account_id"
            options={bankAccounts.map((a) => ({ value: a.id, label: a.nickname ?? a.bank_name }))}
          />
          <TextField label="Instituição" name="institution" required />
          <TextField label="Produto" name="product" placeholder="Ex: CDB, Tesouro Selic" required />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Valor aplicado" name="applied_amount" type="number" step="0.01" required />
            <TextField label="Data da aplicação" name="applied_date" type="date" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Vencimento" name="due_date" type="date" />
            <TextField label="Liquidez" name="liquidity" placeholder="Ex: Diária" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Taxa" name="rate" placeholder="Ex: 100% CDI" />
            <TextField label="Indexador" name="indexer" placeholder="Ex: CDI" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-ps-muted hover:text-ps-ink">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-4 py-2 text-sm disabled:opacity-60"
            >
              {isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
