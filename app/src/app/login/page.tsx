import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";
import { LoginBackground, ParticleLogo } from "./LoginBackground";

export default async function LoginPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialStep: "password" | "enroll" | "challenge" = "password";
  let initialEnroll: { factorId: string; qrCode: string; secret: string } | null = null;

  if (user) {
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const verified = factorsData?.totp?.find((f) => f.status === "verified");

    if (!verified) {
      const unverified = factorsData?.totp?.filter((f) => f.status !== "verified") ?? [];
      for (const f of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data: enrollData, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "PagSmile Treasury",
      });
      if (!error) {
        initialStep = "enroll";
        initialEnroll = { factorId: enrollData.id, qrCode: enrollData.totp.qr_code, secret: enrollData.totp.secret };
      }
    } else {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
        initialStep = "challenge";
      } else {
        redirect("/");
      }
    }
  }

  return (
    <div className="login-page">
      <LoginBackground />

      <header className="login-topbar">
        <img src="/logos/pagsmile-logo-transparent.png" alt="PagSmile" className="login-logo-in h-7" />
        <span className="login-topbar-tag">Treasury</span>
      </header>

      <main className="login-layout">
        <section className="login-hero">
          <ParticleLogo />
          <div className="login-hero-copy">
            <p className="login-hero-title">
              Caixa sob <span>controle</span>.
            </p>
            <p className="login-hero-sub">Gestão de caixa, pagamentos e conciliação da PagSmile</p>
          </div>
        </section>

        <section className="login-panel">
          <p className="login-eyebrow">
            <i /> Treasury
          </p>
          <h1 className="login-title">Entrar</h1>
          <p className="login-lead">Use suas credenciais para acessar o Treasury.</p>

          <LoginForm initialStep={initialStep} initialEnroll={initialEnroll} />

          <p className="login-foot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.500 7-10V6l-7-3Z" />
            </svg>
            Acesso restrito PagSmile
          </p>
        </section>
      </main>
    </div>
  );
}
