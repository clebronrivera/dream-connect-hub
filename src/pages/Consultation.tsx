import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, Video, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { ConsultationType, SourcePage, IntakePayload } from "@/lib/supabase";

const steps = [
  { icon: ClipboardList, title: "Complete Intake", description: "Fill out the short form for your consultation type." },
  { icon: Video, title: "30-Minute Session", description: "We'll contact you to schedule a virtual one-on-one session." },
  { icon: FileText, title: "Receive Plan", description: "Get a personalized recommendation plan tailored to your needs." },
];

const STARTER_HELP_TOPICS = [
  "Feeding schedule and food choice",
  "Potty training schedule",
  "Crate training and sleep routine",
  "Grooming and hygiene",
  "Breed-specific needs",
  "Supplies and home setup",
  "Basic obedience and house rules",
  "Other",
];

const BEHAVIOR_CONCERNS = [
  "Aggression",
  "Anxiety",
  "Barking/Excessive noise",
  "Chewing/Destructive behavior",
  "House training",
  "Jumping on people",
  "Leash pulling",
  "Separation anxiety",
  "Socialization",
  "Other",
];

type IntakeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ConsultationType;
  sourcePage: SourcePage;
  title: string;
  submitLabel: string;
};

function ConsultationIntakeDialog({ open, onOpenChange, type, sourcePage, title, submitLabel }: IntakeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [starterTopics, setStarterTopics] = useState<string[]>([]);
  const [behaviorChecklist, setBehaviorChecklist] = useState<string[]>([]);
  const [purchasedFromPuppyHeaven, setPurchasedFromPuppyHeaven] = useState<boolean | null>(null);
  const { toast } = useToast();

  const toggleList = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((c) => c !== item) : [...list, item]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = (formData.get("phone") as string) || undefined;
    const preferred_contact = (formData.get("preferred_contact") as string) || undefined;

    let intake_payload: Record<string, unknown> = {};
    let pet_name: string | undefined;
    let pet_type: string | undefined;
    let purchased_from_puppy_heaven = false;
    let purchase_date_approx: string | undefined;
    let puppy_name_at_purchase: string | undefined;
    let breed_at_purchase: string | undefined;
    let phone_at_purchase: string | undefined;

    if (type === "starter") {
      pet_name = (formData.get("pet_name") as string) || undefined;
      pet_type = (formData.get("pet_type") as string) || undefined;
      intake_payload = {
        help_topics: starterTopics,
        notes: (formData.get("notes") as string) || undefined,
      };
      if (purchasedFromPuppyHeaven) {
        purchased_from_puppy_heaven = true;
        purchase_date_approx = (formData.get("purchase_date_approx") as string) || undefined;
        puppy_name_at_purchase = (formData.get("puppy_name_at_purchase") as string) || undefined;
        breed_at_purchase = (formData.get("breed_at_purchase") as string) || undefined;
        phone_at_purchase = (formData.get("phone_at_purchase") as string) || undefined;
      }
    } else if (type === "readiness") {
      intake_payload = {
        why_now: (formData.get("why_now") as string) || undefined,
        primary_caregiver: (formData.get("primary_caregiver") as string) || undefined,
        weekday_schedule: (formData.get("weekday_schedule") as string) || undefined,
        budget_upfront: (formData.get("budget_upfront") as string) || undefined,
        budget_monthly: (formData.get("budget_monthly") as string) || undefined,
        preferred_breed_size: (formData.get("preferred_breed_size") as string) || undefined,
        other_pets_kids: (formData.get("other_pets_kids") as string) || undefined,
      };
    } else if (type === "behavior") {
      const primary = (formData.get("primary_issue") as string) || undefined;
      const secondary = (formData.get("secondary_issue") as string) || undefined;
      const context_notes = (formData.get("context_notes") as string) || undefined;
      pet_name = (formData.get("pet_name") as string) || undefined;
      pet_type = (formData.get("pet_type") as string) || undefined;
      intake_payload = {
        primary_issue: primary,
        secondary_issue: secondary,
        issues_checklist: behaviorChecklist.length > 0 ? behaviorChecklist : undefined,
        context_notes,
      };
    }

    const row = {
      status: "active",
      consultation_type: type,
      source_page: sourcePage,
      name,
      email,
      phone,
      preferred_contact,
      pet_name,
      pet_type,
      purchased_from_puppy_heaven,
      purchase_date_approx,
      puppy_name_at_purchase,
      breed_at_purchase,
      phone_at_purchase,
      intake_payload,
    };

    try {
      const { error } = await supabase.from("consultation_requests").insert([row]);
      if (error) throw error;
      toast({ title: "Intake Submitted!", description: "We'll contact you soon to schedule your session." });
      onOpenChange(false);
      setStarterTopics([]);
      setBehaviorChecklist([]);
      setPurchasedFromPuppyHeaven(null);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Please fill out this form. We'll contact you to schedule.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact info (all types) */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Your Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name *</Label>
                <Input id="name" name="name" placeholder="John Doe" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" placeholder="your@email.com" required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" placeholder="(123) 456-7890" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred_contact">Preferred Contact Method</Label>
                <Select name="preferred_contact">
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="either">Either</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Starter: Puppy Heaven discount + help topics + optional pet */}
          {type === "starter" && (
            <>
              <div className="space-y-4">
                <Label>Did you purchase your puppy from Puppy Heaven?</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="ph" checked={purchasedFromPuppyHeaven === true} onChange={() => setPurchasedFromPuppyHeaven(true)} />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="ph" checked={purchasedFromPuppyHeaven === false} onChange={() => setPurchasedFromPuppyHeaven(false)} />
                    No
                  </label>
                </div>
                {purchasedFromPuppyHeaven && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border p-4 bg-muted/30">
                    <div className="space-y-2">
                      <Label htmlFor="purchase_date_approx">Date of purchase (or transaction date) *</Label>
                      <Input id="purchase_date_approx" name="purchase_date_approx" placeholder="e.g. Jan 2025" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="puppy_name_at_purchase">Which puppy (name or unknown)</Label>
                      <Input id="puppy_name_at_purchase" name="puppy_name_at_purchase" placeholder="Puppy name or unknown" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="breed_at_purchase">Breed</Label>
                      <Input id="breed_at_purchase" name="breed_at_purchase" placeholder="Breed" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone_at_purchase">Phone number used at purchase (optional)</Label>
                      <Input id="phone_at_purchase" name="phone_at_purchase" type="tel" placeholder="(123) 456-7890" />
                    </div>
                    <p className="text-sm text-muted-foreground sm:col-span-2">
                      Discount is confirmed after we verify your purchase. We will confirm the discounted price when we schedule your session.
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <Label>Pet Information (optional)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pet_name">Pet Name</Label>
                    <Input id="pet_name" name="pet_name" placeholder="Buddy" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pet_type">Pet Type</Label>
                    <Select name="pet_type">
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dog">Dog</SelectItem>
                        <SelectItem value="cat">Cat</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <Label>What do you want help with? (select all that apply)</Label>
                <div className="grid grid-cols-2 gap-3">
                  {STARTER_HELP_TOPICS.map((topic) => (
                    <div key={topic} className="flex items-center space-x-2">
                      <Checkbox
                        id={`topic-${topic}`}
                        checked={starterTopics.includes(topic)}
                        onCheckedChange={() => toggleList(starterTopics, setStarterTopics, topic)}
                      />
                      <Label htmlFor={`topic-${topic}`} className="text-sm font-normal cursor-pointer">{topic}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Additional notes</Label>
                <Textarea id="notes" name="notes" placeholder="Anything else we should know?" rows={3} />
              </div>
            </>
          )}

          {/* Readiness */}
          {type === "readiness" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="why_now">Why are you considering a puppy right now?</Label>
                <Textarea id="why_now" name="why_now" placeholder="Your answer" rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary_caregiver">Who will be the primary caregiver?</Label>
                <Input id="primary_caregiver" name="primary_caregiver" placeholder="e.g. Me, or shared with my partner" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weekday_schedule">Typical weekday schedule</Label>
                <Textarea id="weekday_schedule" name="weekday_schedule" placeholder="Work from home, office hours, etc." rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget_upfront">Budget range (upfront costs)</Label>
                  <Input id="budget_upfront" name="budget_upfront" placeholder="e.g. $500–1000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget_monthly">Budget range (monthly)</Label>
                  <Input id="budget_monthly" name="budget_monthly" placeholder="e.g. $100–200" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred_breed_size">Preferred breed/size and why</Label>
                <Textarea id="preferred_breed_size" name="preferred_breed_size" placeholder="e.g. Medium breed, good with kids" rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="other_pets_kids">Do you have other pets or young children?</Label>
                <Textarea id="other_pets_kids" name="other_pets_kids" placeholder="Tell us about your household" rows={2} />
              </div>
            </>
          )}

          {/* Behavior: pet + primary/secondary issue + checklist */}
          {type === "behavior" && (
            <>
              <div className="space-y-4">
                <Label>Pet Information</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pet_name">Pet Name *</Label>
                    <Input id="pet_name" name="pet_name" placeholder="Buddy" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pet_type">Pet Type *</Label>
                    <Select name="pet_type" required>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dog">Dog</SelectItem>
                        <SelectItem value="cat">Cat</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary_issue">What is the one behavior you want to fix first? (the one that happens most or affects you most) *</Label>
                <Select name="primary_issue" required>
                  <SelectTrigger><SelectValue placeholder="Select primary issue" /></SelectTrigger>
                  <SelectContent>
                    {BEHAVIOR_CONCERNS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary_issue">Secondary issue (optional)</Label>
                <Select name="secondary_issue">
                  <SelectTrigger><SelectValue placeholder="Select optional second issue" /></SelectTrigger>
                  <SelectContent>
                    {BEHAVIOR_CONCERNS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <Label>Other concerns (select all that apply)</Label>
                <div className="grid grid-cols-2 gap-3">
                  {BEHAVIOR_CONCERNS.map((concern) => (
                    <div key={concern} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bh-${concern}`}
                        checked={behaviorChecklist.includes(concern)}
                        onCheckedChange={() => toggleList(behaviorChecklist, setBehaviorChecklist, concern)}
                      />
                      <Label htmlFor={`bh-${concern}`} className="text-sm font-normal cursor-pointer">{concern}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="context_notes">Context or notes</Label>
                <Textarea id="context_notes" name="context_notes" placeholder="When it started, what you've tried, etc." rows={3} />
              </div>
            </>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Consultation() {
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [intakeType, setIntakeType] = useState<ConsultationType>("starter");
  const [intakeSource, setIntakeSource] = useState<SourcePage>("consultation_pricing_card_starter");
  const [intakeTitle, setIntakeTitle] = useState("");
  const [intakeSubmitLabel, setIntakeSubmitLabel] = useState("");

  const openIntake = (type: ConsultationType, sourcePage: SourcePage, title: string, submitLabel: string) => {
    setIntakeType(type);
    setIntakeSource(sourcePage);
    setIntakeTitle(title);
    setIntakeSubmitLabel(submitLabel);
    setIntakeOpen(true);
  };

  return (
    <Layout>
      <section className="bg-primary py-16">
        <div className="container text-center">
          <Video className="h-12 w-12 mx-auto mb-4 text-primary-foreground" />
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">Virtual Pet Consultation</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Get expert guidance on pet behavior, training, and care. We'll contact you to schedule after you submit an intake.
          </p>
        </div>
      </section>

      <section className="container py-12">
        <h2 className="text-3xl font-bold text-center text-foreground mb-10">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <step.icon className="h-8 w-8 text-primary" />
              </div>
              <div className="text-2xl font-bold text-primary mb-2">Step {index + 1}</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Four cards */}
      <section className="bg-muted/30 py-12">
        <div className="container">
          <h2 className="text-3xl font-bold text-center text-foreground mb-10">Services & Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {/* A) Starter */}
            <Card className="border-2 border-primary relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl-lg">Popular</div>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">Puppy Starter Consultation</CardTitle>
                <CardDescription>New puppy setup and first week plan</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-foreground mb-1">$50</div>
                <p className="text-sm text-muted-foreground mb-2">per 30 minutes</p>
                <p className="text-xs text-primary mb-4">Puppy Heaven customers get $20 off (pay $30). All are welcome.</p>
                <Button size="lg" className="w-full" onClick={() => openIntake("starter", "consultation_pricing_card_starter", "Puppy Starter Intake", "Submit Starter Intake")}>
                  Start Puppy Starter Intake
                </Button>
              </CardContent>
            </Card>

            {/* B) Readiness */}
            <Card>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">Ready for a Puppy? Session</CardTitle>
                <CardDescription>A quick reality check before you buy or adopt</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-foreground mb-1">$50</div>
                <p className="text-sm text-muted-foreground mb-4">per 30 minutes</p>
                <ul className="text-xs text-muted-foreground space-y-1 text-left mb-4">
                  <li>• Lifestyle fit</li>
                  <li>• Budget and supply checklist</li>
                  <li>• Breed and size fit</li>
                  <li>• First 30 days plan</li>
                </ul>
                <Button size="lg" variant="outline" className="w-full" onClick={() => openIntake("readiness", "consultation_pricing_card_readiness", "Ready for a Puppy? Intake", "Submit Readiness Intake")}>
                  Start Readiness Intake
                </Button>
              </CardContent>
            </Card>

            {/* C) Behavior */}
            <Card>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">Behavior Problem Consultation</CardTitle>
                <CardDescription>Focus on one behavior issue</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-foreground mb-4">$50</div>
                <p className="text-sm text-muted-foreground mb-4">per 30 minutes</p>
                <Button size="lg" variant="outline" className="w-full" onClick={() => openIntake("behavior", "consultation_pricing_card_behavior", "Behavior Consultation Intake", "Submit Behavior Intake")}>
                  Start Behavior Intake
                </Button>
              </CardContent>
            </Card>

            {/* D) Other — routes to Contact */}
            <Card>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">Other Consultation Request</CardTitle>
                <CardDescription>Pet, breeding, or business consultations — we'll get a quote for you</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground mb-4">One-on-one support. Please be as thorough as possible so we can quote accurately.</p>
                <Button size="lg" variant="outline" className="w-full" asChild>
                  <Link to="/contact?subject=other-consultation">Get a Quote / Contact Us</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="container py-12 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Get Started?</h2>
        <p className="text-lg text-muted-foreground mb-6 max-w-xl mx-auto">
          Choose a service above to complete the intake form. We'll contact you to schedule.
        </p>
      </section>

      <section className="container pb-12">
        <div className="bg-muted/50 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground mb-1">Important Disclaimer</h4>
              <p className="text-sm text-muted-foreground">
                Our consultation service is for educational and behavioral guidance only. It does not replace professional veterinary care.
              </p>
            </div>
          </div>
        </div>
      </section>

      <ConsultationIntakeDialog
        open={intakeOpen}
        onOpenChange={setIntakeOpen}
        type={intakeType}
        sourcePage={intakeSource}
        title={intakeTitle}
        submitLabel={intakeSubmitLabel}
      />
    </Layout>
  );
}
