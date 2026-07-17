"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { TextField, SelectField } from "@/components/FormField";
import { updateSupplier } from "./actions";

type Supplier = {
  id: string;
  legal_name: string;
  trade_name: string | null;
  tax_id: string;
  person_type: string;
  pix_key: string | null;
  email: string | null;
  phone: string | null;
  default_category_id: string | null;
  default_cost_center_id: string | null;
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

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs text-ps-navy underline">
        Editar
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Editar fornecedor">
        <form action={handleSubmit} className="space-y-3">
          <TextField label="Razão social ou nome" name="legal_name" defaultValue={supplier.legal_name} required />
          <TextField label="Nome fantasia" name="trade_name" defaultValue={supplier.trade_name ?? ""} />
          <TextField label="CPF ou CNPJ" name="tax_id" defaultValue={supplier.tax_id} required />
          <SelectField
            label="Tipo de pessoa"
            name="person_type"
            required
            defaultValue={supplier.person_type}
            options={[
              { value: "fisica", label: "Física" },
              { value: "juridica", label: "Jurídica" },
            ]}
          />
          <TextField label="Chave Pix" name="pix_key" defaultValue={supplier.pix_key ?? ""} />
          <TextField label="E-mail" name="email" type="email" defaultValue={supplier.email ?? ""} />
          <TextField label="Telefone" name="phone" defaultValue={supplier.phone ?? ""} />
          <SelectField
            label="Categoria padrão"
            name="default_category_id"
            defaultValue={supplier.default_category_id ?? ""}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectField
            label="Centro de custo padrão"
            name="default_cost_center_id"
            defaultValue={supplier.default_cost_center_id ?? ""}
            options={costCenters.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
          />
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
