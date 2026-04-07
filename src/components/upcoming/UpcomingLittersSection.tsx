import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format, parseISO, isValid } from "date-fns";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

function formatPickupSummary(litter: UpcomingLitter): string {
  const w = getGoHomeWindow(litter.breeding_date);
  if (!w) return "—";
  return `${format(w.earliest, "MMM d")} – ${format(w.latest, "MMM d")}`;
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
        <div className="mb-8 text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">{t("upcomingHeroTitle")}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            {t("upcomingHeroDescription")}
          </p>
          <Button variant="link" asChild className="text-primary">
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
        <div className="space-y-10">
          <p className="text-sm text-muted-foreground border-l-4 border-primary/40 pl-4 py-1">
            {t("upcomingDepositPolicy")}
          </p>

          <div className="space-y-10">
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
                <Card key={litter.id} className="overflow-hidden flex flex-col">
                  <div className="p-4 md:p-6 space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-stretch">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div className="relative rounded-lg overflow-hidden border aspect-[4/3] bg-muted">
                          <img
                            src={damHeroImage}
                            alt={`${litter.dam_name || "Dam"} photo`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = FALLBACK_IMAGE_SRC;
                            }}
                          />
                          <Badge className="absolute bottom-2 left-2" variant="outline">
                            {t("upcomingLabelDam")}
                          </Badge>
                        </div>
                        <div className="relative rounded-lg overflow-hidden border aspect-[4/3] bg-muted">
                          <img
                            src={sireHeroImage}
                            alt={`${litter.sire_name || "Sire"} photo`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = FALLBACK_IMAGE_SRC;
                            }}
                          />
                          <Badge className="absolute bottom-2 left-2" variant="outline">
                            {t("upcomingLabelSire")}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col justify-center space-y-2 min-w-0">
                        <CardTitle className="text-2xl">{displayBreedLabel}</CardTitle>
                        {(damLabel || sireLabel) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            {damLabel && (
                              <p>
                                <span className="font-medium text-muted-foreground">
                                  {t("upcomingTableDam")}:
                                </span>{" "}
                                {damLabel}
                              </p>
                            )}
                            {sireLabel && (
                              <p>
                                <span className="font-medium text-muted-foreground">
                                  {t("upcomingTableSire")}:
                                </span>{" "}
                                {sireLabel}
                              </p>
                            )}
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{t("upcomingOffspringType")}:</span>{" "}
                          {displayBreedLabel}
                        </p>
                        <Badge variant="secondary" className="w-fit">
                          {t("upcomingLitterBadge")}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <div className="h-8 w-px bg-border relative">
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-48 h-px bg-border" />
                      </div>
                    </div>
                    <p className="text-center text-xs text-muted-foreground uppercase tracking-wide">
                      {t("upcomingFamilyTreeCaption")}
                    </p>

                    {placeholders.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {placeholders.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => openReserve(litter, p)}
                            className="text-left rounded-lg border bg-muted/30 hover:bg-muted/60 hover:border-primary/40 transition-colors p-3 space-y-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <UpcomingPuppySilhouette
                              className="w-full aspect-square"
                              title={`${p.sex} ${t("upcomingPlaceholderSlot")} ${p.public_ref_code}`}
                            />
                            <p className="text-xs font-mono font-semibold text-foreground truncate">
                              {p.public_ref_code}
                            </p>
                            <p className="text-xs text-muted-foreground">{p.sex}</p>
                            <p className="text-xs line-clamp-2">{p.offspring_breed_label}</p>
                            <Badge
                              variant={p.lifecycle_status === "born" ? "default" : "outline"}
                              className="text-[10px]"
                            >
                              {p.lifecycle_status === "born"
                                ? t("upcomingStatusBorn")
                                : t("upcomingStatusExpected")}
                            </Badge>
                            {goHomeWindow ? (
                              <p className="text-[10px] text-muted-foreground">
                                {t("upcomingPickupApprox")}: {formatPickupSummary(litter)}
                              </p>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t("upcomingNoPlaceholders")}
                      </p>
                    )}
                  </div>

                  <CardHeader className="pt-0">
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {birthWindow ? (
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          {t("upcomingBirthWindow")}: {format(birthWindow.earliest, "MMM d")} –{" "}
                          {format(birthWindow.latest, "MMM d")}
                        </p>
                      ) : null}
                      {goHomeWindow ? (
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          {t("upcomingGoHomeWindow")}: {format(goHomeWindow.earliest, "MMM d")} –{" "}
                          {format(goHomeWindow.latest, "MMM d")}
                        </p>
                      ) : null}
                      <p>
                        {t("upcomingDepositAmountLabel")}: ${depositAmount}.{" "}
                        {t("upcomingReserveSpotsLabel")}: {litter.deposits_reserved_count ?? 0}{" "}
                        {t("upcomingOf")} {litter.max_deposit_slots ?? 4}.
                      </p>
                      {refundableAmount != null && (
                        <p className="text-sm">
                          {t("upcomingRefundableLabel")}: ${refundableAmount}. {t("upcomingRefundableRest")}
                        </p>
                      )}
                      {refundableAmount == null && (
                        <p className="text-sm italic">{t("upcomingRefundableGeneric")}</p>
                      )}
                    </div>
                  </CardHeader>

                  {(litter.example_puppy_image_paths?.length ?? 0) > 0 && (
                    <CardContent className="pt-0 space-y-2">
                      <p className="text-sm font-medium">{t("upcomingPastPuppies")}</p>
                      <div className="flex gap-2 flex-wrap">
                        {litter.example_puppy_image_paths!.slice(0, 3).map((path, i) => (
                          <img
                            key={path}
                            src={getStoragePublicUrl(path)}
                            alt={`Past puppy ${i + 1}`}
                            className="h-16 w-16 rounded object-cover shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = FALLBACK_IMAGE_SRC;
                            }}
                          />
                        ))}
                      </div>
                    </CardContent>
                  )}

                  <CardFooter>
                    <Button
                      type="button"
                      variant="default"
                      className="w-full"
                      onClick={() => openReserve(litter, null)}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      {JOIN_WAITLIST_AND_INQUIRE_ABOUT_DEPOSIT}
                    </Button>
                  </CardFooter>
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
