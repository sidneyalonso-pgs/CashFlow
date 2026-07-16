"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { TextField, SelectField } from "@/components/FormField";
import { createTemplate } from "./actions";

export function NewTemplateButton({
  companies,
  suppliers,
  categories,
  costCenters,
  bankAccounts,
}: {
  companies: Array<{ id: string; legal_name: string }>;
  suppliers: Array<{ id: string; legal_name: string }>;
  categories: Array<{ id: string; name: string }>;
  costCenters: Array<{ id: string; code: string; name: string }>;
  bankAccounts: Array<{ id: string; bank_name: string; nickname: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createTemplate(formData);
      if (result.error) setError(result.error);
      else {
        setError(null);
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors"
      >
        Novo pagamento fixo
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo pagamento fixo">
        <form action={handleSubmit} className="space-y-3">
          <SelectField
            label="Empresa"
            name="company_id"
            required
            options={companies.map((c) => ({ value: c.id, label: c.legal_name }))}
          />
          <SelectField
            label="Fornecedor"
            name="supplier_id"
            required
            options={suppliers.map((s) => ({ value: s.id, label: s.legal_name }))}
          />
          <TextField label="Descrição" name="description" placeholder="Ex: Aluguel escritório" required />
          <TextField label="Dia do mês (1-28)" name="day_of_month" type="number" required />
          <SelectField
            label="Categoria"
            name="category_id"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectField
            label="Centro de custo"
            name="cost_center_id"
            options={costCenters.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
          />
          <SelectField
            label="Conta pagadora"
            name="paying_bank_account_id"
            options={bankAccounts.map((a) => ({ value: a.id, label: a.nickname ?? a.bank_name }))}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm text-ps-muted hover:text-ps-ink"
            >
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
