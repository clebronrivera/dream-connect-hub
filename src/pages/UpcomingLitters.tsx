import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
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
import { supabase, type UpcomingLitter } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Loader2, UserPlus } from "lucide-react";
import {
  UpcomingLitterInquiryForm,
  type UpcomingLitterInquiryPayload,
} from "@/components/UpcomingLitterInquiryForm";
import {
  formatTimelineDate,
  getBirthWindow,
  getGoHomeWindow,
} from "@/lib/litter-timeline";
import { fetchActiveUpcomingLitters, UPCOMING_LITTERS_ACTIVE_QUERY_KEY } from "@/lib/upcoming-litters";
import { insertContactMessage, upcomingLitterPayloadToRow } from "@/lib/contact-messages";
import { normalizeSupportedLanguage } from "@/i18n";

const DEFAULT_DEPOSIT_AMOUNT = 300;

const FALLBACK_IMAGE_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23e5e7eb' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='18' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3ENo photo%3C/text%3E%3C/svg%3E";

function getDisplayBreed(litter: UpcomingLitter, fallbackLabel: string): string {
  return (litter.display_breed || litter.breed || fallbackLabel).trim() || fallbackLabel;
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
  const value = typeof path === "string" ? path.trim() : "";
  return value || null;
}

export default function UpcomingLitters() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [reserveLitter, setReserveLitter] = useState<UpcomingLitter | null>(null);
  const [reserveSubmitting, setReserveSubmitting] = useState(false);
  const currentLanguage =
    normalizeSupportedLanguage(i18n.resolvedLanguage ?? i18n.language) ?? "en";

  const { data: litters, isLoading, error } = useQuery({
    queryKey: UPCOMING_LITTERS_ACTIVE_QUERY_KEY,
    queryFn: fetchActiveUpcomingLitters,
  });

  const handleInquirySubmit = async (payload: UpcomingLitterInquiryPayload) => {
    setReserveSubmitting(true);
    try {
      const { error: err } = await insertContactMessage(
        upcomingLitterPayloadToRow(payload)
      );
      if (err) throw err;
      toast({
        title: t("upcomingLitters.successTitle"),
        description: t("upcomingLitters.successDescription"),
      });
      setReserveLitter(null);
    } catch (err) {
      toast({
        title: t("upcomingLitters.errorTitle"),
        description: (err as Error).message || t("upcomingLitters.errorDescription"),
        variant: "destructive",
      });
    } finally {
      setReserveSubmitting(false);
    }
  };

  return (
    <Layout>
      <Seo pageId="upcomingLitters" />
      <section className="bg-primary py-16">
        <div className="container text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-primary-foreground" />
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">
            {t("upcomingLitters.hero.title")}
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            {t("upcomingLitters.hero.description")}
          </p>
        </div>
      </section>

      <section className="container py-12">
        {isLoading ? (
          <div className="flex justify-center min-h-[300px] items-center">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center text-destructive py-12">
            {t("upcomingLitters.loadError")}
          </div>
        ) : !litters?.length ? (
          <div className="text-center text-muted-foreground py-12">
            {t("upcomingLitters.empty")}{" "}
            <Link to="/contact?subject=upcoming-litter" className="text-primary underline">
              {t("upcomingLitters.labels.contactUs")}
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
              const displayBreedLabel = getDisplayBreed(
                litter,
                t("upcomingLitters.labels.upcomingLitter")
              );

              return (
                <Card key={litter.id} className="overflow-hidden flex flex-col">
                  <div className="relative aspect-[4/3] bg-muted grid grid-cols-2">
                    <div className="relative h-full">
                      <img
                        src={damHeroImage}
                        alt={`${litter.dam_name || t("upcomingLitters.labels.dam")} photo`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_IMAGE_SRC;
                        }}
                      />
                      <Badge className="absolute bottom-3 left-3" variant="outline">
                        {t("upcomingLitters.labels.dam")}
                      </Badge>
                    </div>
                    <div className="relative h-full">
                      <img
                        src={sireHeroImage}
                        alt={`${litter.sire_name || t("upcomingLitters.labels.sire")} photo`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_IMAGE_SRC;
                        }}
                      />
                      <Badge className="absolute bottom-3 left-3" variant="outline">
                        {t("upcomingLitters.labels.sire")}
                      </Badge>
                    </div>
                    <Badge className="absolute top-3 left-3" variant="secondary">
                      {t("upcomingLitters.labels.upcomingLitter")}
                    </Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-2xl">{displayBreedLabel}</CardTitle>
                    {(litter.dam_name || litter.dam_breed || litter.sire_name || litter.sire_breed) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {damLabel && (
                          <p className="text-sm">
                            <span className="font-medium text-muted-foreground">
                              {t("upcomingLitters.labels.dam")}:
                            </span>{" "}
                            {damLabel}
                          </p>
                        )}
                        {sireLabel && (
                          <p className="text-sm">
                            <span className="font-medium text-muted-foreground">
                              {t("upcomingLitters.labels.sire")}:
                            </span>{" "}
                            {sireLabel}
                          </p>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">
                      <span className="font-medium">{t("upcomingLitters.labels.breed")}:</span>{" "}
                      {displayBreedLabel}
                    </p>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {birthWindow ? (
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          {t("upcomingLitters.labels.dueWindow", {
                            value: `${formatTimelineDate(birthWindow.earliest, currentLanguage)} – ${formatTimelineDate(
                              birthWindow.latest,
                              currentLanguage
                            )}`,
                          })}
                        </p>
                      ) : null}
                      {goHomeWindow ? (
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          {t("upcomingLitters.labels.goHomeWindow", {
                            value: `${formatTimelineDate(goHomeWindow.earliest, currentLanguage)} – ${formatTimelineDate(
                              goHomeWindow.latest,
                              currentLanguage
                            )}`,
                          })}
                        </p>
                      ) : null}
                      <p>{t("upcomingLitters.labels.depositAmount", { amount: depositAmount })}</p>
                      {refundableAmount != null ? (
                        <p className="text-sm text-muted-foreground">
                          {t("upcomingLitters.labels.refundableDeposit", {
                            amount: refundableAmount,
                          })}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          {t("upcomingLitters.labels.refundableOnly")}
                        </p>
                      )}
                    </div>
                    {(litter.example_puppy_image_paths?.length ?? 0) > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">
                          {t("upcomingLitters.labels.pastPuppies")}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {litter.example_puppy_image_paths!.slice(0, 3).map((path, index) => (
                            <img
                              key={path}
                              src={getStoragePublicUrl(path)}
                              alt={`${t("upcomingLitters.labels.pastPuppies")} ${index + 1}`}
                              className="h-16 w-16 rounded object-cover flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = FALLBACK_IMAGE_SRC;
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="button"
                      variant="default"
                      className="w-full"
                      onClick={() => setReserveLitter(litter)}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      {t("upcomingLitters.waitlistCta")}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex justify-center mt-12 pb-8">
          <Button asChild size="lg">
            <Link to="/contact?subject=upcoming-litter">
              {t("upcomingLitters.labels.contactUs")}
            </Link>
          </Button>
        </div>
      </section>

      <Dialog open={!!reserveLitter} onOpenChange={(open) => !open && setReserveLitter(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("upcomingLitters.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("forms.upcomingLitter.description")}
            </DialogDescription>
          </DialogHeader>
          <UpcomingLitterInquiryForm
            litters={litters ?? []}
            initialLitterId={reserveLitter?.id ?? null}
            onSubmit={handleInquirySubmit}
            isSubmitting={reserveSubmitting}
            submitLabel={t("upcomingLitters.waitlistCta")}
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
