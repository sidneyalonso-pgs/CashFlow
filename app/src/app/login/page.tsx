import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

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
    <div className="min-h-screen bg-ps-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-ps shadow-ps p-8">
        <img src="/logos/pagsmile-logo-navy.png" alt="PagSmile" className="h-8 mb-6" />
        <h1 className="text-xl font-bold text-ps-ink mb-1">PagSmile Treasury</h1>
        <p className="text-sm text-ps-muted mb-6">Gestão de caixa, pagamentos e conciliação</p>

        <LoginForm initialStep={initialStep} initialEnroll={initialEnroll} />
      </div>
    </div>
  );
}
