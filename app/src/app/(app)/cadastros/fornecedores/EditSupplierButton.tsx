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
  cost_structure: string | null;
  default_category_id: string | null;
  default_cost_center_id: string | null;
  default_description: string | null;
  status: string;
  is_recurring: boolean | null;
};

export function EditSupplierButton({
  supplier,
  categories,
  costCenters,
  companies,
}: {
  supplier: Supplier;
  categories: Array<{ id: string; name: string }>;
  costCenters: Array<{ id: string; code: string; name: string }>;
  companies: Array<{ id: string; legal_name: string; trade_name: string | null }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [costType, setCostType] = useState(supplier.cost_type);
  const [isRecurring, setIsRecurring] = useState(supplier.is_recurring ?? false);
  const [hasDescription, setHasDescription] = useState(!!supplier.default_description);
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
              className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ps-green focus:border-ps-green"
            >
              {COST_TYPES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <SelectField
            label="Custo fixo ou variável"
            name="cost_structure"
            defaultValue={supplier.cost_structure ?? ""}
            options={[
              { value: "", label: "Não definido" },
              { value: "fixo", label: "Fixo" },
              { value: "variavel", label: "Variável" },
            ]}
          />

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
              Descrição padrão <span className="text-xs text-ps-muted">(preenche o pagamento automaticamente)</span>
            </label>
            <input
              name="default_description"
              defaultValue={supplier.default_description ?? ""}
              onChange={(e) => setHasDescription(!!e.target.value)}
              placeholder="Ex: Consultoria de TI, aluguel..."
              className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ps-green focus:border-ps-green"
            />
            {hasDescription && (
              <label className="flex items-center gap-2 mt-2 text-xs text-ps-muted cursor-pointer">
                <input type="checkbox" name="propagate_description" className="rounded accent-ps-green" />
                Atualizar descrição dos pagamentos futuros já lançados para este fornecedor
              </label>
            )}
          </div>

          <div className="rounded-ps-sm border border-ps-navy/10 bg-ps-bg-2/50 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-ps-ink cursor-pointer">
              <input
                type="checkbox"
                name="is_recurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded accent-ps-green"
              />
              Despesa recorrente mensal
            </label>
            <p className="text-xs text-ps-muted mt-1 pl-5">
              Ao lançar pagamentos com este fornecedor e marcar "Recorrente", eles aparecem na aba Pagamentos Recorrentes.
            </p>
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
