import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dog, Heart, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase, Puppy } from "@/lib/supabase";

// Fetch only Available puppies for public list (ignore Pending/Reserved in public logic)
async function fetchPuppies(): Promise<Puppy[]> {
  const { data, error } = await supabase
    .from('puppies')
    .select('*')
    .eq('status', 'Available')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching puppies from Supabase:', error);
    throw new Error(`Failed to load puppies: ${error.message}`);
  }

  return data || [];
}

const TIMELINE_OPTIONS = [
  { value: "asap", label: "ASAP" },
  { value: "1-2-weeks", label: "1 to 2 weeks" },
  { value: "3-4-weeks", label: "3 to 4 weeks" },
  { value: "1-2-months", label: "1 to 2 months" },
  { value: "browsing", label: "Just browsing" },
];

const EXPERIENCE_OPTIONS = [
  { value: "first", label: "First puppy" },
  { value: "some", label: "Some experience" },
  { value: "experienced", label: "Experienced owner" },
];

function PuppyInterestForm({
  open,
  onOpenChange,
  puppies,
  initialPuppyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  puppies: Puppy[];
  initialPuppyId?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interestedSpecific, setInterestedSpecific] = useState<"yes" | "no">(initialPuppyId ? "yes" : "no");
  const [selectedPuppyId, setSelectedPuppyId] = useState(initialPuppyId || "");
  const { toast } = useToast();

  const selectedPuppy = puppies.find((p) => p.id === selectedPuppyId || String(p.id) === selectedPuppyId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = (formData.get("phone") as string) || undefined;
    const city = formData.get("city") as string;
    const state = formData.get("state") as string;
    const timeline = formData.get("timeline") as string;
    const experience = (formData.get("experience") as string) || undefined;
    const household_description = (formData.get("household_description") as string) || undefined;
    const additional_comments = (formData.get("additional_comments") as string) || undefined;

    let puppy_id: string | null = null;
    let needs_followup = false;
    let puppy_name_at_submit: string | undefined;
    let puppy_status_at_submit: string | undefined;
    let preferences: Record<string, unknown> | undefined;

    if (interestedSpecific === "yes") {
      if (!selectedPuppyId) {
        toast({ title: "Please select a puppy", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      puppy_id = selectedPuppyId;
      const { data: puppyRow } = await supabase.from("puppies").select("id, name, status").eq("id", selectedPuppyId).single();
      if (puppyRow && puppyRow.status !== "Available") {
        needs_followup = true;
        puppy_name_at_submit = puppyRow.name ?? undefined;
        puppy_status_at_submit = puppyRow.status ?? undefined;
      }
    } else {
      preferences = {
        type_size: formData.get("pref_type_size") || undefined,
        breed: formData.get("pref_breed") || undefined,
        color: formData.get("pref_color") || undefined,
        gender: formData.get("pref_gender") || undefined,
      };
    }

    const row = {
      status: "active",
      name,
      email,
      phone,
      city,
      state,
      interested_specific: interestedSpecific === "yes",
      puppy_id,
      puppy_name: selectedPuppy?.name,
      timeline,
      experience,
      household_description,
      preferences,
      additional_comments,
      needs_followup,
      puppy_name_at_submit,
      puppy_status_at_submit,
    };

    try {
      const { error } = await supabase.from("puppy_inquiries").insert([row]);
      if (error) throw error;
      toast({ title: "Interest Received!", description: "We'll get back to you soon." });
      onOpenChange(false);
      setSelectedPuppyId(initialPuppyId || "");
      setInterestedSpecific(initialPuppyId ? "yes" : "no");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to submit. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Puppy Interest Form</DialogTitle>
          <DialogDescription>Fill this out and we will get back to you.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pi-name">Your Name *</Label>
              <Input id="pi-name" name="name" placeholder="Your name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pi-email">Email *</Label>
              <Input id="pi-email" name="email" type="email" placeholder="your@email.com" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pi-phone">Phone</Label>
            <Input id="pi-phone" name="phone" type="tel" placeholder="(123) 456-7890" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pi-city">City *</Label>
              <Input id="pi-city" name="city" placeholder="City" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pi-state">State *</Label>
              <Input id="pi-state" name="state" placeholder="State" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Are you interested in a specific puppy? *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="specific" checked={interestedSpecific === "yes"} onChange={() => setInterestedSpecific("yes")} />
                Yes (select puppy)
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="specific" checked={interestedSpecific === "no"} onChange={() => setInterestedSpecific("no")} />
                Not sure yet (I want recommendations)
              </label>
            </div>
          </div>

          {interestedSpecific === "yes" && (
            <div className="space-y-2">
              <Label>Select Puppy *</Label>
              <Select value={selectedPuppyId} onValueChange={setSelectedPuppyId} required>
                <SelectTrigger><SelectValue placeholder="Choose a puppy" /></SelectTrigger>
                <SelectContent>
                  {puppies.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name || "Unnamed"} — {p.breed}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPuppy && (
                <p className="text-sm text-muted-foreground">
                  {selectedPuppy.breed} • {selectedPuppy.gender || "—"} • {selectedPuppy.color || "—"} • {selectedPuppy.age_weeks ? `${selectedPuppy.age_weeks} weeks` : selectedPuppy.date_of_birth || "—"}
                </p>
              )}
            </div>
          )}

          {interestedSpecific === "no" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pref_type_size">Type/Size Preference</Label>
                <Input id="pref_type_size" name="pref_type_size" placeholder="e.g. Medium" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pref_breed">Breed Preference</Label>
                <Input id="pref_breed" name="pref_breed" placeholder="e.g. Golden Retriever" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pref_color">Color Preference</Label>
                <Input id="pref_color" name="pref_color" placeholder="e.g. Golden" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pref_gender">Gender Preference</Label>
                <Select name="pref_gender">
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="any">Any</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pi-timeline">When are you looking to bring a puppy home? *</Label>
            <Select name="timeline" required>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {TIMELINE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pi-experience">Do you have puppy experience?</Label>
            <Select name="experience">
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {EXPERIENCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pi-household">Tell us about your household</Label>
            <Textarea id="pi-household" name="household_description" placeholder="Kids, other pets, work schedule, activity level" rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pi-comments">Additional Questions or Comments</Label>
            <Textarea id="pi-comments" name="additional_comments" rows={2} />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : "Send My Interest!"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Required fields marked *. We respect your privacy and will never share your information.</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Puppies() {
  const [interestFormOpen, setInterestFormOpen] = useState(false);
  const [interestFormPuppyId, setInterestFormPuppyId] = useState<string | undefined>(undefined);

  const { data: puppies, isLoading, isError, error } = useQuery({
    queryKey: ['puppies'],
    queryFn: fetchPuppies,
    retry: 2,
  });

  const openInterestForm = (puppyId?: string) => {
    setInterestFormPuppyId(puppyId);
    setInterestFormOpen(true);
  };

  const getPuppyImage = (puppy: Puppy) => {
    if (puppy.primary_photo) {
      return puppy.primary_photo;
    }
    if (puppy.photos && puppy.photos.length > 0) {
      return puppy.photos[0];
    }
    return null;
  };

  const getDisplayPrice = (puppy: Puppy) => {
    if (puppy.final_price) {
      return puppy.final_price;
    }
    if (puppy.base_price) {
      return puppy.base_price;
    }
    return null;
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-primary py-16">
        <div className="container text-center">
          <Dog className="h-12 w-12 mx-auto mb-4 text-primary-foreground" />
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">Available Puppies</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Find your perfect furry companion. All our puppies are health-checked, vaccinated, and raised with love.
          </p>
        </div>
      </section>

      {/* Puppies Grid */}
      <section className="container py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading puppies...</span>
          </div>
        ) : isError ? (
          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Unable to load puppies at this time. Please try again later or contact us directly.
            </p>
            {import.meta.env.DEV && error && error instanceof Error && (
              <p className="text-xs text-muted-foreground mb-4 font-mono break-all">
                Error: {error.message}
              </p>
            )}
            <Button asChild>
              <a href="/contact">Contact Us</a>
            </Button>
          </div>
        ) : puppies && puppies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {puppies.map((puppy) => {
              const imageUrl = getPuppyImage(puppy);
              const price = getDisplayPrice(puppy);
              const status = puppy.status || 'Unknown';
              const isAvailable = status === 'Available';

              return (
                <Card key={puppy.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Puppy Image */}
                  {imageUrl ? (
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img 
                        src={imageUrl} 
                        alt={puppy.name || 'Puppy'} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      <Dog className="h-24 w-24 text-muted-foreground/50" />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{puppy.name || 'Unnamed'}</CardTitle>
                      <span 
                        className={`text-xs px-2 py-1 rounded-full ${
                          isAvailable
                            ? "bg-primary/10 text-primary" 
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                    <CardDescription>
                      {puppy.breed || 'Unknown Breed'}
                      {puppy.gender && ` • ${puppy.gender}`}
                      {puppy.age_weeks && ` • ${puppy.age_weeks} weeks`}
                    </CardDescription>
                    {puppy.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {puppy.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      {price ? (
                        <span className="text-2xl font-bold text-foreground">
                          ${price.toLocaleString()}
                          {puppy.discount_active && puppy.discount_amount && (
                            <span className="text-sm text-muted-foreground line-through ml-2">
                              ${(price + puppy.discount_amount).toLocaleString()}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Price on request</span>
                      )}
                      <Button onClick={() => openInterestForm(puppy.id)}>
                        <Heart className="h-4 w-4 mr-2" />
                        Send Interest
                      </Button>
                    </div>
                    {puppy.discount_note && (
                      <p className="text-xs text-primary mt-2">{puppy.discount_note}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              No puppies available at this time. Check back soon!
            </p>
            <Button variant="outline" onClick={() => openInterestForm()}>
              <Heart className="h-4 w-4 mr-2" />
              Send Interest (get recommendations)
            </Button>
          </div>
        )}

        <PuppyInterestForm
          open={interestFormOpen}
          onOpenChange={setInterestFormOpen}
          puppies={puppies || []}
          initialPuppyId={interestFormPuppyId}
        />
      </section>
    </Layout>
  );
}
