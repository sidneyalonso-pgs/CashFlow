"use client";

import { useEffect, useState } from "react";
import LogoParticulas from "./LogoParticulas";
import "./login.css";

/** Palco visual da tela de login (fundo, partículas, marca e slogan). Não toca em autenticação. */
export function LoginStage({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`pc-login-root${mounted ? " pc-mounted" : ""}`}>
      <div className="pc-bg-base" aria-hidden="true" />
      <div className="pc-bg-glow" aria-hidden="true" />
      <LogoParticulas />
      <div className="pc-vinheta" aria-hidden="true" />
      <div className="pc-slogan-grande" aria-hidden="true">
        Caixa sob <em>controle</em>.<small>Gestão de caixa, pagamentos e conciliação da PagSmile</small>
      </div>
      <div className="pc-marca" aria-hidden="true">
        <img src="/logos/pagsmile-logo-transparent.png" alt="" />
        <span>Treasury</span>
      </div>

      <div className="pc-layout">
        <div className="pc-visual" aria-hidden="true" />
        <div className="pc-card-wrap">{children}</div>
      </div>
    </div>
  );
}
