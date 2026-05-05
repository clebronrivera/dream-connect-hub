import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Paw = {
  angle: number;
  orbitRadius: number;
  size: number;
  alpha: number;
  speed: number;
  phase: number;
};

const NUM_PAWS = 18;

function buildPaws(): Paw[] {
  const paws: Paw[] = [];
  for (let i = 0; i < NUM_PAWS; i++) {
    const angle = (i / NUM_PAWS) * Math.PI * 2;
    const radius = 180 + Math.random() * 420;
    paws.push({
      angle,
      orbitRadius: radius,
      size: 22 + Math.random() * 18,
      alpha: 0.15 + Math.random() * 0.25,
      speed: 0.0008 + Math.random() * 0.0012,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return paws;
}

type GalacticPawCanvasProps = {
  className?: string;
};

/**
 * Subtle orbiting paw glyphs behind the home hero (requestAnimationFrame, ~18 particles).
 */
export function GalacticPawCanvas({ className }: GalacticPawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pawsRef = useRef<Paw[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      canvas.width = w;
      canvas.height = h;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pawsRef.current = buildPaws();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const centerX = () => canvas.getBoundingClientRect().width / 2;
    const centerY = () => canvas.getBoundingClientRect().height / 2.2;

    const drawPaws = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);
      const cx = centerX();
      const cy = centerY();

      pawsRef.current.forEach((paw, index) => {
        paw.angle += paw.speed;
        const bob = Math.sin(Date.now() / 1800 + paw.phase) * 18;
        const x = cx + Math.cos(paw.angle) * paw.orbitRadius;
        const y = cy + Math.sin(paw.angle) * (paw.orbitRadius * 0.52) + bob;

        ctx.save();
        ctx.globalAlpha = paw.alpha;
        ctx.font = `${paw.size}px sans-serif`;
        ctx.fillStyle = "#ff3399";
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#ff3399";
        ctx.translate(x, y);
        ctx.rotate(Math.sin(Date.now() / 2200 + index) * 0.08);
        ctx.fillText("🐾", -paw.size * 0.45, paw.size * 0.35);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = paw.alpha * 0.35;
        ctx.shadowBlur = 32;
        ctx.shadowColor = "#c084fc";
        ctx.font = `${paw.size * 1.1}px sans-serif`;
        ctx.fillText("🐾", x - paw.size * 0.45, y + paw.size * 0.35);
        ctx.restore();
      });
    };

    const loop = () => {
      drawPaws();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className={cn("pointer-events-none h-full w-full", className)} aria-hidden />;
}
