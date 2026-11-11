import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";
import { LoginStage } from "./LoginStage";

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
    <LoginStage>
      <LoginForm initialStep={initialStep} initialEnroll={initialEnroll} />
    </LoginStage>
  );
}
