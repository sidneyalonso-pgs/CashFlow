import { PageHeader } from "@/components/PageHeader";

export function ComingSoon({ title, phase, description }: { title: string; phase: string; description: string }) {
  return (
    <div>
      <PageHeader title={title} subtitle={description} />
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-8 text-center">
        <p className="text-sm font-mono uppercase tracking-wide text-ps-muted">{phase}</p>
        <p className="mt-2 text-ps-ink">Este módulo será construído na próxima fase, conforme o planejamento do projeto.</p>
      </div>
    </div>
  );
}
