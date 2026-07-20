"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <div>
      <PageHeader title="Minha senha" subtitle="Altere a senha da sua conta" />

      <form onSubmit={handleSubmit} className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-6 space-y-4 max-w-sm">
        <div>
          <label className="block text-sm text-ps-ink-2 mb-1">Nova senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-ps-ink-2 mb-1">Confirmar nova senha</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-ps-green-700">Senha alterada com sucesso.</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-5 py-2 text-sm disabled:opacity-60"
        >
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </div>
  );
}
