import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase, type UpcomingLitter } from "@/lib/supabase";
import { Calendar, DollarSign, Loader2, MessageCircle, CreditCard } from "lucide-react";

const DEPOSIT_POLICY = "Deposits are honored in the order received. First deposit gets first pick.";

async function fetchActiveUpcomingLitters(): Promise<UpcomingLitter[]> {
  const { data, error } = await supabase
    .from("upcoming_litters")
    .select("id, breed, due_label, price_label, deposit_amount, description, placeholder_image_path, deposit_link")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as UpcomingLitter[];
}

function getPlaceholderImageUrl(path: string | null | undefined): string {
  const { data } = supabase.storage
    .from("puppy-photos")
    .getPublicUrl(path ?? "puppy-placeholder/default.png");
  return data.publicUrl;
}

export default function UpcomingLitters() {
  const { data: litters, isLoading, error } = useQuery({
    queryKey: ["upcoming-litters-public"],
    queryFn: fetchActiveUpcomingLitters,
  });

  return (
    <Layout>
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
            <Link to="/contact" className="text-primary underline">
              contact us
            </Link>{" "}
            to be notified.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {litters.map((litter) => {
              const imageUrl = getPlaceholderImageUrl(litter.placeholder_image_path);
              const contactUrl = `/contact?litter=${litter.id}`;
              const depositUrl = litter.deposit_link?.trim() || `/contact?subject=Deposit&litter=${litter.id}`;
              return (
                <Card key={litter.id} className="overflow-hidden flex flex-col">
                  <div className="relative aspect-[4/3] bg-muted">
                    <img
                      src={imageUrl}
                      alt={litter.breed}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.png";
                      }}
                    />
                    <Badge className="absolute top-3 left-3" variant="secondary">
                      Upcoming litter
                    </Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-2xl">{litter.breed}</CardTitle>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {litter.due_label}
                    </p>
                    {litter.price_label && (
                      <p className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        {litter.price_label}
                      </p>
                    )}
                    {litter.deposit_amount != null && litter.deposit_amount > 0 && (
                      <p className="text-sm">
                        Deposit: ${litter.deposit_amount}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1">
                    {litter.description && (
                      <p className="text-sm text-muted-foreground">{litter.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-3">{DEPOSIT_POLICY}</p>
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2">
                    <Button asChild variant="default" className="flex-1 min-w-[120px]">
                      <a href={depositUrl}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Place deposit
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="flex-1 min-w-[120px]">
                      <Link to={contactUrl}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Contact us
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </Layout>
  );
}
