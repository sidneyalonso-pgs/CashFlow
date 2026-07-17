"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { TextField, SelectField } from "@/components/FormField";
import { updateInvestment } from "./actions";

type Investment = {
  id: string;
  company_id: string;
  bank_account_id: string | null;
  institution: string;
  product: string;
  applied_amount: number;
  applied_date: string;
  due_date: string | null;
  liquidity: string | null;
  rate: string | null;
  indexer: string | null;
};

export function EditInvestmentButton({
  investment,
  companies,
  bankAccounts,
}: {
  investment: Investment;
  companies: Array<{ id: string; legal_name: string; trade_name: string | null }>;
  bankAccounts: Array<{ id: string; bank_name: string; nickname: string | null }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateInvestment(investment.id, formData);
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
      <button onClick={() => setOpen(true)} className="text-xs text-ps-navy underline">
        Editar
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Editar aplicação financeira">
        <form action={handleSubmit} className="space-y-3">
          <SelectField
            label="Empresa"
            name="company_id"
            required
            defaultValue={investment.company_id}
            options={companies.map((c) => ({ value: c.id, label: c.trade_name || c.legal_name }))}
          />
          <SelectField
            label="Conta de origem"
            name="bank_account_id"
            defaultValue={investment.bank_account_id ?? ""}
            options={bankAccounts.map((a) => ({ value: a.id, label: a.nickname ?? a.bank_name }))}
          />
          <TextField label="Instituição" name="institution" defaultValue={investment.institution} required />
          <TextField label="Produto" name="product" defaultValue={investment.product} required />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Valor aplicado"
              name="applied_amount"
              type="number"
              step="0.01"
              defaultValue={String(investment.applied_amount)}
              required
            />
            <TextField label="Data da aplicação" name="applied_date" type="date" defaultValue={investment.applied_date} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Vencimento" name="due_date" type="date" defaultValue={investment.due_date ?? ""} />
            <TextField label="Liquidez" name="liquidity" defaultValue={investment.liquidity ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Taxa" name="rate" defaultValue={investment.rate ?? ""} />
            <TextField label="Indexador" name="indexer" defaultValue={investment.indexer ?? ""} />
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
