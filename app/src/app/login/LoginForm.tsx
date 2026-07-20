"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInAction, verifyEnrollAction, verifyMfaAction } from "./actions";

type Step = "password" | "enroll" | "challenge";

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="login-spinner w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function FieldShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="login-input flex items-center gap-2.5 rounded-ps-sm border border-ps-navy/10 bg-ps-navy-50/60 px-3.5 h-[50px]">
      {children}
    </div>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="login-button w-full flex items-center justify-center gap-2 text-white font-semibold rounded-ps-sm h-[50px] text-sm"
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

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
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [enrollData, setEnrollData] = useState(initialEnroll ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  function flashError(message: string) {
    setError(message);
    setShake(true);
  }

  useEffect(() => {
    if (!shake) return;
    const t = setTimeout(() => setShake(false), 400);
    return () => clearTimeout(t);
  }, [shake]);

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
      flashError(result.error);
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
      flashError(result.error);
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
      flashError(result.error);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  const cardClass = `login-card${shake ? " login-card--shake" : ""}`;

  if (step === "enroll" && enrollData) {
    return (
      <div className={cardClass}>
        <form onSubmit={handleEnrollSubmit} className="space-y-4" aria-label="Configurar autenticação em duas etapas">
          <p className="text-sm text-ps-ink-2">
            Primeiro acesso: configure a autenticação em duas etapas. Escaneie o QR code com um aplicativo autenticador
            (Google Authenticator, Authy, etc.).
          </p>
          <div className="flex justify-center bg-white p-3 border border-ps-navy/10 rounded-ps-sm">
            <img src={enrollData.qrCode} alt="QR code para configurar autenticação em duas etapas" className="w-40 h-40" />
          </div>
          <p className="text-xs text-ps-muted text-center break-all">
            Não consegue escanear? Digite manualmente: <span className="font-mono">{enrollData.secret}</span>
          </p>
          <div>
            <label htmlFor="mfa-enroll-code" className="block text-sm text-ps-ink-2 mb-1.5">
              Código de verificação
            </label>
            <FieldShell>
              <input
                id="mfa-enroll-code"
                type="text"
                inputMode="numeric"
                autoFocus
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                className="w-full bg-transparent text-sm tracking-[0.3em] outline-none placeholder:tracking-normal placeholder:text-ps-muted-2"
              />
            </FieldShell>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <SubmitButton loading={loading}>{loading ? "Confirmando..." : "Confirmar e entrar"}</SubmitButton>
        </form>
      </div>
    );
  }

  if (step === "challenge") {
    return (
      <div className={cardClass}>
        <form onSubmit={handleChallengeSubmit} className="space-y-4" aria-label="Verificação em duas etapas">
          <div>
            <label htmlFor="mfa-code" className="block text-sm text-ps-ink-2 mb-1.5">
              Código de autenticação
            </label>
            <FieldShell>
              <input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                autoFocus
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                className="w-full bg-transparent text-sm tracking-[0.3em] outline-none placeholder:tracking-normal placeholder:text-ps-muted-2"
              />
            </FieldShell>
            <p className="text-xs text-ps-muted mt-1.5">Digite o código do seu aplicativo autenticador.</p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <SubmitButton loading={loading}>{loading ? "Verificando..." : "Confirmar"}</SubmitButton>
        </form>
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <form onSubmit={handlePasswordSubmit} className="space-y-4" aria-label="Entrar">
        <div>
          <label htmlFor="email" className="block text-sm text-ps-ink-2 mb-1.5">
            E-mail
          </label>
          <FieldShell>
            <span className="text-ps-muted-2" aria-hidden="true">
              <MailIcon />
            </span>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            />
          </FieldShell>
        </div>
        <div>
          <label htmlFor="password" className="block text-sm text-ps-ink-2 mb-1.5">
            Senha
          </label>
          <FieldShell>
            <span className="text-ps-muted-2" aria-hidden="true">
              <LockIcon />
            </span>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="text-ps-muted-2 hover:text-ps-ink-2 transition-colors shrink-0"
            >
              <EyeIcon off={showPassword} />
            </button>
          </FieldShell>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <SubmitButton loading={loading}>{loading ? "Entrando..." : "Entrar"}</SubmitButton>
      </form>
    </div>
  );
}
