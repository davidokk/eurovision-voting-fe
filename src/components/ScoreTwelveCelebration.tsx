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
  const colors = ["#fde047", "#fbbf24", "#f472b6", "#a78bfa", "#60a5fa", "#fff"];
  const out: Particle[] = [];
  const cx = w / 2;
  const cy = h / 2;
  for (let i = 0; i < 80; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 10;
    out.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 8,
      color: colors[i % colors.length],
      life: 0.7 + Math.random() * 0.3,
      shape: Math.random() > 0.5 ? "star" : "ring",
    });
  }
  return out;
}

type Props = {
  active: boolean;
};

export function ScoreTwelveCelebration({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const w = parent?.clientWidth ?? 400;
    const h = parent?.clientHeight ?? 320;
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
        p.vy += 0.12;
        p.vx *= 0.98;
        p.life -= 0.014;
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
      if (alive > 0 && frame < 200) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  if (!active) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        pointerEvents: "none",
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 88,
            fontWeight: 1000,
            lineHeight: 1,
            background: "linear-gradient(135deg, #fff 0%, #fde047 40%, #f472b6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 28px rgba(250, 204, 21, 0.9)) drop-shadow(0 0 60px rgba(236, 72, 153, 0.5))",
            animation: "ev-score-12-pop 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          }}
        >
          12
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#fde047",
            textShadow: "0 0 20px rgba(250, 204, 21, 0.8)",
            animation: "ev-score-12-fade 0.5s ease 0.2s both",
          }}
        >
          Douze points!
        </div>
      </div>
      <style>{`
        @keyframes ev-score-12-pop {
          0% { opacity: 0; transform: scale(0.3) rotate(-12deg); }
          70% { transform: scale(1.08) rotate(3deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes ev-score-12-fade {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
