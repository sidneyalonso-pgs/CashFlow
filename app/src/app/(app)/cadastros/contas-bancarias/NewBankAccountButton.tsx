"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { TextField, SelectField, CheckboxField } from "@/components/FormField";
import { createBankAccount } from "./actions";

const ACCOUNT_TYPES = [
  { value: "conta_corrente", label: "Conta corrente" },
  { value: "conta_pagamento", label: "Conta pagamento" },
  { value: "conta_arrecadadora", label: "Conta arrecadadora" },
  { value: "conta_garantia", label: "Conta garantia" },
  { value: "conta_investimento", label: "Conta investimento" },
  { value: "conta_restrita", label: "Conta restrita" },
  { value: "outra", label: "Outra" },
];

export function NewBankAccountButton({
  companies,
}: {
  companies: Array<{ id: string; legal_name: string; trade_name: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createBankAccount(formData);
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
        Nova conta
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova conta bancária">
        <form action={handleSubmit} className="space-y-3">
          <SelectField
            label="Empresa"
            name="company_id"
            required
            options={companies.map((c) => ({ value: c.id, label: c.trade_name || c.legal_name }))}
          />
          <TextField label="Banco" name="bank_name" required />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Código do banco" name="bank_code" />
            <TextField label="Agência" name="branch" />
          </div>
          <TextField label="Número da conta" name="account_number" required />
          <TextField label="Apelido" name="nickname" placeholder="Ex: Conta principal" />
          <SelectField label="Tipo da conta" name="account_type" required options={ACCOUNT_TYPES} />
          <TextField label="Saldo inicial" name="initial_balance" type="number" step="0.01" defaultValue="0" />
          <CheckboxField
            label="Considera no caixa disponível"
            name="counts_as_available_cash"
            defaultChecked
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
