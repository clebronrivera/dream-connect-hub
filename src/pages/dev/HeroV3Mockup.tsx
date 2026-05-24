import { useEffect, useRef, type RefObject } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  Handshake,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  PawPrint,
  Phone,
  Shield,
} from "lucide-react";
import { BUSINESS } from "@/lib/constants/business";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";
import { GalacticHomeNav } from "@/components/home/GalacticHomeNav";
import { GalacticHeroPuppiesMarquee } from "@/components/home/GalacticHeroPuppiesMarquee";
import { useBusinessInfoOrDefaults } from "@/lib/hooks/useBusinessInfo";

type Paw = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  angle: number;
  orbitRadius: number;
  speed: number;
  phase: number;
};

function useGalacticPawCanvas(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const numPaws = 18;
    let paws: Paw[] = [];
    let raf = 0;

    function initPaws(w: number, h: number) {
      paws = [];
      for (let i = 0; i < numPaws; i++) {
        const angle = (i / numPaws) * Math.PI * 2;
        const radius = 180 + Math.random() * 420;
        paws.push({
          x: w / 2 + Math.cos(angle) * radius,
          y: h / 2.2 + Math.sin(angle) * (radius * 0.55),
          size: 22 + Math.random() * 18,
          alpha: 0.15 + Math.random() * 0.25,
          angle,
          orbitRadius: radius,
          speed: 0.0008 + Math.random() * 0.0012,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initPaws(w, h);
    }

    function drawPaws() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      const centerX = w / 2;
      const centerY = h / 2.2;

      paws.forEach((paw, index) => {
        paw.angle += paw.speed;
        const bob = Math.sin(Date.now() / 1800 + paw.phase) * 18;
        paw.x = centerX + Math.cos(paw.angle) * paw.orbitRadius;
        paw.y = centerY + Math.sin(paw.angle) * (paw.orbitRadius * 0.52) + bob;

        ctx.save();
        ctx.globalAlpha = paw.alpha;
        ctx.font = `${paw.size}px sans-serif`;
        ctx.fillStyle = "#ff3399";
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#ff3399";
        ctx.translate(paw.x, paw.y);
        ctx.rotate(Math.sin(Date.now() / 2200 + index) * 0.08);
        ctx.fillText("🐾", -paw.size * 0.45, paw.size * 0.35);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = paw.alpha * 0.35;
        ctx.shadowBlur = 32;
        ctx.shadowColor = "#c084fc";
        ctx.font = `${paw.size * 1.1}px sans-serif`;
        ctx.fillText("🐾", paw.x - paw.size * 0.45, paw.y + paw.size * 0.35);
        ctx.restore();
      });
    }

    function animate() {
      drawPaws();
      raf = requestAnimationFrame(animate);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(raf);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- canvas ref stable for full-page effect
}

const pink = "#ff3399";
const space = "#0f041b";

const PROMISE_CARDS: { icon: typeof Eye; titleKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { icon: Eye, titleKey: "mockupV3Promise1Title", bodyKey: "mockupV3Promise1Body" },
  { icon: Home, titleKey: "mockupV3Promise2Title", bodyKey: "mockupV3Promise2Body" },
  { icon: Handshake, titleKey: "mockupV3Promise3Title", bodyKey: "mockupV3Promise3Body" },
  { icon: Shield, titleKey: "mockupV3Promise4Title", bodyKey: "mockupV3Promise4Body" },
];

export default function HeroV3Mockup() {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useGalacticPawCanvas(canvasRef);
  const businessInfo = useBusinessInfoOrDefaults();

  const locationsLabel = businessInfo.locations.map((l) => `${l.city}, ${l.state}`).join(" · ");
  const smsHref = `sms:+1${businessInfo.phoneRaw}`;
  const telHref = `tel:+1${businessInfo.phoneRaw}`;

  return (
    <div className="overflow-x-hidden bg-[#0f041b] text-white">
      <GalacticHomeNav />
      <header
        className="relative flex min-h-[100dvh] flex-col overflow-hidden pt-8 pb-0"
        style={{
          background: `radial-gradient(circle at 50% 25%, #2a0f3a 0%, #1a0a2e 40%, ${space} 80%)`,
        }}
      >
        <canvas
          ref={canvasRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        />
        <div
          className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#0f041b]/60 via-transparent to-[#0f041b]/80"
          aria-hidden
        />

        <div className="relative z-20 flex min-h-0 flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 pb-6 text-center">
          <h1 className="mb-6 font-display text-[52px] font-black uppercase leading-[0.98] tracking-[-0.05em] drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)] sm:text-[64px] md:text-[96px]">
            <span className="block">{t("indexHeroTitlePart1")}</span>
            <span
              className="mt-1 block bg-gradient-to-r from-[#ff3399] via-fuchsia-400 to-purple-400 bg-clip-text text-transparent [-webkit-background-clip:text] [-webkit-text-fill-color:transparent] [filter:drop-shadow(0_0_12px_rgba(255,51,153,0.6))]"
            >
              {t("indexHeroTitleAccent")}
            </span>
            <span className="mt-1 block text-white">{t("indexHeroTitlePart2")}</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl font-body text-xl leading-tight text-white/80 md:text-2xl">
            {t("indexHeroDescription")}
          </p>

          <div className="mb-12 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href={smsHref}
              className="group flex items-center justify-center gap-x-3 rounded-3xl bg-[#ff3399] px-10 py-5 text-lg font-bold text-white shadow-[0_0_40px_rgba(255,51,153,0.5)] transition duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:bg-[#ff1a8c] hover:shadow-[0_20px_25px_-5px_rgb(255_51_153/0.4)] sm:px-12 sm:text-xl"
            >
              <MessageCircle className="size-6 shrink-0" aria-hidden />
              <span>{t("indexHeroTextUsCta")}</span>
              <ArrowRight className="size-5 shrink-0 transition group-active:translate-x-1" aria-hidden />
            </a>

            <Link
              to="/puppies"
              className="flex items-center justify-center gap-x-3 rounded-3xl border border-white/30 px-10 py-5 text-lg font-semibold text-white transition hover:bg-white/5 sm:text-xl"
            >
              {t("indexHeroViewAvailablePuppiesCta")}
            </Link>
          </div>

          <p className="mb-10 text-center text-sm text-white/55">
            {t("mockupV3PreferCall")}{" "}
            <a
              href={telHref}
              className="font-medium text-white underline-offset-4 hover:text-[#ff3399] hover:underline"
            >
              {businessInfo.phone}
            </a>
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: CheckCircle2, label: t("indexHeroTrustVetChecked") },
              { icon: Home, label: t("indexHeroTrustHomeRaised") },
              { icon: Heart, label: t("indexHeroTrustFamilySocialized") },
              { icon: MapPin, label: locationsLabel },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-x-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_15px_-3px_rgb(255_51_153/0.25)]"
              >
                <Icon className="size-4 shrink-0" style={{ color: pink }} aria-hidden />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <a
            href="#mockup-promise"
            className="mt-10 hidden flex-col items-center text-white/40 transition hover:text-white/60 md:flex"
          >
            <span className="text-xs tracking-[3px]">{t("indexHeroScrollHint").toUpperCase()}</span>
            <ChevronDown className="mt-2 size-4 animate-bounce" aria-hidden />
          </a>
          </div>

          <GalacticHeroPuppiesMarquee className="relative z-20 mt-auto shrink-0" />
        </div>
      </header>

      {/* Promise / why us */}
      <section id="mockup-promise" className="border-t border-white/10 bg-[#0a0214] py-16 md:py-20">
        <div className="mx-auto max-w-screen-2xl px-6 md:px-8">
          <div className="mb-14 text-center">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-[#ff3399]">
              {t("mockupV3PromiseEyebrow")}
            </div>
            <h2 className="font-display text-4xl font-black tracking-tighter text-white md:text-5xl">
              {t("mockupV3PromiseTitleLine1")}
              <br />
              {t("mockupV3PromiseTitleLine2")}
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PROMISE_CARDS.map(({ icon: Icon, titleKey, bodyKey }) => (
              <div
                key={titleKey}
                className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-xl"
              >
                <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-[#ff3399]/10">
                  <Icon className="size-7" style={{ color: pink }} aria-hidden />
                </div>
                <div className="mb-3 text-2xl font-bold">{t(titleKey)}</div>
                <p className="text-white/70">{t(bodyKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-white/10 py-16 md:py-20">
        <div className="mx-auto max-w-2xl px-6 text-center md:px-8">
          <div className="mx-auto mb-8 flex size-16 items-center justify-center rounded-2xl bg-[#ff3399]/10">
            <MessageCircle className="size-9" style={{ color: pink }} aria-hidden />
          </div>
          <h2 className="mb-6 font-display text-4xl font-black tracking-tighter text-white md:text-5xl">
            {t("mockupV3FinalTitle")}
          </h2>
          <p className="mb-10 text-xl text-white/70">{t("mockupV3FinalSub")}</p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href={smsHref}
              className="flex items-center justify-center gap-x-3 rounded-3xl bg-[#ff3399] px-10 py-4 text-lg font-bold text-white shadow-[0_0_24px_rgba(255,51,153,0.45)] transition hover:bg-[#ff1a8c]"
            >
              <MessageCircle className="size-5 shrink-0" aria-hidden />
              {t("indexHeroTextUsCta")}
            </a>
            <a
              href={telHref}
              className="flex items-center justify-center gap-x-3 rounded-3xl border border-white/30 px-8 py-4 text-lg font-semibold text-white transition hover:bg-white/5"
            >
              <Phone className="size-5 shrink-0" aria-hidden />
              {businessInfo.phone}
            </a>
          </div>
          <p className="mt-8 text-xs text-white/50">
            {t("mockupV3FooterRegions")} · {businessInfo.phone}
          </p>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black py-12 text-sm text-white/50">
        <div className="mx-auto max-w-screen-2xl px-6 text-center md:px-8">
          <div className="mb-4 flex items-center justify-center gap-x-3">
            <PawPrint className="size-8 shrink-0" style={{ color: pink }} aria-hidden />
            <span className="font-display font-bold tracking-tighter text-white">{BUSINESS.primaryBrand.toUpperCase()}</span>
          </div>
          <div>
            © {new Date().getFullYear()} {BUSINESS.legalName} · {t("mockupV3FooterRegions")}
          </div>
          <div className="mt-1 text-xs">{t("mockupV3FooterTagline")}</div>
        </div>
      </footer>

    </div>
  );
}
