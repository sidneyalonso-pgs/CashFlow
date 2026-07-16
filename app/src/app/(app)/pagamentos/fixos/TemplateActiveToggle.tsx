"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleTemplateActive } from "./actions";

export function TemplateActiveToggle({ templateId, active }: { templateId: string; active: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleTemplateActive(templateId, !active);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`text-xs font-medium px-3 py-1 rounded-full ${
        active ? "bg-ps-green-200 text-ps-green-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {active ? "Ativo" : "Pausado"}
    </button>
  );
}
