"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { TextField, SelectField } from "@/components/FormField";
import { updatePayment } from "../actions";

type Payment = {
  id: string;
  description: string;
  gross_amount: number | null;
  category_id: string | null;
  cost_center_id: string | null;
  notes: string | null;
  status: string;
  due_date: string | null;
};

export function EditPaymentButton({
  payment,
  categories,
  costCenters,
}: {
  payment: Payment;
  categories: Array<{ id: string; name: string }>;
  costCenters: Array<{ id: string; code: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updatePayment(payment.id, formData);
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

      <Modal open={open} onClose={() => setOpen(false)} title="Editar pagamento">
        <form action={handleSubmit} className="space-y-3">
          <TextField
            label="Descrição (serviço prestado — se deixar em branco, usa o nome do fornecedor)"
            name="description"
            defaultValue={payment.description}
          />
          <TextField
            label="Valor"
            name="gross_amount"
            type="number"
            step="0.01"
            defaultValue={payment.gross_amount ? String(payment.gross_amount) : ""}
            required
          />
          <SelectField
            label="Categoria"
            name="category_id"
            defaultValue={payment.category_id ?? ""}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectField
            label="Centro de custo"
            name="cost_center_id"
            defaultValue={payment.cost_center_id ?? ""}
            options={costCenters.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
          />
          <TextField
            label="Data de vencimento"
            name="due_date"
            type="date"
            defaultValue={payment.due_date ?? ""}
          />
          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">Observações</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={payment.notes ?? ""}
              className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
            />
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
