import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";
import { LoginBackground } from "./LoginBackground";

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
    <div className="login-page px-4 py-10">
      <LoginBackground />

      <div className="relative w-full max-w-[420px] bg-white/95 backdrop-blur-sm rounded-ps-lg shadow-ps border border-white/60 p-8 sm:p-10">
        <img
          src="/logos/pagsmile-logo-navy.png"
          alt="PagSmile"
          className="login-logo-in h-8 mb-7"
        />
        <h1 className="text-2xl font-bold text-ps-ink mb-1 tracking-tight">Treasury</h1>
        <p className="text-sm text-ps-muted mb-7">Gestão de caixa, pagamentos e conciliação</p>

        <LoginForm initialStep={initialStep} initialEnroll={initialEnroll} />
      </div>
    </div>
  );
}
