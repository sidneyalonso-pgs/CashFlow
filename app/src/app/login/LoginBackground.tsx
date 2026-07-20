"use client";

import { useEffect, useRef } from "react";

const ICONS = [
  // wallet
  "M3 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm2 0v11h14v-7h-4a2 2 0 0 1 0-4h2V7H5Zm11 5.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
  // swap / transfer
  "M7 4v11M7 15 3.5 11.5M7 15l3.5-3.5M17 20V9M17 9l3.5 3.5M17 9l-3.5 3.5",
  // banknote
  "M2 6h20v12H2V6Zm10 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM5 9v0M19 15v0",
  // coin stack
  "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-7 9c0 1.5 3 3 7 3s7-1.5 7-3M5 12v4c0 1.5 3 3 7 3s7-1.5 7-3v-4",
  // card / payment
  "M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm-1 5h20M6 15h4",
  // document / statement
  "M7 3h7l4 4v14H7V3Zm7 0v4h4M9 12h6M9 15h6M9 9h2",
  // arrow up-down movement
  "M12 3v14M12 3l4 4M12 3 8 7M12 21V7M12 21l4-4M12 21l-4-4",
];

function IconRow({ reverse, seed }: { reverse?: boolean; seed: number }) {
  const items = Array.from({ length: 14 }, (_, i) => ICONS[(i + seed) % ICONS.length]);
  const doubled = [...items, ...items];

  return (
    <div className={`login-bg-row ${reverse ? "login-bg-row--reverse" : ""}`}>
      {doubled.map((d, i) => (
        <svg key={i} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d={d} />
        </svg>
      ))}
    </div>
  );
}

export function LoginBackground() {
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mql = window.matchMedia("(pointer: fine)");
    if (!mql.matches) return;

    function handleMove(e: MouseEvent) {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      bgRef.current?.style.setProperty("--mx", x.toFixed(3));
      bgRef.current?.style.setProperty("--my", y.toFixed(3));
    }

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div ref={bgRef} className="login-bg" aria-hidden="true">
      <div className="login-bg-glow login-bg-glow--1" />
      <div className="login-bg-glow login-bg-glow--2" />
      <div className="login-bg-icons">
        <IconRow seed={0} />
        <IconRow seed={2} reverse />
        <IconRow seed={4} />
        <IconRow seed={1} reverse />
        <IconRow seed={5} />
      </div>
      <div className="login-bg-vignette" />
    </div>
  );
}
