"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { recordAttachment } from "../actions";

export function AttachmentUploader({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const path = `payments/${paymentId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from("attachments").upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const result = await recordAttachment({
      paymentId,
      storagePath: path,
      originalName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    });

    if (result.error) setError(result.error);

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div>
      <label className="inline-block bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 cursor-pointer hover:bg-ps-navy-700 transition-colors">
        {uploading ? "Enviando..." : "Anexar documento"}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.xml,.xlsx,.csv"
          className="hidden"
          disabled={uploading}
          onChange={handleFileChange}
        />
      </label>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
