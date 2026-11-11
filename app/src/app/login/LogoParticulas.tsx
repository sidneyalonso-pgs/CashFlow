// @ts-nocheck -- porte fiel do LogoParticulas.js do PriceCore (JS sem tipos)
"use client";

import { useEffect, useRef } from "react";

// Fundo do login: milhares de particulas que voam de uma nuvem e se MONTAM no icone da
// Pagsmile (extraido de /logos/pagsmile-logo-transparent.png, com as cores originais). Depois de montado,
// o icone respira, inclina com o mouse e as particulas fogem do cursor e voltam.
// So visual: nao toca em autenticacao. Respeita prefers-reduced-motion (quadro estatico)
// e pausa com a aba oculta.
const LOGO_URL = "/logos/pagsmile-logo-transparent.png";

// Recorta o icone (primeiro bloco de colunas com pixels) e devolve pontos amostrados.
function amostrarIcone(img, alvoPontos) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const { data, width, height } = x.getImageData(0, 0, c.width, c.height);
  const opaco = (ix, iy) => data[(iy * width + ix) * 4 + 3] > 110;
  // largura do icone: do primeiro pixel ate a primeira lacuna de 4+ colunas vazias
  const colunaTem = (ix) => { for (let iy = 0; iy < height; iy++) if (opaco(ix, iy)) return true; return false; };
  let ini = 0; while (ini < width && !colunaTem(ini)) ini++;
  let fim = ini, vazias = 0;
  for (let ix = ini; ix < width; ix++) {
    if (colunaTem(ix)) { fim = ix; vazias = 0; } else if (++vazias >= 4) break;
  }
  let topo = height, base = 0;
  for (let iy = 0; iy < height; iy++) for (let ix = ini; ix <= fim; ix++) if (opaco(ix, iy)) { if (iy < topo) topo = iy; if (iy > base) base = iy; }
  const larg = fim - ini + 1, alt = base - topo + 1;
  let area = 0;
  for (let iy = topo; iy <= base; iy++) for (let ix = ini; ix <= fim; ix++) if (opaco(ix, iy)) area++;
  const passo = Math.max(0.9, Math.sqrt(area / alvoPontos));
  const pts = [];
  for (let fy = topo; fy <= base; fy += passo) {
    for (let fx = ini; fx <= fim; fx += passo) {
      const ix = Math.round(fx + (Math.random() - 0.5) * passo * 0.8);
      const iy = Math.round(fy + (Math.random() - 0.5) * passo * 0.8);
      if (ix < ini || ix > fim || iy < topo || iy > base || !opaco(ix, iy)) continue;
      const k = (iy * width + ix) * 4;
      pts.push({
        // normalizado: altura do icone = [-1, 1]
        tx: ((ix - ini) / alt - larg / alt / 2) * 2,
        ty: ((iy - topo) / alt - 0.5) * 2,
        r: data[k], g: data[k + 1], b: data[k + 2],
      });
    }
  }
  return { pts, passo, alt };
}

export default function LogoParticulas() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    let vivo = true;
    let reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { /* sem matchMedia */ }

    let w = 0, h = 0, dpr = 1, escala = 0, cx = 0, cy = 0, desktop = true;
    let P = []; let poeira = []; let info = null;
    const mouse = { x: -9999, y: -9999, nx: 0, ny: 0 };
    const tilt = { x: 0, y: 0 };
    // cursor luminoso: posicao suavizada (segue com atraso) e intensidade (acende/apaga)
    const luz = { x: -9999, y: -9999, i: 0 };
    let raf = null; let t0 = performance.now();

    const medir = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      desktop = w >= 1024;
      // escala: metade da altura do icone em pixels
      escala = desktop ? Math.min(h * 0.27, w * 0.17) : Math.min(w * 0.2, h * 0.11);
      cx = desktop ? w * 0.29 : w * 0.5;
      cy = desktop ? h * 0.43 : h * 0.13;
    };

    const montar = (res) => {
      info = res;
      P = res.pts.map((p) => {
        // ponto de partida: casca esferica grande, em espiral
        const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, rr = Math.sqrt(1 - u * u);
        const R = 2.2 + Math.random() * 1.6;
        return {
          ...p, tz: (Math.random() - 0.5) * 0.16,
          sx: Math.cos(a) * rr * R, sy: u * R, sz: Math.sin(a) * rr * R,
          atraso: Math.random() * 1.1, dur: 1.5 + Math.random() * 0.9,
          f: Math.random() * Math.PI * 2, k: 0.6 + Math.random() * 1.2,
          dx: 0, dy: 0,
        };
      });
      poeira = Array.from({ length: desktop ? 160 : 70 }, () => ({
        x: Math.random(), y: Math.random(), v: 0.02 + Math.random() * 0.05, s: 0.6 + Math.random() * 1.1, f: Math.random() * 6.28,
      }));
    };

    const quadro = (agora, estatico) => {
      const t = estatico ? 99 : (agora - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      if (!info) return;
      // inclinacao: mouse + leve balanco automatico
      tilt.x += (mouse.nx * 0.45 + Math.sin(t * 0.45) * 0.18 - tilt.x) * 0.05;
      tilt.y += (mouse.ny * 0.25 - tilt.y) * 0.05;
      const cyw = Math.cos(tilt.x), syw = Math.sin(tilt.x), cp = Math.cos(tilt.y), sp = Math.sin(tilt.y);
      const respira = 1 + Math.sin(t * 0.9) * 0.012;
      const tamBase = Math.max(1.3, (escala / (info.alt / 2)) * info.passo * 0.8);
      const raioMouse = escala * 0.5;
      const dentro = !estatico && mouse.x > -1000;
      if (dentro) { if (luz.x < -1000) { luz.x = mouse.x; luz.y = mouse.y; } luz.x += (mouse.x - luz.x) * 0.14; luz.y += (mouse.y - luz.y) * 0.14; }
      luz.i += ((dentro ? 1 : 0) - luz.i) * 0.08;
      const raioLuz = Math.max(140, escala * 1.1);
      if (luz.i > 0.01) {
        // halo suave atras das particulas
        const gl = ctx.createRadialGradient(luz.x, luz.y, 0, luz.x, luz.y, raioLuz * 1.6);
        gl.addColorStop(0, `rgba(80,240,200,${(0.20 * luz.i).toFixed(3)})`);
        gl.addColorStop(0.45, `rgba(43,193,150,${(0.08 * luz.i).toFixed(3)})`);
        gl.addColorStop(1, "rgba(43,193,150,0)");
        ctx.fillStyle = gl; ctx.fillRect(0, 0, w, h);
      }

      // poeira de fundo (pontos distantes, bem discretos)
      ctx.fillStyle = "rgba(120,230,200,0.35)";
      for (const d of poeira) {
        const py = ((d.y - t * d.v * 0.2) % 1 + 1) % 1;
        ctx.globalAlpha = 0.12 + 0.2 * (0.5 + 0.5 * Math.sin(t + d.f));
        ctx.fillRect(d.x * w, py * h, d.s, d.s);
      }
      ctx.globalAlpha = 1;

      for (let i = 0; i < P.length; i++) {
        const p = P[i];
        const pr = Math.min(1, Math.max(0, (t - p.atraso) / p.dur));
        const e = 1 - Math.pow(1 - pr, 3);                  // ease-out
        const giro = (1 - e) * 2.4;                          // espiral enquanto voa
        const cg = Math.cos(giro), sg = Math.sin(giro);
        const sx = p.sx * cg + p.sz * sg, sz = -p.sx * sg + p.sz * cg;
        const ruido = pr >= 1 ? 0.006 * Math.sin(t * p.k + p.f) : 0;
        let x = sx + (p.tx - sx) * e + ruido;
        let y = p.sy + (p.ty - p.sy) * e + ruido * 0.8;
        let z = sz + (p.tz - sz) * e + (pr >= 1 ? 0.03 * Math.sin(t * p.k * 0.7 + p.f) : 0);
        const x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw;
        const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
        const persp = 1 / (1 - z2 * 0.22);
        let px = cx + x1 * escala * persp * respira;
        let py = cy + y2 * escala * persp * respira;
        // repulsao do mouse (com mola)
        let alvoDx = 0, alvoDy = 0;
        if (!estatico) {
          const mx = px - mouse.x, my = py - mouse.y, dd = Math.sqrt(mx * mx + my * my);
          if (dd < raioMouse && dd > 0.01) { const f = (1 - dd / raioMouse); alvoDx = (mx / dd) * f * f * escala * 0.35; alvoDy = (my / dd) * f * f * escala * 0.35; }
          p.dx += (alvoDx - p.dx) * 0.12; p.dy += (alvoDy - p.dy) * 0.12;
        }
        px += p.dx; py += p.dy;
        const prof = (z2 + 1.2) / 2.4;
        const brilho = 0.7 + 0.3 * Math.sin(t * p.k * 1.3 + p.f);
        // particulas perto do cursor acendem (mais claras, maiores e mais opacas)
        let luzP = 0;
        if (luz.i > 0.01) { const lx = px - luz.x, ly = py - luz.y, ld = Math.sqrt(lx * lx + ly * ly) / raioLuz; if (ld < 1) luzP = (1 - ld) * (1 - ld) * luz.i; }
        const a = Math.min(1, (0.25 + e * 0.75) * (0.7 + 0.3 * prof) * brilho + luzP * 0.55);
        const lr = Math.round(p.r + (200 - p.r) * luzP), lg = Math.round(p.g + (255 - p.g) * luzP), lb = Math.round(p.b + (235 - p.b) * luzP);
        ctx.fillStyle = `rgba(${lr},${lg},${lb},${a.toFixed(3)})`;
        const tam = tamBase * (0.8 + 0.4 * prof) * (0.6 + 0.4 * e) * (1 + luzP * 0.7);
        ctx.fillRect(px - tam / 2, py - tam / 2, tam, tam);
      }
    };

    const loop = (agora) => { quadro(agora, false); raf = requestAnimationFrame(loop); };
    const aoMover = (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      mouse.nx = (e.clientX / window.innerWidth - 0.5) * 2; mouse.ny = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const aoSair = () => { mouse.x = -9999; mouse.y = -9999; };
    const aoVisibilidade = () => {
      if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
      else if (!reduce && !raf && info) { raf = requestAnimationFrame(loop); }
    };

    medir();
    const img = new Image();
    img.onload = () => {
      if (!vivo) return;
      try { montar(amostrarIcone(img, desktop ? 9000 : 3600)); } catch (e) { return; }
      t0 = performance.now();
      if (reduce) quadro(t0, true);
      else raf = requestAnimationFrame(loop);
    };
    img.src = LOGO_URL;

    const aoRedimensionar = () => { medir(); if (img.complete && info) { try { montar(amostrarIcone(img, desktop ? 9000 : 3600)); t0 = performance.now() - 4000; if (reduce) quadro(t0, true); } catch (e) { /* mantem */ } } };
    window.addEventListener("resize", aoRedimensionar);
    if (!reduce) {
      window.addEventListener("mousemove", aoMover, { passive: true });
      document.addEventListener("mouseleave", aoSair);
      document.addEventListener("visibilitychange", aoVisibilidade);
    }
    return () => {
      vivo = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", aoRedimensionar);
      window.removeEventListener("mousemove", aoMover);
      document.removeEventListener("mouseleave", aoSair);
      document.removeEventListener("visibilitychange", aoVisibilidade);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />;
}
