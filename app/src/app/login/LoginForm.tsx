"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInAction, verifyEnrollAction, verifyMfaAction } from "./actions";

type Step = "password" | "enroll" | "challenge";

const svg = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...svg}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...svg}>
      <rect x="5" y="10.5" width="14" height="9" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...svg}>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...svg}>
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconEyeOff() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...svg}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c7 0 10.5 7 10.5 7a13.3 13.3 0 0 1-3.1 4.1M6.6 6.6C3.7 8.4 1.5 12 1.5 12s3.5 7 10.5 7a10.6 10.6 0 0 0 4.4-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...svg}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...svg} strokeWidth={2.2} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Field({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="pc-field">
      <label className="pc-label" htmlFor={id}>
        {label}
      </label>
      <div className="pc-input-wrap pc-has-icon">
        <span className="pc-input-icon" aria-hidden="true">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div className="pc-err" role="alert">
      <span className="pc-err-icon" aria-hidden="true">
        <IconAlert />
      </span>
      {msg}
    </div>
  );
}

function LoginBtn({ loading, loadingLabel, children }: { loading: boolean; loadingLabel: string; children: React.ReactNode }) {
  return (
    <button type="submit" className="pc-btn" disabled={loading} aria-busy={loading}>
      {loading ? (
        <>
          <span className="pc-btn-spinner" aria-hidden="true" /> {loadingLabel}
        </>
      ) : (
        <>
          {children}
          <IconArrowRight />
        </>
      )}
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

  const cardClass = `pc-card${shake ? " pc-shake" : ""}`;

  return (
    <div className={cardClass}>
      <div className="pc-card-glow" aria-hidden="true" />
      <div className="pc-header">
        <span className="pc-eyebrow">
          <i aria-hidden="true" />
          Treasury
        </span>
      </div>

      {step === "enroll" && enrollData && (
        <form onSubmit={handleEnrollSubmit} className="pc-step" aria-label="Configurar autenticação em duas etapas">
          <h1 className="pc-title">Autenticação em 2 fatores</h1>
          <p className="pc-subtitle">Escaneie o QR code com Google Authenticator, Authy ou similar.</p>
          <div className="pc-qr-box">
            <div className="pc-qr-inner">
              <img src={enrollData.qrCode} alt="QR code para configurar autenticação em duas etapas" className="pc-qr-img" />
            </div>
          </div>
          <p className="pc-hint">
            Não consegue escanear? Digite manualmente: <code>{enrollData.secret}</code>
          </p>
          <Field id="mfa-enroll-code" label="Código de verificação" icon={<IconShield />}>
            <input
              id="mfa-enroll-code"
              className="pc-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
            />
          </Field>
          {error && <ErrBox msg={error} />}
          <LoginBtn loading={loading} loadingLabel="Confirmando...">
            Confirmar e entrar
          </LoginBtn>
        </form>
      )}

      {step === "challenge" && (
        <form onSubmit={handleChallengeSubmit} className="pc-step" aria-label="Verificação em duas etapas">
          <h1 className="pc-title">Verificação em 2 etapas</h1>
          <p className="pc-subtitle">Digite o código do seu app autenticador.</p>
          <Field id="mfa-code" label="Código de autenticação" icon={<IconShield />}>
            <input
              id="mfa-code"
              className="pc-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
            />
          </Field>
          {error && <ErrBox msg={error} />}
          <LoginBtn loading={loading} loadingLabel="Verificando...">
            Confirmar
          </LoginBtn>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={handlePasswordSubmit} className="pc-step" aria-label="Entrar">
          <h1 className="pc-title">Entrar</h1>
          <p className="pc-subtitle">Use suas credenciais para acessar o Treasury.</p>
          <Field id="email" label="E-mail" icon={<IconMail />}>
            <input
              id="email"
              className="pc-input"
              type="email"
              required
              autoComplete="email"
              placeholder="seu.nome@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field id="password" label="Senha" icon={<IconLock />}>
            <input
              id="password"
              className="pc-input pc-input-pass"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="pc-eye-btn"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
            >
              {showPassword ? <IconEyeOff /> : <IconEye />}
            </button>
          </Field>
          {error && <ErrBox msg={error} />}
          <LoginBtn loading={loading} loadingLabel="Entrando...">
            Entrar
          </LoginBtn>
        </form>
      )}

      <div className="pc-footer">
        <b>
          <IconShield /> Acesso restrito PagSmile
        </b>
      </div>
    </div>
  );
}
