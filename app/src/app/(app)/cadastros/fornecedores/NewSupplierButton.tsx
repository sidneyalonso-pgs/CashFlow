"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { TextField, SelectField } from "@/components/FormField";
import { createSupplier } from "./actions";

const COST_TYPES = [
  { value: "despesas", label: "Despesas" },
  { value: "custo_direto", label: "Custo Direto" },
  { value: "custo_indireto", label: "Custo Indireto" },
];

export function NewSupplierButton({
  categories,
}: {
  categories: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [costType, setCostType] = useState("despesas");
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
          <TextField label="Razão social" name="legal_name" required />
          <TextField label="CPF ou CNPJ" name="tax_id" required />
          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">Tipo de custo</label>
            <select
              name="cost_type"
              value={costType}
              onChange={(e) => setCostType(e.target.value)}
              className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
            >
              {COST_TYPES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {costType === "despesas" && (
            <SelectField
              label="Categoria padrão"
              name="default_category_id"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}

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
