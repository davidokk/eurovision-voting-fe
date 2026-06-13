import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  shape: "star" | "ring";
};

function spawn(w: number, h: number): Particle[] {
  const colors = ["#fde047", "#fbbf24", "#f472b6", "#a78bfa", "#60a5fa", "#22c55e", "#fff"];
  const out: Particle[] = [];
  for (let burst = 0; burst < 3; burst++) {
    const cx = w * (0.25 + burst * 0.25);
    const cy = h * 0.35;
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 12;
      out.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 3 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0.85 + Math.random() * 0.15,
        shape: Math.random() > 0.45 ? "star" : "ring",
      });
    }
  }
  return out;
}

type Props = {
  active: boolean;
};

export function GameEndConfetti({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    let particles = spawn(w, h);
    const ctx = canvas.getContext("2d");
    let frame = 0;

    const tick = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      let alive = 0;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.vx *= 0.99;
        p.life -= 0.008;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        if (p.shape === "star") {
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const r = i % 2 === 0 ? p.size : p.size * 0.45;
            ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      frame++;
      if (alive > 0 && frame < 400) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9998,
      }}
    />
  );
}
