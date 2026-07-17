"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { TextField, SelectField } from "@/components/FormField";
import { updateCategory } from "./actions";

type Category = {
  id: string;
  name: string;
  allowed_direction: string;
  financial_nature: string | null;
  economic_classification: string | null;
  fpa_classification: string | null;
  status: string;
};

export function EditCategoryButton({ category }: { category: Category }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateCategory(category.id, formData);
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

      <Modal open={open} onClose={() => setOpen(false)} title="Editar categoria">
        <form action={handleSubmit} className="space-y-3">
          <TextField label="Nome" name="name" defaultValue={category.name} required />
          <SelectField
            label="Direção permitida"
            name="allowed_direction"
            defaultValue={category.allowed_direction}
            options={[
              { value: "entrada", label: "Entrada" },
              { value: "saida", label: "Saída" },
              { value: "ambas", label: "Ambas" },
            ]}
          />
          <TextField label="Natureza financeira" name="financial_nature" defaultValue={category.financial_nature ?? ""} />
          <TextField
            label="Classificação econômica"
            name="economic_classification"
            defaultValue={category.economic_classification ?? ""}
          />
          <TextField label="Classificação FP&A" name="fpa_classification" defaultValue={category.fpa_classification ?? ""} />
          <SelectField
            label="Status"
            name="status"
            defaultValue={category.status}
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
