"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { TextField, SelectField } from "@/components/FormField";
import { updateCompany } from "./actions";

export function EditCompanyButton({
  company,
}: {
  company: { id: string; legal_name: string; trade_name: string | null; cnpj: string; default_currency: string; status: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateCompany(company.id, formData);
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

      <Modal open={open} onClose={() => setOpen(false)} title="Editar empresa">
        <form action={handleSubmit} className="space-y-3">
          <TextField label="Razão social" name="legal_name" defaultValue={company.legal_name} required />
          <TextField label="Nome fantasia" name="trade_name" defaultValue={company.trade_name ?? ""} />
          <TextField label="CNPJ" name="cnpj" defaultValue={company.cnpj} required />
          <TextField label="Moeda padrão" name="default_currency" defaultValue={company.default_currency} />
          <SelectField
            label="Status"
            name="status"
            defaultValue={company.status}
            options={[
              { value: "ativo", label: "Ativo" },
              { value: "inativo", label: "Inativo" },
            ]}
          />

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
