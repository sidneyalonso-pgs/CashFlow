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
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await inviteUser(formData);
      if (result.error) {
        setError(result.error);
        setTempPassword(null);
      } else {
        setError(null);
        setTempPassword(result.tempPassword);
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
          setTempPassword(null);
        }}
        className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors"
      >
        Criar usuário
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Criar novo usuário">
        {tempPassword ? (
          <div className="space-y-3">
            <p className="text-sm text-ps-ink-2">
              Usuário criado! Passe estes dados para a pessoa acessar — ela deve trocar a senha em{" "}
              <span className="font-medium">Configurações → Minha senha</span> no primeiro acesso.
            </p>
            <div className="bg-ps-bg-2 rounded-ps-sm p-3 space-y-1">
              <p className="text-xs text-ps-muted">Senha temporária</p>
              <p className="font-mono text-lg text-ps-ink select-all">{tempPassword}</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-4 py-2 text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-3">
            <TextField label="Nome completo" name="full_name" required />
            <TextField label="E-mail" name="email" type="email" required />

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
                {isPending ? "Criando..." : "Criar usuário"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
