"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserRole, grantCompanyAccess, revokeCompanyAccess } from "./actions";

const ROLES = [
  { value: "administrador", label: "Administrador" },
  { value: "tesouraria", label: "Tesouraria" },
  { value: "aprovador", label: "Aprovador" },
  { value: "conciliacao", label: "Conciliação" },
  { value: "fpa", label: "FP&A" },
  { value: "visualizador", label: "Visualizador" },
];

export function UserRow({
  profile,
  companies,
  access,
}: {
  profile: { id: string; full_name: string; role: string };
  companies: Array<{ id: string; legal_name: string }>;
  access: Array<{ id: string; company_id: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedCompany, setSelectedCompany] = useState("");

  function handleRoleChange(role: string) {
    startTransition(async () => {
      await updateUserRole(profile.id, role);
      router.refresh();
    });
  }

  function handleGrant() {
    if (!selectedCompany) return;
    startTransition(async () => {
      await grantCompanyAccess(profile.id, selectedCompany);
      setSelectedCompany("");
      router.refresh();
    });
  }

  function handleRevoke(accessId: string) {
    startTransition(async () => {
      await revokeCompanyAccess(accessId);
      router.refresh();
    });
  }

  const accessibleIds = new Set(access.map((a) => a.company_id));
  const availableCompanies = companies.filter((c) => !accessibleIds.has(c.id));

  return (
    <tr className="border-t border-ps-navy/5 align-top">
      <td className="px-4 py-3 font-medium text-ps-ink">{profile.full_name}</td>
      <td className="px-4 py-3">
        <select
          defaultValue={profile.role}
          disabled={isPending}
          onChange={(e) => handleRoleChange(e.target.value)}
          className="rounded-ps-sm border border-ps-navy/15 px-2 py-1 text-sm bg-white"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1 mb-2">
          {access.map((a) => {
            const company = companies.find((c) => c.id === a.company_id);
            return (
              <span
                key={a.id}
                className="inline-flex items-center gap-1 bg-ps-bg-2 text-ps-ink text-xs px-2 py-1 rounded-full"
              >
                {company?.legal_name ?? a.company_id}
                <button onClick={() => handleRevoke(a.id)} className="text-ps-muted hover:text-red-600">
                  ✕
                </button>
              </span>
            );
          })}
        </div>
        {availableCompanies.length > 0 && (
          <div className="flex gap-2">
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="rounded-ps-sm border border-ps-navy/15 px-2 py-1 text-xs bg-white"
            >
              <option value="">Adicionar empresa...</option>
              {availableCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.legal_name}
                </option>
              ))}
            </select>
            <button onClick={handleGrant} disabled={isPending} className="text-xs text-ps-navy underline">
              Adicionar
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
