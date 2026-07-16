"use client";

import { useState, useTransition } from "react";
import { createCompany } from "./actions";

export function NewCompanyButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createCompany(formData);
      if (result.error) {
        setError(result.error);
      } else {
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
        Nova empresa
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-ps shadow-ps-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-ps-ink mb-4">Nova empresa</h2>
            <form action={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-ps-ink-2 mb-1">Razão social</label>
                <input
                  name="legal_name"
                  required
                  className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-ps-ink-2 mb-1">Nome fantasia</label>
                <input
                  name="trade_name"
                  className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-ps-ink-2 mb-1">CNPJ</label>
                <input
                  name="cnpj"
                  required
                  placeholder="00.000.000/0000-00"
                  className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
                />
              </div>

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
          </div>
        </div>
      )}
    </>
  );
}
