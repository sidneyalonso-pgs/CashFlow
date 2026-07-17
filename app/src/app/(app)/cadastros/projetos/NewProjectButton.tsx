"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { TextField, SelectField } from "@/components/FormField";
import { createProject } from "./actions";

export function NewProjectButton({
  companies,
  costCenters,
}: {
  companies: Array<{ id: string; legal_name: string; trade_name: string | null }>;
  costCenters: Array<{ id: string; name: string; code: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createProject(formData);
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
        Novo projeto
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo projeto">
        <form action={handleSubmit} className="space-y-3">
          <SelectField
            label="Empresa"
            name="company_id"
            required
            options={companies.map((c) => ({ value: c.id, label: c.trade_name || c.legal_name }))}
          />
          <TextField label="Código" name="code" required />
          <TextField label="Nome" name="name" required />
          <SelectField
            label="Centro de custo"
            name="cost_center_id"
            options={costCenters.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
          />
          <TextField label="Responsável" name="responsible_name" />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Data inicial" name="start_date" type="date" />
            <TextField label="Data final" name="end_date" type="date" />
          </div>

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
