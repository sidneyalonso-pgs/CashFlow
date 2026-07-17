"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { TextField, SelectField } from "@/components/FormField";
import { updateTemplate } from "./actions";

type Template = {
  id: string;
  company_id: string;
  supplier_id: string;
  description: string;
  day_of_month: number | null;
  week_of_month: number | null;
  category_id: string | null;
  cost_center_id: string | null;
  paying_bank_account_id: string | null;
};

export function EditTemplateButton({
  template,
  companies,
  suppliers,
  categories,
  costCenters,
  bankAccounts,
}: {
  template: Template;
  companies: Array<{ id: string; legal_name: string; trade_name: string | null }>;
  suppliers: Array<{ id: string; legal_name: string }>;
  categories: Array<{ id: string; name: string }>;
  costCenters: Array<{ id: string; code: string; name: string }>;
  bankAccounts: Array<{ id: string; bank_name: string; nickname: string | null }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"semana" | "dia">(template.week_of_month ? "semana" : "dia");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateTemplate(template.id, formData);
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

      <Modal open={open} onClose={() => setOpen(false)} title="Editar pagamento recorrente">
        <form action={handleSubmit} className="space-y-3">
          <SelectField
            label="Empresa"
            name="company_id"
            required
            defaultValue={template.company_id}
            options={companies.map((c) => ({ value: c.id, label: c.trade_name || c.legal_name }))}
          />
          <SelectField
            label="Fornecedor"
            name="supplier_id"
            required
            defaultValue={template.supplier_id}
            options={suppliers.map((s) => ({ value: s.id, label: s.legal_name }))}
          />
          <TextField label="Descrição" name="description" defaultValue={template.description} required />

          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">Agendar por</label>
            <div className="flex gap-2 p-1 bg-ps-bg-2 rounded-ps-sm w-fit">
              <button
                type="button"
                onClick={() => setScheduleMode("semana")}
                className={`px-3 py-1.5 rounded-ps-sm text-sm font-medium transition-colors ${
                  scheduleMode === "semana" ? "bg-white shadow-ps-sm text-ps-ink" : "text-ps-muted"
                }`}
              >
                Semana do mês
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode("dia")}
                className={`px-3 py-1.5 rounded-ps-sm text-sm font-medium transition-colors ${
                  scheduleMode === "dia" ? "bg-white shadow-ps-sm text-ps-ink" : "text-ps-muted"
                }`}
              >
                Dia fixo
              </button>
            </div>
          </div>

          <input type="hidden" name="schedule_mode" value={scheduleMode} />

          {scheduleMode === "semana" ? (
            <SelectField
              label="Semana do mês"
              name="week_of_month"
              required
              defaultValue={template.week_of_month ? String(template.week_of_month) : ""}
              options={[
                { value: "1", label: "Semana 1" },
                { value: "2", label: "Semana 2" },
                { value: "3", label: "Semana 3" },
                { value: "4", label: "Semana 4" },
                { value: "5", label: "Semana 5" },
              ]}
            />
          ) : (
            <TextField
              label="Dia do mês (1-28)"
              name="day_of_month"
              type="number"
              defaultValue={template.day_of_month ? String(template.day_of_month) : ""}
              required
            />
          )}

          <SelectField
            label="Categoria"
            name="category_id"
            defaultValue={template.category_id ?? ""}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectField
            label="Centro de custo"
            name="cost_center_id"
            defaultValue={template.cost_center_id ?? ""}
            options={costCenters.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
          />
          <SelectField
            label="Conta pagadora"
            name="paying_bank_account_id"
            defaultValue={template.paying_bank_account_id ?? ""}
            options={bankAccounts.map((a) => ({ value: a.id, label: a.nickname ?? a.bank_name }))}
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
