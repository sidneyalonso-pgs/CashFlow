"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Factor = { id: string; friendly_name: string | null; status: string };

export function Manage2FA() {
  const supabase = createClient();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadFactors() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp as Factor[]) ?? []);
  }

  useEffect(() => {
    loadFactors();
  }, []);

  async function handleEnroll() {
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrolling(true);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setLoading(false);

    if (error) {
      setError("Código inválido. Tente novamente.");
      return;
    }

    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setCode("");
    setSuccess("Autenticação em duas etapas ativada com sucesso.");
    loadFactors();
  }

  async function handleUnenroll(id: string) {
    if (!confirm("Desativar a autenticação em duas etapas?")) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setSuccess("Autenticação em duas etapas desativada.");
    loadFactors();
  }

  if (factors === null) return <p className="text-sm text-ps-muted">Carregando...</p>;

  const activeFactor = factors.find((f) => f.status === "verified");

  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-6 space-y-4 max-w-md">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-ps-green-700">{success}</p>}

      {activeFactor ? (
        <div className="space-y-3">
          <p className="text-sm text-ps-ink-2">
            Autenticação em duas etapas está <span className="font-medium text-ps-green-700">ativada</span> nesta conta.
          </p>
          <button
            onClick={() => handleUnenroll(activeFactor.id)}
            disabled={loading}
            className="text-sm text-red-600 hover:underline disabled:opacity-60"
          >
            Desativar
          </button>
        </div>
      ) : enrolling ? (
        <form onSubmit={handleVerify} className="space-y-4">
          <p className="text-sm text-ps-ink-2">
            Escaneie o QR code com seu aplicativo autenticador (Google Authenticator, Authy, etc.) e digite o código gerado.
          </p>
          {qrCode && (
            <div className="flex justify-center bg-white p-2 border border-ps-navy/10 rounded-ps-sm">
              <img src={qrCode} alt="QR code" className="w-40 h-40" />
            </div>
          )}
          {secret && (
            <p className="text-xs text-ps-muted text-center break-all">
              Não consegue escanear? Digite manualmente: <span className="font-mono">{secret}</span>
            </p>
          )}
          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">Código de verificação</label>
            <input
              type="text"
              inputMode="numeric"
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm tracking-widest"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEnrolling(false);
                setQrCode(null);
                setSecret(null);
              }}
              className="px-4 py-2 text-sm text-ps-muted hover:text-ps-ink"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-4 py-2 text-sm disabled:opacity-60"
            >
              {loading ? "Verificando..." : "Ativar"}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ps-ink-2">
            Adicione uma camada extra de segurança exigindo um código do seu celular além da senha.
          </p>
          <button
            onClick={handleEnroll}
            disabled={loading}
            className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors disabled:opacity-60"
          >
            {loading ? "Gerando..." : "Ativar autenticação em duas etapas"}
          </button>
        </div>
      )}
    </div>
  );
}
