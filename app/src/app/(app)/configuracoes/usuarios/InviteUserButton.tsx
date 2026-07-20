"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { TextField } from "@/components/FormField";
import { inviteUser } from "./actions";

export function InviteUserButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await inviteUser(formData);
      if (result.error) {
        setError(result.error);
        setSuccess(null);
      } else {
        setError(null);
        setSuccess("Convite enviado! A pessoa vai receber um e-mail para criar a senha.");
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setError(null);
          setSuccess(null);
        }}
        className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors"
      >
        Criar usuário
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Convidar novo usuário">
        <form action={handleSubmit} className="space-y-3">
          <TextField label="Nome completo" name="full_name" required />
          <TextField label="E-mail" name="email" type="email" required />

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-ps-green-700">{success}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-ps-muted hover:text-ps-ink">
              Fechar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-4 py-2 text-sm disabled:opacity-60"
            >
              {isPending ? "Enviando..." : "Enviar convite"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
