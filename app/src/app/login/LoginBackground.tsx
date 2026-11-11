"use client";

import { useEffect, useRef } from "react";

/**
 * Logo da PagSmile "desmontado" em partículas: ao carregar, os pontos se reúnem no
 * símbolo; o mouse afasta as partículas e elas voltam sozinhas ao lugar.
 * A imagem é amostrada pixel a pixel, então as cores (menta e branco) vêm do próprio logo.
 */

const LOGO_SRC = "/logos/pagsmile-logo-transparent.png";
// O símbolo ocupa os primeiros 101px (de 524x128) do arquivo; o resto é o texto "Pagsmile".
const MARK_W = 101;
const MARK_H = 128;

type Particle = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  r: number;
  g: number;
  b: number;
  size: number;
  delay: number;
  phase: number;
};

export function ParticleLogo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    let raf = 0;
    let cancelled = false;
    let particles: Particle[] = [];
    let w = 0;
    let h = 0;
    let dpr = 1;
    let start = 0;
    const mouse = { x: -9999, y: -9999 };
    const img = new Image();

    function build() {
      if (!wrap || !canvas || !ctx || !img.complete) return;
      const rect = wrap.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Tamanho do símbolo dentro da área disponível
      const targetH = Math.min(h * 0.92, w * 0.92 * (MARK_H / MARK_W));
      const scale = targetH / MARK_H;
      const drawW = MARK_W * scale;
      const drawH = MARK_H * scale;
      const ox = (w - drawW) / 2;
      const oy = (h - drawH) / 2;

      const off = document.createElement("canvas");
      off.width = Math.ceil(drawW);
      off.height = Math.ceil(drawH);
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;
      octx.drawImage(img, 0, 0, MARK_W, MARK_H, 0, 0, off.width, off.height);
      const data = octx.getImageData(0, 0, off.width, off.height).data;

      const step = Math.max(2, Math.round(targetH / 150));
      const list: Particle[] = [];
      for (let y = 0; y < off.height; y += step) {
        for (let x = 0; x < off.width; x += step) {
          const i = (y * off.width + x) * 4;
          const a = data[i + 3];
          if (a < 110) continue;
          // o PNG tem fundo navy opaco dentro do símbolo: só vira partícula o que é menta ou branco
          if (Math.max(data[i], data[i + 1], data[i + 2]) < 120) continue;
          // pequeno jitter para a textura "granulada" do efeito
          const tx = ox + x + (Math.random() - 0.5) * step * 0.9;
          const ty = oy + y + (Math.random() - 0.5) * step * 0.9;
          const ang = Math.random() * Math.PI * 2;
          const dist = Math.max(w, h) * (0.35 + Math.random() * 0.6);
          list.push({
            x: reduceMotion ? tx : w / 2 + Math.cos(ang) * dist,
            y: reduceMotion ? ty : h / 2 + Math.sin(ang) * dist,
            tx,
            ty,
            vx: 0,
            vy: 0,
            r: data[i],
            g: data[i + 1],
            b: data[i + 2],
            size: step * (0.55 + Math.random() * 0.5),
            delay: Math.random() * 0.9,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
      particles = list;
      start = performance.now();
    }

    function frame(now: number) {
      if (cancelled || !ctx) return;
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);

      const radius = 95;
      for (const p of particles) {
        if (!reduceMotion) {
          const k = t < p.delay ? 0 : Math.min(1, (t - p.delay) / 1.4);
          const pull = 0.012 + 0.07 * k * k;
          // leve respiração: o alvo oscila poucos pixels
          const bx = p.tx + Math.cos(t * 0.9 + p.phase) * 0.8;
          const by = p.ty + Math.sin(t * 0.8 + p.phase) * 0.8;
          p.vx += (bx - p.x) * pull;
          p.vy += (by - p.y) * pull;

          if (finePointer) {
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < radius * radius && d2 > 0.01) {
              const d = Math.sqrt(d2);
              const f = (1 - d / radius) * 5.5;
              p.vx += (dx / d) * f;
              p.vy += (dy / d) * f;
            }
          }
          p.vx *= 0.82;
          p.vy *= 0.82;
          p.x += p.vx;
          p.y += p.vy;
        }
        ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      raf = requestAnimationFrame(frame);
    }

    function onMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }
    function onLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 150);
    }

    img.onload = () => {
      if (cancelled) return;
      build();
      raf = requestAnimationFrame(frame);
    };
    img.src = LOGO_SRC;

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div ref={wrapRef} className="login-particles" aria-hidden="true">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}

/** Fundo da tela de login: gradiente navy, brilho central e grade de pontos discreta. */
export function LoginBackground() {
  return (
    <div className="login-bg" aria-hidden="true">
      <div className="login-bg-glow login-bg-glow--1" />
      <div className="login-bg-glow login-bg-glow--2" />
      <div className="login-bg-dots" />
      <div className="login-bg-vignette" />
    </div>
  );
}
