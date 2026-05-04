import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardTitle } from "@/components/ui/card";
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
  type UpcomingLitterPuppyPlaceholder,
} from "@/lib/supabase";
import { resolvePuppyPhotosPublicUrl } from "@/lib/puppy-photos";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Loader2, UserPlus } from "lucide-react";
import { DepositRequestForm } from "@/components/DepositRequestForm";
import { REQUEST_DEPOSIT_RESERVATION } from "@/lib/inquiry-subjects";
import { getBirthWindow, getGoHomeWindow } from "@/lib/litter-timeline";
import { fetchActiveUpcomingLitters, UPCOMING_LITTERS_ACTIVE_QUERY_KEY } from "@/lib/upcoming-litters";
import {
  insertDepositRequest,
  depositRequestPayloadToRow,
  type DepositRequestPayload,
} from "@/lib/deposit-requests";
import { useLanguage } from "@/contexts/LanguageContext";
import { pickDepositLabel } from "@/lib/upcoming-pick-labels";
import { DreamTag, SlotTile, StickerButton } from "@/components/redesign/PublicDesignPrimitives";

const DEFAULT_DEPOSIT_AMOUNT = 300;

const FALLBACK_IMAGE_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23e5e7eb' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='18' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3ENo photo%3C/text%3E%3C/svg%3E";

function getDisplayBreed(litter: UpcomingLitter): string {
  return (litter.display_breed || litter.breed || "Upcoming Litter").trim() || "Upcoming Litter";
}

function getSlotState(ph: UpcomingLitterPuppyPlaceholder & { hold_expires_at?: string | null }) {
  if (ph.lifecycle_status === "born") return "picked" as const;
  if (ph.hold_expires_at && new Date(ph.hold_expires_at) > new Date()) return "reserved" as const;
  return "open" as const;
}

function getPlaceholderImageUrl(path: string | null | undefined): string {
  return resolvePuppyPhotosPublicUrl(path ?? "puppy-placeholder/default.png") ?? FALLBACK_IMAGE_SRC;
}

function photoPathOrNull(path: string | null | undefined): string | null {
  const s = typeof path === "string" ? path.trim() : "";
  return s || null;
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
  const { toast } = useToast();
  const [reserveLitter, setReserveLitter] = useState<UpcomingLitter | null>(null);
  const [reservePlaceholderId, setReservePlaceholderId] = useState<string | null>(null);
  const [reserveSubmitting, setReserveSubmitting] = useState(false);
  const [parentModal, setParentModal] = useState<ParentDogModalState | null>(null);

  const { data: litters, isLoading, error } = useQuery({
    queryKey: UPCOMING_LITTERS_ACTIVE_QUERY_KEY,
    queryFn: fetchActiveUpcomingLitters,
  });

  const openReserve = (litter: UpcomingLitter, placeholder: UpcomingLitterPuppyPlaceholder | null) => {
    setReserveLitter(litter);
    setReservePlaceholderId(placeholder?.id ?? null);
  };

  const closeReserve = () => {
    setReserveLitter(null);
    setReservePlaceholderId(null);
  };

  const handleDepositRequestSubmit = async (payload: DepositRequestPayload) => {
    setReserveSubmitting(true);
    try {
      const { error: err } = await insertDepositRequest(depositRequestPayloadToRow(payload));
      if (err) throw err;
      toast({
        title: "Deposit request submitted",
        description:
          "We'll review and send your agreement link via email and text within 24–48 hours.",
      });
      closeReserve();
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error).message || "Failed to submit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setReserveSubmitting(false);
    }
  };

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
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center text-destructive py-12">{t("upcomingLoadError")}</div>
      ) : !litters?.length ? (
        <div className="text-center text-muted-foreground py-12">
          {t("upcomingEmptyPrefix")}{" "}
          <Link to="/contact?subject=upcoming-litter" className="text-primary underline">
            {t("upcomingContactUs")}
          </Link>{" "}
          {t("upcomingEmptySuffix")}
        </div>
      ) : (
        <div className="mx-auto max-w-5xl space-y-6">
          <p className="px-1 text-center text-xs leading-relaxed text-muted-foreground">
            {t("upcomingDepositPolicy")}
          </p>

          <div className="space-y-5">
            {litters.map((litter) => {
              const imageUrl = getPlaceholderImageUrl(litter.placeholder_image_path);
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
              const damLabel = [litter.dam_name, litter.dam_breed].filter(Boolean).join(" • ");
              const sireLabel = [litter.sire_name, litter.sire_breed].filter(Boolean).join(" • ");
              const birthWindow = getBirthWindow(litter.breeding_date);
              const goHomeWindow = getGoHomeWindow(litter.breeding_date);
              const depositAmount =
                litter.deposit_amount != null && litter.deposit_amount > 0
                  ? litter.deposit_amount
                  : DEFAULT_DEPOSIT_AMOUNT;
              const refundableAmount =
                litter.refundable_deposit_amount != null && litter.refundable_deposit_amount > 0
                  ? litter.refundable_deposit_amount
                  : null;
              const displayBreedLabel = getDisplayBreed(litter);
              const placeholders = litter.puppy_placeholders ?? [];

              return (
                <Card key={litter.id} className="flex flex-col overflow-hidden border-line bg-bg text-white shadow-sm">
                  <div className="p-3 md:p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="font-display text-2xl leading-tight text-white">{displayBreedLabel}</CardTitle>
                        <p className="micro-label text-white/60">
                          {(litter.dam_name || "Dam").toUpperCase()} x {(litter.sire_name || "Sire").toUpperCase()}
                        </p>
                      </div>
                      <DreamTag className="bg-sun">{t("upcomingLitterBadge")}</DreamTag>
                    </div>

                    <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
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
                        className="group relative rounded-md overflow-hidden border aspect-[4/3] bg-muted max-h-36 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition hover:opacity-95"
                        aria-label={`View details for ${litter.dam_name || "Dam"}`}
                      >
                        <img
                          src={damHeroImage}
                          alt={`${litter.dam_name || "Dam"} photo`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_IMAGE_SRC;
                          }}
                        />
                        <Badge className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0" variant="outline">
                          {t("upcomingLabelDam")}
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
                        className="group relative rounded-md overflow-hidden border aspect-[4/3] bg-muted max-h-36 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition hover:opacity-95"
                        aria-label={`View details for ${litter.sire_name || "Sire"}`}
                      >
                        <img
                          src={sireHeroImage}
                          alt={`${litter.sire_name || "Sire"} photo`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_IMAGE_SRC;
                          }}
                        />
                        <Badge className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0" variant="outline">
                          {t("upcomingLabelSire")}
                        </Badge>
                      </button>
                    </div>

                    <p className="text-center text-[10px] text-muted-foreground italic">
                      {t("upcomingParentTapHint")}
                    </p>

                    {(damLabel || sireLabel) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 text-center text-[11px] sm:text-xs text-muted-foreground leading-snug max-w-lg mx-auto">
                        {damLabel && (
                          <p>
                            <span className="font-medium text-foreground">{t("upcomingTableDam")}:</span>{" "}
                            {damLabel}
                          </p>
                        )}
                        {sireLabel && (
                          <p>
                            <span className="font-medium text-foreground">{t("upcomingTableSire")}:</span>{" "}
                            {sireLabel}
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-center text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">{t("upcomingOffspringType")}:</span>{" "}
                      {displayBreedLabel}
                    </p>

                    <p className="text-center text-[10px] text-muted-foreground tracking-wide uppercase">
                      {t("upcomingFamilyTreeCaption")}
                    </p>

                    {placeholders.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-1">
                        {placeholders.map((p) => {
                          const pickLabel = pickDepositLabel(p.slot_index, t);
                          const slotState = getSlotState(
                            p as UpcomingLitterPuppyPlaceholder & { hold_expires_at?: string | null },
                          );
                          return (
                            <div
                              key={p.id}
                              className="space-y-1.5"
                            >
                              <SlotTile
                                state={slotState}
                                label={slotState === "open" ? pickLabel : `Locked ${p.slot_index}`}
                                onClick={slotState === "open" ? () => openReserve(litter, p) : undefined}
                              />
                              <p className="text-[10px] text-center text-white/70">
                                {pickLabel}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        {t("upcomingNoPlaceholders")}
                      </p>
                    )}

                    <div className="rounded-md border border-white/20 bg-white/5 px-3 py-2 space-y-1 text-[11px] sm:text-xs text-white/75 text-center leading-snug">
                      {birthWindow ? (
                        <p className="flex items-start justify-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                          <span>
                            {t("upcomingBirthWindow")}: {format(birthWindow.earliest, "MMM d")} –{" "}
                            {format(birthWindow.latest, "MMM d")}
                          </span>
                        </p>
                      ) : null}
                      {goHomeWindow ? (
                        <p className="flex items-start justify-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                          <span>
                            {t("upcomingGoHomeWindow")}: {format(goHomeWindow.earliest, "MMM d")} –{" "}
                            {format(goHomeWindow.latest, "MMM d")}
                          </span>
                        </p>
                      ) : null}
                      <p>
                        {t("upcomingDepositAmountLabel")}: ${depositAmount}. {t("upcomingReserveSpotsLabel")}:{" "}
                        {litter.deposits_reserved_count ?? 0} {t("upcomingOf")} {litter.max_deposit_slots ?? 4}.
                      </p>
                      {refundableAmount != null ? (
                        <p>
                          {t("upcomingRefundableLabel")}: ${refundableAmount}. {t("upcomingRefundableRest")}
                        </p>
                      ) : (
                        <p className="italic text-[10px]">{t("upcomingRefundableGeneric")}</p>
                      )}
                    </div>

                    {(litter.example_puppy_image_paths?.length ?? 0) > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-center">{t("upcomingPastPuppies")}</p>
                        <div className="flex gap-1.5 flex-wrap justify-center">
                          {litter.example_puppy_image_paths!.slice(0, 3).map((path, i) => (
                            <img
                              key={path}
                              src={resolvePuppyPhotosPublicUrl(path) ?? FALLBACK_IMAGE_SRC}
                              alt={`Past puppy ${i + 1}`}
                              className="h-12 w-12 rounded object-cover shrink-0 border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = FALLBACK_IMAGE_SRC;
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <StickerButton
                      type="button"
                      size="sm"
                      className="w-full h-9 text-sm"
                      onClick={() => openReserve(litter, null)}
                    >
                      <UserPlus className="mr-2 h-3.5 w-3.5" />
                      {REQUEST_DEPOSIT_RESERVATION}
                    </StickerButton>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {!embedded ? (
        <div className="flex justify-center mt-12 pb-8">
          <Button asChild size="lg" className="rounded-pill font-bold uppercase tracking-[0.06em]">
            <Link to="/contact?subject=upcoming-litter">{t("upcomingContactCta")}</Link>
          </Button>
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

      <Dialog
        open={!!reserveLitter}
        onOpenChange={(open) => {
          if (!open) closeReserve();
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{REQUEST_DEPOSIT_RESERVATION}</DialogTitle>
            <DialogDescription>
              {reserveLitter
                ? `${t("upcomingDialogIntro")} ${getDisplayBreed(reserveLitter)}${t("upcomingDialogWithBreedSuffix")}`
                : t("upcomingDialogFallback")}
            </DialogDescription>
          </DialogHeader>
          {litters?.length ? (
            <DepositRequestForm
              litters={litters}
              initialLitterId={reserveLitter?.id ?? null}
              initialPlaceholderId={reservePlaceholderId}
              stepMode
              onSubmit={handleDepositRequestSubmit}
              isSubmitting={reserveSubmitting}
            />
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
