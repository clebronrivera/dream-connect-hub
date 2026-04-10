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
import { supabase, type UpcomingLitter, type UpcomingLitterPuppyPlaceholder } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Loader2, UserPlus } from "lucide-react";
import {
  UpcomingLitterInquiryForm,
  type UpcomingLitterInquiryPayload,
} from "@/components/UpcomingLitterInquiryForm";
import { JOIN_WAITLIST_AND_INQUIRE_ABOUT_DEPOSIT } from "@/lib/inquiry-subjects";
import { getBirthWindow, getGoHomeWindow } from "@/lib/litter-timeline";
import { fetchActiveUpcomingLitters, UPCOMING_LITTERS_ACTIVE_QUERY_KEY } from "@/lib/upcoming-litters";
import { insertContactMessage, upcomingLitterPayloadToRow } from "@/lib/contact-messages";
import { useLanguage } from "@/contexts/LanguageContext";
import { UpcomingPuppySilhouette } from "@/components/upcoming/UpcomingPuppySilhouette";
import { pickDepositLabel } from "@/lib/upcoming-pick-labels";

const DEFAULT_DEPOSIT_AMOUNT = 300;

const FALLBACK_IMAGE_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23e5e7eb' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='18' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3ENo photo%3C/text%3E%3C/svg%3E";

function getDisplayBreed(litter: UpcomingLitter): string {
  return (litter.display_breed || litter.breed || "Upcoming Litter").trim() || "Upcoming Litter";
}

function getPlaceholderImageUrl(path: string | null | undefined): string {
  const { data } = supabase.storage
    .from("puppy-photos")
    .getPublicUrl(path ?? "puppy-placeholder/default.png");
  return data.publicUrl;
}

function getStoragePublicUrl(path: string): string {
  return supabase.storage.from("puppy-photos").getPublicUrl(path).data.publicUrl;
}

function photoPathOrNull(path: string | null | undefined): string | null {
  const s = typeof path === "string" ? path.trim() : "";
  return s || null;
}

export interface UpcomingLittersSectionProps {
  /** When true, omit extra top margin and use compact heading (e.g. on Puppies page). */
  embedded?: boolean;
}

export function UpcomingLittersSection({ embedded = false }: UpcomingLittersSectionProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [reserveLitter, setReserveLitter] = useState<UpcomingLitter | null>(null);
  const [reservePlaceholderId, setReservePlaceholderId] = useState<string | null>(null);
  const [reserveSubmitting, setReserveSubmitting] = useState(false);

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

  const handleInquirySubmit = async (payload: UpcomingLitterInquiryPayload) => {
    setReserveSubmitting(true);
    try {
      const { error: err } = await insertContactMessage(upcomingLitterPayloadToRow(payload));
      if (err) throw err;
      toast({
        title: "Submitted",
        description: "We'll be in touch about the waitlist and deposit options.",
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
        <div className="mb-6 text-center space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight">{t("upcomingHeroTitle")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-xs sm:text-sm leading-snug">
            {t("upcomingHeroDescription")}
          </p>
          <Button variant="link" asChild className="text-primary text-sm h-auto py-0">
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
        <div className="space-y-5 max-w-3xl mx-auto">
          <p className="text-xs text-muted-foreground text-center leading-relaxed px-1">
            {t("upcomingDepositPolicy")}
          </p>

          <div className="space-y-5">
            {litters.map((litter) => {
              const imageUrl = getPlaceholderImageUrl(litter.placeholder_image_path);
              const dam = Array.isArray(litter.dam)
                ? (litter.dam as { photo_path?: string | null }[])[0]
                : litter.dam;
              const sire = Array.isArray(litter.sire)
                ? (litter.sire as { photo_path?: string | null }[])[0]
                : litter.sire;
              const damPhotoPath = photoPathOrNull(dam?.photo_path ?? litter.dam_photo_path);
              const sirePhotoPath = photoPathOrNull(sire?.photo_path ?? litter.sire_photo_path);
              const damHeroImage = damPhotoPath ? getStoragePublicUrl(damPhotoPath) : imageUrl;
              const sireHeroImage = sirePhotoPath ? getStoragePublicUrl(sirePhotoPath) : imageUrl;
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
                <Card key={litter.id} className="overflow-hidden flex flex-col border-border/80 shadow-sm">
                  <div className="p-3 md:p-4 space-y-3">
                    <div className="text-center space-y-1">
                      <CardTitle className="text-lg font-semibold leading-tight">{displayBreedLabel}</CardTitle>
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {t("upcomingLitterBadge")}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                      <div className="relative rounded-md overflow-hidden border aspect-[4/3] bg-muted max-h-36">
                        <img
                          src={damHeroImage}
                          alt={`${litter.dam_name || "Dam"} photo`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_IMAGE_SRC;
                          }}
                        />
                        <Badge className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0" variant="outline">
                          {t("upcomingLabelDam")}
                        </Badge>
                      </div>
                      <div className="relative rounded-md overflow-hidden border aspect-[4/3] bg-muted max-h-36">
                        <img
                          src={sireHeroImage}
                          alt={`${litter.sire_name || "Sire"} photo`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_IMAGE_SRC;
                          }}
                        />
                        <Badge className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0" variant="outline">
                          {t("upcomingLabelSire")}
                        </Badge>
                      </div>
                    </div>

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
                      <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 pt-1">
                        {placeholders.map((p) => {
                          const pickLabel = pickDepositLabel(p.slot_index, t);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => openReserve(litter, p)}
                              className="flex flex-col items-center text-center rounded-lg border bg-muted/25 hover:bg-muted/50 hover:border-primary/35 transition-colors p-2 w-[130px] sm:w-[140px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                            >
                              <UpcomingPuppySilhouette
                                className="w-full max-w-[88px] aspect-square mx-auto"
                                title={pickLabel}
                              />
                              <p className="text-[11px] sm:text-xs font-medium text-foreground leading-tight text-balance mt-1.5 px-0.5">
                                {pickLabel}
                              </p>
                              <Badge
                                variant={p.lifecycle_status === "born" ? "default" : "outline"}
                                className="text-[9px] mt-1 px-1.5 py-0"
                              >
                                {p.lifecycle_status === "born"
                                  ? t("upcomingStatusBorn")
                                  : t("upcomingStatusExpected")}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        {t("upcomingNoPlaceholders")}
                      </p>
                    )}

                    <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 space-y-1 text-[11px] sm:text-xs text-muted-foreground text-center leading-snug">
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
                              src={getStoragePublicUrl(path)}
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

                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="w-full h-9 text-sm"
                      onClick={() => openReserve(litter, null)}
                    >
                      <UserPlus className="mr-2 h-3.5 w-3.5" />
                      {JOIN_WAITLIST_AND_INQUIRE_ABOUT_DEPOSIT}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {!embedded ? (
        <div className="flex justify-center mt-12 pb-8">
          <Button asChild size="lg">
            <Link to="/contact?subject=upcoming-litter">{t("upcomingContactCta")}</Link>
          </Button>
        </div>
      ) : null}

      <Dialog
        open={!!reserveLitter}
        onOpenChange={(open) => {
          if (!open) closeReserve();
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{JOIN_WAITLIST_AND_INQUIRE_ABOUT_DEPOSIT}</DialogTitle>
            <DialogDescription>
              {reserveLitter
                ? `${t("upcomingDialogIntro")} ${getDisplayBreed(reserveLitter)}${t("upcomingDialogWithBreedSuffix")}`
                : t("upcomingDialogFallback")}
            </DialogDescription>
          </DialogHeader>
          {litters?.length ? (
            <UpcomingLitterInquiryForm
              litters={litters}
              initialLitterId={reserveLitter?.id ?? null}
              initialPlaceholderId={reservePlaceholderId}
              onSubmit={handleInquirySubmit}
              isSubmitting={reserveSubmitting}
              submitLabel={t("upcomingFormSubmit")}
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
