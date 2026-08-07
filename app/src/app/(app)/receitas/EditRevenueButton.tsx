"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { TextField, SelectField } from "@/components/FormField";
import { updateRevenue } from "./actions";

type Revenue = {
  id: string;
  description: string;
  category_id: string | null;
  expected_amount: number;
  realized_amount: number | null;
  expected_date: string;
  realized_date: string | null;
  notes: string | null;
  status: string;
};

export function EditRevenueButton({
  revenue,
  categories,
}: {
  revenue: Revenue;
  categories: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentAmount = revenue.status === "recebida" ? revenue.realized_amount ?? revenue.expected_amount : revenue.expected_amount;
  const currentDate = revenue.status === "recebida" ? revenue.realized_date ?? revenue.expected_date : revenue.expected_date;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateRevenue(revenue.id, formData);
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

      <Modal open={open} onClose={() => setOpen(false)} title="Editar receita">
        <form action={handleSubmit} className="space-y-3">
          <TextField label="Descrição" name="description" defaultValue={revenue.description} required />
          <SelectField
            label="Categoria"
            name="category_id"
            defaultValue={revenue.category_id ?? ""}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Valor" name="amount" type="number" step="0.01" defaultValue={String(currentAmount)} required />
            <TextField
              label={revenue.status === "recebida" ? "Data do recebimento" : "Data prevista"}
              name="date"
              type="date"
              defaultValue={currentDate}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">Observações</label>
            <textarea name="notes" rows={2} defaultValue={revenue.notes ?? ""} className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm" />
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
