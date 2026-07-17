"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { TextField, SelectField } from "@/components/FormField";
import { updateProject } from "./actions";

type Project = {
  id: string;
  code: string;
  name: string;
  company_id: string;
  cost_center_id: string | null;
  responsible_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
};

export function EditProjectButton({
  project,
  companies,
  costCenters,
}: {
  project: Project;
  companies: Array<{ id: string; legal_name: string; trade_name: string | null }>;
  costCenters: Array<{ id: string; code: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateProject(project.id, formData);
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

      <Modal open={open} onClose={() => setOpen(false)} title="Editar projeto">
        <form action={handleSubmit} className="space-y-3">
          <SelectField
            label="Empresa"
            name="company_id"
            required
            defaultValue={project.company_id}
            options={companies.map((c) => ({ value: c.id, label: c.trade_name || c.legal_name }))}
          />
          <TextField label="Código" name="code" defaultValue={project.code} required />
          <TextField label="Nome" name="name" defaultValue={project.name} required />
          <SelectField
            label="Centro de custo"
            name="cost_center_id"
            defaultValue={project.cost_center_id ?? ""}
            options={costCenters.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
          />
          <TextField label="Responsável" name="responsible_name" defaultValue={project.responsible_name ?? ""} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Data inicial" name="start_date" type="date" defaultValue={project.start_date ?? ""} />
            <TextField label="Data final" name="end_date" type="date" defaultValue={project.end_date ?? ""} />
          </div>
          <SelectField
            label="Status"
            name="status"
            defaultValue={project.status}
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
