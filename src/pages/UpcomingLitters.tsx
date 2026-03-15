import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format, parseISO, isValid } from "date-fns";
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
import { JOIN_WAITLIST_AND_INQUIRE_ABOUT_DEPOSIT } from "@/lib/inquiry-subjects";
import { getBirthWindow, getGoHomeWindow } from "@/lib/litter-timeline";
import { fetchActiveUpcomingLitters, UPCOMING_LITTERS_ACTIVE_QUERY_KEY } from "@/lib/upcoming-litters";
import { insertContactMessage, upcomingLitterPayloadToRow } from "@/lib/contact-messages";

const DEFAULT_DEPOSIT_AMOUNT = 300;

/** Single breed shown for the litter (display_breed; fallback to breed or generic). */
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

export default function UpcomingLitters() {
  const { toast } = useToast();
  const [reserveLitter, setReserveLitter] = useState<UpcomingLitter | null>(null);
  const [reserveSubmitting, setReserveSubmitting] = useState(false);

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
        title: "Submitted",
        description: "We'll be in touch about the waitlist and deposit options.",
      });
      setReserveLitter(null);
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
    <Layout>
      <Seo pageId="upcomingLitters" />
      <section className="bg-primary py-16">
        <div className="container text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-primary-foreground" />
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">Upcoming Litters</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Reserve your pick from our upcoming litters. Place a deposit to secure your spot in line.
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
            Unable to load upcoming litters. Please try again later.
          </div>
        ) : !litters?.length ? (
          <div className="text-center text-muted-foreground py-12">
            No upcoming litters at the moment. Check back soon or{" "}
            <Link to="/contact?subject=upcoming-litter" className="text-primary underline">
              contact us
            </Link>{" "}
            to be notified.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {litters.map((litter) => {
              const imageUrl = getPlaceholderImageUrl(litter.placeholder_image_path);
              // Prefer breeding dog's photo (single source of truth), fallback to litter's stored path
              const damPhotoPath = litter.dam?.photo_path ?? litter.dam_photo_path;
              const sirePhotoPath = litter.sire?.photo_path ?? litter.sire_photo_path;
              const damHeroImage = damPhotoPath ? getStoragePublicUrl(damPhotoPath) : imageUrl;
              const sireHeroImage = sirePhotoPath ? getStoragePublicUrl(sirePhotoPath) : imageUrl;
              const damLabel = [litter.dam_name, litter.dam_breed].filter(Boolean).join(" • ");
              const sireLabel = [litter.sire_name, litter.sire_breed].filter(Boolean).join(" • ");
              const birthWindow = getBirthWindow(litter.breeding_date);
              const goHomeWindow = getGoHomeWindow(litter.breeding_date);
              const depositAmount = litter.deposit_amount != null && litter.deposit_amount > 0 ? litter.deposit_amount : DEFAULT_DEPOSIT_AMOUNT;
              const displayBreedLabel = getDisplayBreed(litter);
              const hasBreedingDate = litter.breeding_date?.trim();
              let breedingDateFormatted: string | null = null;
              if (hasBreedingDate) {
                try {
                  const d = parseISO(litter.breeding_date!);
                  if (isValid(d)) breedingDateFormatted = format(d, 'MMM d, yyyy');
                } catch {
                  breedingDateFormatted = litter.breeding_date!;
                }
              }
              return (
                <Card key={litter.id} className="overflow-hidden flex flex-col">
                  <div className="relative aspect-[4/3] bg-muted grid grid-cols-2">
                    <div className="relative h-full">
                      <img
                        src={damHeroImage}
                        alt={`${litter.dam_name || "Dam"} photo`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                      <Badge className="absolute bottom-3 left-3" variant="outline">
                        Dam
                      </Badge>
                    </div>
                    <div className="relative h-full">
                      <img
                        src={sireHeroImage}
                        alt={`${litter.sire_name || "Sire"} photo`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                      <Badge className="absolute bottom-3 left-3" variant="outline">
                        Sire
                      </Badge>
                    </div>
                    <Badge className="absolute top-3 left-3" variant="secondary">
                      Upcoming litter
                    </Badge>
                  </div>
                  <CardHeader>
                    {breedingDateFormatted && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        Breeding: {breedingDateFormatted}
                      </p>
                    )}
                    <CardTitle className="text-2xl">{displayBreedLabel}</CardTitle>
                    {(litter.dam_name || litter.dam_breed || litter.sire_name || litter.sire_breed) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {damLabel && (
                          <p className="text-sm">
                            <span className="font-medium text-muted-foreground">Dam:</span>{" "}
                            {damLabel}
                          </p>
                        )}
                        {sireLabel && (
                          <p className="text-sm">
                            <span className="font-medium text-muted-foreground">Sire:</span>{" "}
                            {sireLabel}
                          </p>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">
                      <span className="font-medium">Breed:</span> {displayBreedLabel}
                    </p>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {birthWindow ? (
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          Estimated due (birth) window: {format(birthWindow.earliest, 'MMM d')} – {format(birthWindow.latest, 'MMM d')} (approx.)
                        </p>
                      ) : null}
                      {goHomeWindow ? (
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          Estimated go-home window: {format(goHomeWindow.earliest, 'MMM d')} – {format(goHomeWindow.latest, 'MMM d')} (8 weeks after due, approx.)
                        </p>
                      ) : null}
                      <p>Deposit amount: ${depositAmount}.</p>
                    </div>
                    {(litter.example_puppy_image_paths?.length ?? 0) > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {litter.example_puppy_image_paths!.slice(0, 3).map((path, i) => (
                          <img
                            key={path}
                            src={getStoragePublicUrl(path)}
                            alt={`Example puppy ${i + 1}`}
                            className="h-16 w-16 rounded object-cover flex-shrink-0"
                          />
                        ))}
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
                      {JOIN_WAITLIST_AND_INQUIRE_ABOUT_DEPOSIT}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex justify-center mt-12 pb-8">
          <Button asChild size="lg">
            <Link to="/contact?subject=upcoming-litter">Contact us</Link>
          </Button>
        </div>

        <Dialog open={!!reserveLitter} onOpenChange={(open) => !open && setReserveLitter(null)}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{JOIN_WAITLIST_AND_INQUIRE_ABOUT_DEPOSIT}</DialogTitle>
              <DialogDescription>
                {reserveLitter
                  ? `Enter your details for the ${getDisplayBreed(reserveLitter)} litter. We'll follow up about the waitlist and deposit options.`
                  : "Enter your details and we'll follow up about the waitlist and deposit options."}
              </DialogDescription>
            </DialogHeader>
            {litters?.length ? (
              <UpcomingLitterInquiryForm
                litters={litters}
                initialLitterId={reserveLitter?.id ?? null}
                onSubmit={handleInquirySubmit}
                isSubmitting={reserveSubmitting}
                submitLabel="Submit"
              />
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </section>
    </Layout>
  );
}
