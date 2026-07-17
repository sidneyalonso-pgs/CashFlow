"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { TextField, SelectField } from "@/components/FormField";
import { updateCostCenter } from "./actions";

type CostCenter = {
  id: string;
  code: string;
  name: string;
  company_id: string | null;
  responsible_area: string | null;
  manager_name: string | null;
  status: string;
};

export function EditCostCenterButton({
  costCenter,
  companies,
}: {
  costCenter: CostCenter;
  companies: Array<{ id: string; legal_name: string; trade_name: string | null }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateCostCenter(costCenter.id, formData);
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

      <Modal open={open} onClose={() => setOpen(false)} title="Editar centro de custo">
        <form action={handleSubmit} className="space-y-3">
          <SelectField
            label="Empresa (deixe em branco para o grupo todo)"
            name="company_id"
            defaultValue={costCenter.company_id ?? ""}
            options={companies.map((c) => ({ value: c.id, label: c.trade_name || c.legal_name }))}
          />
          <TextField label="Código" name="code" defaultValue={costCenter.code} required />
          <TextField label="Nome" name="name" defaultValue={costCenter.name} required />
          <TextField label="Área responsável" name="responsible_area" defaultValue={costCenter.responsible_area ?? ""} />
          <TextField label="Gestor" name="manager_name" defaultValue={costCenter.manager_name ?? ""} />
          <SelectField
            label="Status"
            name="status"
            defaultValue={costCenter.status}
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
