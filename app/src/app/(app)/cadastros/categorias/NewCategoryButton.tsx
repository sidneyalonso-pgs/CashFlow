"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { TextField, SelectField } from "@/components/FormField";
import { createCategory } from "./actions";

export function NewCategoryButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createCategory(formData);
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
        Nova categoria
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova categoria">
        <form action={handleSubmit} className="space-y-3">
          <TextField label="Nome" name="name" required />
          <SelectField
            label="Direção permitida"
            name="allowed_direction"
            options={[
              { value: "entrada", label: "Entrada" },
              { value: "saida", label: "Saída" },
              { value: "ambas", label: "Ambas" },
            ]}
            defaultValue="ambas"
          />
          <TextField label="Natureza financeira" name="financial_nature" placeholder="Ex: operacional" />
          <TextField label="Classificação econômica" name="economic_classification" placeholder="Ex: custo" />
          <TextField label="Classificação FP&A" name="fpa_classification" placeholder="Ex: custo_direto" />

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
