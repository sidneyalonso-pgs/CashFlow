"use client";

import { useRef, useCallback } from "react";

export function AutoSubmitForm({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = useCallback(() => formRef.current?.requestSubmit(), []);

  return (
    <form
      ref={formRef}
      onChange={(e) => {
        const target = e.target as HTMLInputElement;
        if (target.type === "date" || target.type === "text") return;
        submit();
      }}
      onBlur={(e) => {
        const target = e.target as HTMLInputElement;
        if (target.type === "date") submit();
      }}
      className={className}
    >
      {children}
    </form>
  );
}
