"use client";

import { useRef, useCallback } from "react";

export function AutoSubmitForm({
  children,
  className,
  dateBlurSubmit = true,
}: {
  children: React.ReactNode;
  className?: string;
  // false = campos de data não disparam o filtro sozinhos (precisa de um botão "Filtrar" no form) —
  // evita fechar o seletor de data ao trocar de foco entre "De" e "Até" antes de escolher as duas datas.
  dateBlurSubmit?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = useCallback(() => formRef.current?.requestSubmit(), []);

  return (
    <form
      ref={formRef}
      onChange={(e) => {
        const target = e.target as unknown as HTMLInputElement;
        if (target.type === "date" || target.type === "text") return;
        submit();
      }}
      onBlur={(e) => {
        const target = e.target as unknown as HTMLInputElement;
        if (dateBlurSubmit && target.type === "date") submit();
      }}
      className={className}
    >
      {children}
    </form>
  );
}
