// TODO(carlos): confirm each line before deploy — every item here must be
// something Dream Puppies actually, currently provides. Do not add anything
// speculative; remove anything that's stopped being true. This block ships
// behind VITE_SHOW_PRICE_INCLUDES (default off) until confirmed.
import { FileCheck, Cpu, Syringe, ShieldCheck, Gift, HeartHandshake } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PriceIncludeItem = {
  icon: LucideIcon;
  title: string;
  oneLiner: string;
};

export const PRICE_INCLUDES: readonly PriceIncludeItem[] = [
  {
    icon: FileCheck,
    title: "FL Health Certificate",
    oneLiner: "Veterinarian-issued and ready for travel.",
  },
  {
    icon: Cpu,
    title: "Microchip",
    oneLiner: "Registered so your puppy can always be traced back to you.",
  },
  {
    icon: Syringe,
    title: "First Vaccines & Deworming",
    oneLiner: "Age-appropriate rounds completed before pickup.",
  },
  {
    icon: ShieldCheck,
    title: "30-Day Pet Insurance Trial",
    oneLiner: "A trial policy so you're covered from day one.",
  },
  {
    icon: Gift,
    title: "Go-Home Bag",
    oneLiner: "Includes a blanket that smells like mom to ease the transition.",
  },
  {
    icon: HeartHandshake,
    title: "Lifetime Rehome Commitment",
    oneLiner: "If life ever changes, we'll always take your puppy back.",
  },
] as const;
