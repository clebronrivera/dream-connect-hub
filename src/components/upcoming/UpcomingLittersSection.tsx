import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type UpcomingLitter,
  type UpcomingLitterParent,
} from "@/lib/supabase";
import { resolvePuppyPhotosPublicUrl } from "@/lib/puppy-photos";
import { Loader2 } from "lucide-react";
import { getBirthWindow, getGoHomeWindow } from "@/lib/litter-timeline";
import { fetchActiveUpcomingLitters, UPCOMING_LITTERS_ACTIVE_QUERY_KEY } from "@/lib/upcoming-litters";
import { useLanguage } from "@/contexts/LanguageContext";
import { StickerButton } from "@/components/redesign/PublicDesignPrimitives";
import { BUSINESS } from "@/lib/constants/business";
import { useBusinessInfoOrDefaults } from "@/lib/hooks/useBusinessInfo";

const FALLBACK_IMAGE_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23e5e7eb' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='18' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3ENo photo%3C/text%3E%3C/svg%3E";

function getDisplayBreed(litter: UpcomingLitter): string {
  return (litter.display_breed || litter.breed || "Upcoming Litter").trim() || "Upcoming Litter";
}

function photoPathOrNull(path: string | null | undefined): string | null {
  const s = typeof path === "string" ? path.trim() : "";
  return s || null;
}

function compactBreedLabel(label: string): string {
  return label.replace("Miniature Poodle", "Mini Poodle");
}

export interface UpcomingLittersSectionProps {
  /** When true, omit extra top margin and use compact heading (e.g. on Puppies page). */
  embedded?: boolean;
}

type ParentDogModalState = {
  parent: UpcomingLitterParent | null;
  fallbackName: string;
  fallbackBreed: string;
  fallbackPhotoPath: string | null;
  roleLabel: string;
  imageUrl: string;
};

export function UpcomingLittersSection({ embedded = false }: UpcomingLittersSectionProps) {
  const { t } = useLanguage();
  const businessInfo = useBusinessInfoOrDefaults();
  const [parentModal, setParentModal] = useState<ParentDogModalState | null>(null);

  const buildReserveSmsHref = (litter: UpcomingLitter): string => {
    const damName = litter.dam_name?.trim() || "Dam";
    const sireName = litter.sire_name?.trim() || "Sire";
    const message = `Hi ${BUSINESS.primaryBrand}, I would like to reserve the puppies of ${damName} and ${sireName}.`;
    return `sms:+1${businessInfo.phoneRaw}?body=${encodeURIComponent(message)}`;
  };

  const { data: litters, isLoading, error } = useQuery({
    queryKey: UPCOMING_LITTERS_ACTIVE_QUERY_KEY,
    queryFn: fetchActiveUpcomingLitters,
  });

  return (
    <>
      {embedded ? (
        <div className="mb-7 space-y-2 text-center">
          <h2 className="font-display text-3xl uppercase tracking-tight text-ink">{t("upcomingHeroTitle")}</h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("upcomingHeroDescription")}
          </p>
          <Button variant="link" asChild className="h-auto py-0 text-sm text-primaryDeep">
            <Link to="/upcoming-litters">{t("upcomingFullPageLink")}</Link>
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center min-h-[300px] items-center">
          <Loader2 className="h-12 w-12 animate-spin text-white/60" />
        </div>
      ) : error ? (
        <div className="py-12 text-center text-rose-300">{t("upcomingLoadError")}</div>
      ) : !litters?.length ? (
        <div className="py-12 text-center text-white/70">
          {t("upcomingEmptyPrefix")}{" "}
          <Link to="/contact?subject=upcoming-litter" className="text-[#ff66b3] underline">
            {t("upcomingContactUs")}
          </Link>{" "}
          {t("upcomingEmptySuffix")}
        </div>
      ) : (
        <div className="mx-auto max-w-4xl space-y-3">
          <div className="space-y-3">
            {litters.map((litter) => {
              const imageUrl = FALLBACK_IMAGE_SRC;
              const dam = Array.isArray(litter.dam)
                ? (litter.dam as UpcomingLitterParent[])[0]
                : litter.dam;
              const sire = Array.isArray(litter.sire)
                ? (litter.sire as UpcomingLitterParent[])[0]
                : litter.sire;
              const damPhotoPath = photoPathOrNull(dam?.photo_path ?? litter.dam_photo_path);
              const sirePhotoPath = photoPathOrNull(sire?.photo_path ?? litter.sire_photo_path);
              const damHeroImage = damPhotoPath
                ? resolvePuppyPhotosPublicUrl(damPhotoPath) ?? imageUrl
                : imageUrl;
              const sireHeroImage = sirePhotoPath
                ? resolvePuppyPhotosPublicUrl(sirePhotoPath) ?? imageUrl
                : imageUrl;
              const birthWindow = getBirthWindow(litter.breeding_date);
              const goHomeWindow = getGoHomeWindow(litter.breeding_date);
              const displayBreedLabel = getDisplayBreed(litter);
              const displayBreedCompact = compactBreedLabel(displayBreedLabel);
              const reserveSmsHref = buildReserveSmsHref(litter);
              const contactHref = litter.id
                ? `/contact?subject=upcoming-litter&litter=${encodeURIComponent(String(litter.id))}`
                : "/contact?subject=upcoming-litter";
              const unifiedRowClass = "mx-auto grid w-full max-w-xl grid-cols-2 gap-2";

              return (
                <article
                  key={litter.id}
                  className="rounded-3xl border border-white/10 bg-[#12051f]/90 p-3.5 text-white backdrop-blur-xl md:p-4"
                >
                  <div className="space-y-3">
                    <div className="space-y-1.5 text-center">
                      <h3 className="font-display text-lg font-black tracking-tight text-white md:text-xl">
                          {displayBreedCompact}
                      </h3>
                    </div>

                    <div className={`${unifiedRowClass} gap-1.5`}>
                      <button
                        type="button"
                        onClick={() =>
                          setParentModal({
                            parent: dam ?? null,
                            fallbackName: litter.dam_name || "Dam",
                            fallbackBreed: litter.dam_breed || "",
                            fallbackPhotoPath: damPhotoPath,
                            roleLabel: t("upcomingLabelDam"),
                            imageUrl: damHeroImage,
                          })
                        }
                        className="group relative aspect-[4/3] w-full max-h-44 overflow-hidden rounded-2xl bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 transition hover:opacity-95"
                        aria-label={`View details for ${litter.dam_name || "Dam"}`}
                      >
                        <img
                          src={damHeroImage}
                          alt={`${litter.dam_name || "Dam"} photo`}
                          className="h-full w-full rounded-2xl object-contain object-center"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_IMAGE_SRC;
                          }}
                        />
                        <Badge className="absolute bottom-2 left-2 bg-black/60 text-[10px] text-white" variant="outline">
                          {litter.dam_name || t("upcomingLabelDam")}
                        </Badge>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setParentModal({
                            parent: sire ?? null,
                            fallbackName: litter.sire_name || "Sire",
                            fallbackBreed: litter.sire_breed || "",
                            fallbackPhotoPath: sirePhotoPath,
                            roleLabel: t("upcomingLabelSire"),
                            imageUrl: sireHeroImage,
                          })
                        }
                        className="group relative aspect-[4/3] w-full max-h-44 overflow-hidden rounded-2xl bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 transition hover:opacity-95"
                        aria-label={`View details for ${litter.sire_name || "Sire"}`}
                      >
                        <img
                          src={sireHeroImage}
                          alt={`${litter.sire_name || "Sire"} photo`}
                          className="h-full w-full rounded-2xl object-contain object-center"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_IMAGE_SRC;
                          }}
                        />
                        <Badge className="absolute bottom-2 left-2 bg-black/60 text-[10px] text-white" variant="outline">
                          {litter.sire_name || t("upcomingLabelSire")}
                        </Badge>
                      </button>
                    </div>

                    <div className={`${unifiedRowClass} gap-1.5`}>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                        <div className="mb-1 text-xs uppercase tracking-[0.14em] text-white/60">
                          {t("upcomingBirthWindow")}
                        </div>
                        <div className="text-sm font-semibold text-white">
                          {birthWindow
                            ? `${format(birthWindow.earliest, "MMM d")} - ${format(birthWindow.latest, "MMM d")}`
                            : "TBD"}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                        <div className="mb-1 text-xs uppercase tracking-[0.14em] text-white/60">
                          {t("upcomingGoHomeWindow")}
                        </div>
                        <div className="text-sm font-semibold text-white">
                          {goHomeWindow
                            ? `${format(goHomeWindow.earliest, "MMM d")} - ${format(goHomeWindow.latest, "MMM d")}`
                            : "TBD"}
                        </div>
                      </div>
                    </div>

                    <div className={`${unifiedRowClass} gap-1.5`}>
                      <StickerButton
                        size="lg"
                        className="group relative w-full overflow-hidden rounded-3xl bg-[#ff3399] px-4 py-2.5 text-sm font-bold normal-case tracking-normal text-white before:pointer-events-none before:absolute before:inset-x-3 before:top-1.5 before:h-[48%] before:rounded-full before:bg-white/25 before:blur-md before:content-[''] shadow-[0_6px_0_#ff66b3,0_14px_30px_rgba(255,102,179,0.45)] hover:bg-[#ff1a8c] hover:shadow-[0_6px_0_#ff85c2,0_16px_34px_rgba(255,133,194,0.5)]"
                        asChild
                      >
                        <a href={reserveSmsHref} className="flex items-center justify-center">Text to reserve</a>
                      </StickerButton>
                      <StickerButton
                        size="lg"
                        className="group relative w-full overflow-hidden rounded-3xl bg-[#5b21b6] px-4 py-2.5 text-sm font-bold normal-case tracking-normal text-white before:pointer-events-none before:absolute before:inset-x-3 before:top-1.5 before:h-[48%] before:rounded-full before:bg-white/25 before:blur-md before:content-[''] shadow-[0_6px_0_#7c3aed,0_14px_30px_rgba(124,58,237,0.45)] hover:bg-[#7c3aed] hover:shadow-[0_6px_0_#a78bfa,0_16px_34px_rgba(167,139,250,0.5)]"
                        asChild
                      >
                        <Link to={contactHref} className="flex items-center justify-center">Contact us form</Link>
                      </StickerButton>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {!embedded ? (
        <div className="flex justify-center mt-12 pb-8">
          <StickerButton
            asChild
            size="lg"
            className="group relative overflow-hidden rounded-3xl bg-[#ff3399] px-8 py-4 text-base font-bold normal-case tracking-normal text-white before:pointer-events-none before:absolute before:inset-x-3 before:top-1.5 before:h-[48%] before:rounded-full before:bg-white/25 before:blur-md before:content-[''] shadow-[0_6px_0_#ff66b3,0_14px_30px_rgba(255,102,179,0.45)] hover:bg-[#ff1a8c] hover:shadow-[0_6px_0_#ff85c2,0_16px_34px_rgba(255,133,194,0.5)]"
          >
            <Link to="/contact?subject=upcoming-litter">{t("upcomingContactCta")}</Link>
          </StickerButton>
        </div>
      ) : null}

      <Dialog
        open={!!parentModal}
        onOpenChange={(open) => {
          if (!open) setParentModal(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {parentModal ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {parentModal.parent?.name || parentModal.fallbackName}
                </DialogTitle>
                <DialogDescription>
                  {parentModal.roleLabel}
                  {(parentModal.parent?.breed || parentModal.fallbackBreed) &&
                    ` • ${parentModal.parent?.breed || parentModal.fallbackBreed}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative w-full bg-muted rounded-md overflow-hidden border flex items-center justify-center">
                  <img
                    src={
                      resolvePuppyPhotosPublicUrl(parentModal.parent?.photo_path) ??
                      resolvePuppyPhotosPublicUrl(parentModal.fallbackPhotoPath) ??
                      parentModal.imageUrl
                    }
                    alt={`${parentModal.parent?.name || parentModal.fallbackName} photo`}
                    className="w-full max-h-[60vh] object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_IMAGE_SRC;
                    }}
                  />
                </div>
                {parentModal.parent ? (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {parentModal.parent.breed ? (
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                          {t("upcomingParentBreedLabel")}
                        </dt>
                        <dd className="text-foreground">{parentModal.parent.breed}</dd>
                      </div>
                    ) : null}
                    {parentModal.parent.composition ? (
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                          {t("upcomingParentCompositionLabel")}
                        </dt>
                        <dd className="text-foreground">{parentModal.parent.composition}</dd>
                      </div>
                    ) : null}
                    {parentModal.parent.color ? (
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                          {t("upcomingParentColorLabel")}
                        </dt>
                        <dd className="text-foreground">{parentModal.parent.color}</dd>
                      </div>
                    ) : null}
                    {parentModal.parent.role ? (
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                          {t("upcomingParentRoleLabel")}
                        </dt>
                        <dd className="text-foreground">{parentModal.parent.role}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center">
                    {t("upcomingParentNoDetails")}
                  </p>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

    </>
  );
}
