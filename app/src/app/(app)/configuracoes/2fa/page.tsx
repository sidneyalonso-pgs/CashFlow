import { PageHeader } from "@/components/PageHeader";
import { Manage2FA } from "./Manage2FA";

export default function TwoFactorPage() {
  return (
    <div>
      <PageHeader title="Autenticação em duas etapas" subtitle="Proteja sua conta com um segundo fator" />
      <Manage2FA />
    </div>
  );
}
