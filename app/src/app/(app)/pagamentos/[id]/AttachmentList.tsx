"use client";

import { createClient } from "@/lib/supabase/client";

type Attachment = {
  id: string;
  storage_path: string;
  original_name: string;
  size_bytes: number | null;
  created_at: string;
};

export function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  async function handleDownload(storagePath: string, originalName: string) {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("attachments").createSignedUrl(storagePath, 60);
    if (error || !data) return;

    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = originalName;
    link.click();
  }

  if (attachments.length === 0) {
    return <p className="text-sm text-ps-muted">Nenhum anexo ainda.</p>;
  }

  return (
    <ul className="space-y-2">
      {attachments.map((a) => (
        <li key={a.id} className="flex items-center justify-between text-sm border border-ps-navy/10 rounded-ps-sm px-3 py-2">
          <span className="text-ps-ink truncate">{a.original_name}</span>
          <button
            onClick={() => handleDownload(a.storage_path, a.original_name)}
            className="text-ps-navy underline shrink-0 ml-2"
          >
            Baixar
          </button>
        </li>
      ))}
    </ul>
  );
}
