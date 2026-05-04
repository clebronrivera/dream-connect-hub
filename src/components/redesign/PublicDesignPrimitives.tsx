import type { ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TagProps = {
  children: ReactNode;
  className?: string;
};

type PuppyPlaceholderProps = {
  hue?: number;
  ear?: 0 | 1;
  size?: number;
  className?: string;
};

type MarqueeProps = {
  items: string[];
  className?: string;
};

export function DreamTag({ children, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StickerButton({ className, ...props }: ButtonProps) {
  return (
    <Button
      className={cn("rounded-pill font-bold tracking-[0.08em] uppercase shadow-sticker active:sticker-press", className)}
      {...props}
    />
  );
}

export function PuppyPlaceholderSvg({
  hue = 28,
  ear = 0,
  size = 220,
  className,
}: PuppyPlaceholderProps) {
  const coat = `hsl(${hue} 55% 72%)`;
  const coatDeep = `hsl(${hue} 50% 56%)`;
  const muzzle = `hsl(${hue} 30% 88%)`;

  return (
    <svg
      viewBox="0 0 220 220"
      width={size}
      height={size}
      className={className}
      aria-label="Puppy illustration"
    >
      <rect width="220" height="220" rx="24" fill={`hsl(${hue} 90% 95%)`} />
      <ellipse cx="110" cy="170" rx="68" ry="36" fill={coatDeep} />
      <circle cx="110" cy="108" r="62" fill={coat} />
      {ear === 0 ? (
        <>
          <ellipse cx="62" cy="92" rx="22" ry="38" fill={coatDeep} transform="rotate(-18 62 92)" />
          <ellipse cx="158" cy="92" rx="22" ry="38" fill={coatDeep} transform="rotate(18 158 92)" />
        </>
      ) : (
        <>
          <path d="M58 60 L78 78 L62 102 Z" fill={coatDeep} />
          <path d="M162 60 L142 78 L158 102 Z" fill={coatDeep} />
        </>
      )}
      <ellipse cx="110" cy="130" rx="34" ry="24" fill={muzzle} />
      <circle cx="90" cy="105" r="6" fill="#1a1530" />
      <circle cx="130" cy="105" r="6" fill="#1a1530" />
      <circle cx="92" cy="103" r="2" fill="#fff" />
      <circle cx="132" cy="103" r="2" fill="#fff" />
      <ellipse cx="110" cy="124" rx="7" ry="5" fill="#1a1530" />
      <path d="M110 130 Q104 138 100 134" stroke="#1a1530" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M110 130 Q116 138 120 134" stroke="#1a1530" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function BreedMarquee({ items, className }: MarqueeProps) {
  const row = [...items, ...items];
  return (
    <div className={cn("overflow-hidden border-y border-white/15 bg-bgSoft py-4 text-white", className)}>
      <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap hover:[animation-play-state:paused]">
        {row.map((item, idx) => (
          <span key={`${item}-${idx}`} className="font-display text-xl uppercase tracking-tight">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

type SlotState = "open" | "reserved" | "picked";

type SlotTileProps = {
  state: SlotState;
  label: string;
  onClick?: () => void;
  className?: string;
};

export function SlotTile({ state, label, onClick, className }: SlotTileProps) {
  const isOpen = state === "open";

  return (
    <button
      type="button"
      disabled={!isOpen}
      onClick={onClick}
      className={cn(
        "aspect-square rounded-md border p-2 text-center text-[10px] font-monoDream uppercase tracking-wider transition",
        isOpen && "border-accent border-dashed bg-bg text-accent hover:scale-[1.04]",
        state === "reserved" && "cursor-not-allowed border-white/10 bg-white/5 text-white/40",
        state === "picked" && "cursor-not-allowed border-ink bg-leaf text-ink",
        className,
      )}
    >
      {label}
    </button>
  );
}
