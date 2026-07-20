"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInAction, verifyEnrollAction, verifyMfaAction } from "./actions";

type Step = "password" | "enroll" | "challenge";

export function LoginForm({
  initialStep,
  initialEnroll,
}: {
  initialStep: Step;
  initialEnroll?: { factorId: string; qrCode: string; secret: string } | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialStep);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [enrollData, setEnrollData] = useState(initialEnroll ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("email", email);
    formData.set("password", password);

    const result = await signInAction(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.step === "enroll") {
      setEnrollData({ factorId: result.factorId!, qrCode: result.qrCode!, secret: result.secret! });
      setStep("enroll");
      return;
    }
    if (result.step === "challenge") {
      setStep("challenge");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  async function handleEnrollSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollData) return;
    setLoading(true);
    setError(null);

    const result = await verifyEnrollAction(enrollData.factorId, code);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  async function handleChallengeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await verifyMfaAction(code);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  if (step === "enroll" && enrollData) {
    return (
      <form onSubmit={handleEnrollSubmit} className="space-y-4">
        <p className="text-sm text-ps-ink-2">
          Primeiro acesso: configure a autenticação em duas etapas. Escaneie o QR code com um aplicativo autenticador
          (Google Authenticator, Authy, etc.).
        </p>
        <div className="flex justify-center bg-white p-2 border border-ps-navy/10 rounded-ps-sm">
          <img src={enrollData.qrCode} alt="QR code" className="w-40 h-40" />
        </div>
        <p className="text-xs text-ps-muted text-center break-all">
          Não consegue escanear? Digite manualmente: <span className="font-mono">{enrollData.secret}</span>
        </p>
        <div>
          <label className="block text-sm text-ps-ink-2 mb-1">Código de verificação</label>
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-ps-green"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm py-2 text-sm hover:bg-ps-green-700 hover:text-white transition-colors disabled:opacity-60"
        >
          {loading ? "Confirmando..." : "Confirmar e entrar"}
        </button>
      </form>
    );
  }

  if (step === "challenge") {
    return (
      <form onSubmit={handleChallengeSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-ps-ink-2 mb-1">Código de autenticação</label>
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-ps-green"
          />
          <p className="text-xs text-ps-muted mt-1">Digite o código do seu aplicativo autenticador.</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm py-2 text-sm hover:bg-ps-green-700 hover:text-white transition-colors disabled:opacity-60"
        >
          {loading ? "Verificando..." : "Confirmar"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
  );
}
