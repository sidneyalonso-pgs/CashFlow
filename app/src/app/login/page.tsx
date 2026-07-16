"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-ps-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-ps shadow-ps p-8">
        <img src="/logos/pagsmile-logo-navy.png" alt="PagSmile" className="h-8 mb-6" />
        <h1 className="text-xl font-bold text-ps-ink mb-1">PagSmile Treasury</h1>
        <p className="text-sm text-ps-muted mb-6">Gestão de caixa, pagamentos e conciliação</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ps-green"
            />
          </div>
          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ps-green"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm py-2 text-sm hover:bg-ps-green-700 hover:text-white transition-colors disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
