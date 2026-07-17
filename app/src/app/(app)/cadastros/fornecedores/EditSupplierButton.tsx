"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { TextField, SelectField } from "@/components/FormField";
import { updateSupplier, deleteSupplier } from "./actions";

const COST_TYPES = [
  { value: "despesas", label: "Despesas" },
  { value: "custo_direto", label: "Custo Direto" },
  { value: "custo_indireto", label: "Custo Indireto" },
];

type Supplier = {
  id: string;
  legal_name: string;
  cost_type: string;
  default_category_id: string | null;
  default_cost_center_id: string | null;
  default_description: string | null;
  status: string;
};

export function EditSupplierButton({
  supplier,
  categories,
  costCenters,
}: {
  supplier: Supplier;
  categories: Array<{ id: string; name: string }>;
  costCenters: Array<{ id: string; code: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [costType, setCostType] = useState(supplier.cost_type);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateSupplier(supplier.id, formData);
      if (result.error) setError(result.error);
      else {
        setError(null);
        setOpen(false);
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Excluir o fornecedor "${supplier.legal_name}"? Essa ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const result = await deleteSupplier(supplier.id);
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

      <Modal open={open} onClose={() => setOpen(false)} title="Editar fornecedor">
        <form action={handleSubmit} className="space-y-3">
          <TextField label="Razão social" name="legal_name" defaultValue={supplier.legal_name} required />
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
          <SelectField
            label="Categoria padrão"
            name="default_category_id"
            defaultValue={supplier.default_category_id ?? ""}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectField
            label="Departamento (centro de custo)"
            name="default_cost_center_id"
            defaultValue={supplier.default_cost_center_id ?? ""}
            options={costCenters.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
          />
          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">
              Descrição padrão <span className="text-xs text-ps-muted">(serviço prestado — preenche o pagamento automaticamente)</span>
            </label>
            <input
              name="default_description"
              defaultValue={supplier.default_description ?? ""}
              placeholder="Ex: Consultoria de TI, aluguel de escritório..."
              className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
            />
          </div>
          <SelectField
            label="Status"
            name="status"
            defaultValue={supplier.status}
            options={[
              { value: "ativo", label: "Ativo" },
              { value: "inativo", label: "Inativo" },
            ]}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-between items-center pt-2">
            <button type="button" onClick={handleDelete} disabled={isPending} className="text-sm text-red-600 hover:underline">
              Excluir fornecedor
            </button>
            <div className="flex gap-2">
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
          </div>
        </form>
      </Modal>
    </>
  );
}
