"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { TextField, SelectField } from "@/components/FormField";
import { createSupplier } from "./actions";

export function NewSupplierButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createSupplier(formData);
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
        Novo fornecedor
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo fornecedor">
        <form action={handleSubmit} className="space-y-3">
          <TextField label="Razão social ou nome" name="legal_name" required />
          <TextField label="Nome fantasia" name="trade_name" />
          <TextField label="CPF ou CNPJ" name="tax_id" required />
          <SelectField
            label="Tipo de pessoa"
            name="person_type"
            required
            options={[
              { value: "fisica", label: "Física" },
              { value: "juridica", label: "Jurídica" },
            ]}
          />
          <TextField label="Chave Pix" name="pix_key" />
          <TextField label="E-mail" name="email" type="email" />
          <TextField label="Telefone" name="phone" />

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
