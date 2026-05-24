import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, MapPin, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PuppyInterestForm } from "@/components/PuppyInterestForm";
import { UpcomingLitterInquiryForm } from "@/components/UpcomingLitterInquiryForm";
import {
  SUBJECT_UPCOMING_LITTER,
  SUBJECT_PUPPY_INQUIRY,
  SUBJECT_OTHER_CONSULTATION,
} from "@/lib/inquiry-subjects";
import { fetchActiveUpcomingLitters, UPCOMING_LITTERS_ACTIVE_QUERY_KEY } from "@/lib/upcoming-litters";
import {
  insertContactMessage,
  upcomingLitterPayloadToRow,
} from "@/lib/contact-messages";
import { useBusinessInfoOrDefaults } from "@/lib/hooks/useBusinessInfo";
import { StickerButton } from "@/components/redesign/PublicDesignPrimitives";
import { TurnstileWidget } from "@/components/turnstile/TurnstileWidget";
import { fetchAvailablePuppies } from "@/lib/puppies-api";
import { GalacticHomeMiniFooter } from "@/components/home/GalacticHomeMiniFooter";
import { GalacticHomeNav } from "@/components/home/GalacticHomeNav";
import { GalacticPawCanvas } from "@/components/GalacticPawCanvas";

const pageShellClass = "min-h-screen bg-[#0f041b] text-white";
const containerClass = "mx-auto max-w-screen-2xl px-6 md:px-8";
const sectionCardClass = "rounded-3xl border border-white/10 bg-[#12051f]/90 backdrop-blur-xl";
const glossyStickerBaseClass =
  "group relative overflow-hidden rounded-3xl px-8 py-3 text-sm font-bold normal-case tracking-normal before:pointer-events-none before:absolute before:inset-x-3 before:top-1.5 before:h-[48%] before:rounded-full before:bg-white/25 before:blur-md before:content-['']";
const pinkStickerClass =
  `${glossyStickerBaseClass} bg-[#ff3399] text-white shadow-[0_6px_0_#ff66b3,0_14px_30px_rgba(255,102,179,0.45)] hover:bg-[#ff1a8c] hover:shadow-[0_6px_0_#ff85c2,0_16px_34px_rgba(255,133,194,0.5)]`;
const violetStickerClass =
  `${glossyStickerBaseClass} bg-[#5b21b6] text-white shadow-[0_6px_0_#7c3aed,0_14px_30px_rgba(124,58,237,0.45)] hover:bg-[#7c3aed] hover:shadow-[0_6px_0_#a78bfa,0_16px_34px_rgba(167,139,250,0.5)]`;

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as
  | string
  | undefined;
const captchaRequired = Boolean(TURNSTILE_SITE_KEY);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUuid(s: string | null): s is string {
  return !!s && UUID_REGEX.test(s);
}

export default function Contact() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subject, setSubject] = useState("");
  const [upcomingLitterId, setUpcomingLitterId] = useState<string | null>(null);
  const [generalFormToken, setGeneralFormToken] = useState<string | null>(null);
  const businessInfo = useBusinessInfoOrDefaults();

  const smsHref = `sms:+1${businessInfo.phoneRaw}`;
  const telHref = `tel:+1${businessInfo.phoneRaw}`;

  const captchaSatisfiedGeneral =
    !captchaRequired || Boolean(generalFormToken);
  const { data: puppies } = useQuery({
    queryKey: ["puppies"],
    queryFn: fetchAvailablePuppies,
    enabled: subject === SUBJECT_PUPPY_INQUIRY,
  });
  const { data: upcomingLitters } = useQuery({
    queryKey: UPCOMING_LITTERS_ACTIVE_QUERY_KEY,
    queryFn: fetchActiveUpcomingLitters,
    enabled: subject === SUBJECT_UPCOMING_LITTER || !subject,
  });

  // Adjust subject state during render when the URL ?subject= param changes.
  const subjectFromUrl = searchParams.get("subject");
  const [prevSubjectFromUrl, setPrevSubjectFromUrl] = useState(subjectFromUrl);
  if (subjectFromUrl !== prevSubjectFromUrl) {
    setPrevSubjectFromUrl(subjectFromUrl);
    if (subjectFromUrl === SUBJECT_OTHER_CONSULTATION) setSubject(SUBJECT_OTHER_CONSULTATION);
    if (subjectFromUrl === "upcoming-litter" || subjectFromUrl === SUBJECT_UPCOMING_LITTER)
      setSubject(SUBJECT_UPCOMING_LITTER);
  }

  // Preselect litter from ?litter= id when on Upcoming Litter subject (adjust state during render)
  const litterParam = searchParams.get("litter");
  const litterSyncKey = `${litterParam ?? ''}|${upcomingLitters?.length ?? 0}`;
  const [prevLitterSyncKey, setPrevLitterSyncKey] = useState(litterSyncKey);
  if (litterSyncKey !== prevLitterSyncKey) {
    setPrevLitterSyncKey(litterSyncKey);
    if (isValidUuid(litterParam) && upcomingLitters?.length) {
      if (upcomingLitters.some((l) => l.id === litterParam)) {
        setUpcomingLitterId(litterParam);
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const selectedLitter = upcomingLitterId && upcomingLitters?.find((l) => l.id === upcomingLitterId);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string || undefined,
      subject: subject || (formData.get("subject") as string),
      message: formData.get("message") as string,
      upcoming_litter_id: upcomingLitterId || null,
      upcoming_litter_label: selectedLitter ? `${selectedLitter.display_breed || selectedLitter.breed}${selectedLitter.due_label ? `, ${selectedLitter.due_label}` : ''}` : null,
    };

    try {
      const { error } = await insertContactMessage(data, generalFormToken);
      if (error) throw error;

      toast({
        title: "Message Sent!",
        description: "We'll get back to you as soon as possible.",
      });

      (e.target as HTMLFormElement).reset();
      setSubject("");
      setUpcomingLitterId(null);
      setGeneralFormToken(null);
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://puppyheavenllc.com',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Contact',
          item: 'https://puppyheavenllc.com/contact',
        },
      ],
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'breadcrumb-jsonld';
    script.textContent = JSON.stringify(jsonLd);

    document.getElementById('breadcrumb-jsonld')?.remove();
    document.head.appendChild(script);

    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
    };
  }, []);

  return (
    <Layout bare>
      <Seo pageId="contact" />
      <div className={pageShellClass}>
        <GalacticHomeNav />
      {/* Hero Section */}
      <section
        className="relative overflow-hidden border-b border-white/10 py-14 md:py-20"
        style={{
          background: "radial-gradient(circle at 50% 25%, #2a0f3a 0%, #1a0a2e 40%, #0f041b 80%)",
        }}
      >
        <GalacticPawCanvas className="absolute inset-0 z-0 opacity-80" />
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#0f041b]/60 via-transparent to-[#0f041b]/80" />
        <div className={`relative z-20 text-center ${containerClass}`}>
          <Mail className="h-12 w-12 mx-auto mb-4 text-white" />
          <h1 className="mb-4 font-display text-5xl uppercase tracking-tight text-white md:text-7xl">Contact Dream Puppies</h1>
          <p className="mx-auto max-w-2xl text-lg text-white/80 md:text-xl">
            Have questions? We'd love to hear from you. Reach out and we'll respond as soon as we can.
          </p>
          {/* NAP Block */}
          <div className="mt-8 mx-auto max-w-2xl text-sm text-white/70 space-y-2">
            <p className="font-semibold text-white">Dream Enterprises LLC (DBA Dream Puppies)</p>
            <p>Orlando, FL | Raeford, NC</p>
            <a href={telHref} className="inline-block hover:text-white transition-colors">
              {businessInfo.phone}
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0a0214] py-12">
        <div className={containerClass}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Info Cards */}
          <div className="space-y-6">
            <Card className={sectionCardClass}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Phone</h3>
                    <a
                      href={telHref}
                      className="text-white/75 hover:text-white transition-colors"
                    >
                      {businessInfo.phone}
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Email</h3>
                    <a
                      href={`mailto:${businessInfo.email}`}
                      className="text-white/75 hover:text-white transition-colors break-all"
                    >
                      {businessInfo.email}
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Service Areas</h3>
                    <p className="text-white/75">Orlando, FL</p>
                    <p className="text-white/75">Raeford, NC</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card className={`${sectionCardClass} lg:col-span-2`}>
            <CardHeader>
              <CardTitle className="font-display text-3xl uppercase tracking-tight text-white">
                {subject === SUBJECT_PUPPY_INQUIRY
                  ? "Puppy Interest Form"
                  : subject === SUBJECT_UPCOMING_LITTER
                    ? "Upcoming Litter"
                    : "Send us a Message"}
              </CardTitle>
              <CardDescription className="text-white/70">
                {subject === SUBJECT_PUPPY_INQUIRY
                  ? "Tell us about yourself and your puppy preferences. We'll get back to you soon."
                  : subject === SUBJECT_UPCOMING_LITTER
                    ? "Join the waitlist or inquire about a deposit for an upcoming litter. We'll follow up with next steps."
                    : "Fill out the form below and we'll get back to you as soon as possible."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                <Label className="text-white">Subject *</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="border-white/20 bg-white/5 text-white">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SUBJECT_PUPPY_INQUIRY}>Puppy Inquiry</SelectItem>
                    <SelectItem value={SUBJECT_UPCOMING_LITTER}>Upcoming Litter</SelectItem>
                    <SelectItem value="general">General Question</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {subject === SUBJECT_PUPPY_INQUIRY ? (
                <PuppyInterestForm
                  puppies={puppies ?? []}
                  submitLabel="Submit Puppy Inquiry"
                />
              ) : subject === SUBJECT_UPCOMING_LITTER ? (
                <UpcomingLitterInquiryForm
                  litters={upcomingLitters ?? []}
                  initialLitterId={upcomingLitterId}
                  isSubmitting={isSubmitting}
                  submitLabel="Send Message"
                  onSubmit={async (payload) => {
                    setIsSubmitting(true);
                    try {
                      const { turnstile_token, ...rest } = payload;
                      const { error } = await insertContactMessage(
                        upcomingLitterPayloadToRow(rest),
                        turnstile_token
                      );
                      if (error) throw error;
                      toast({
                        title: "Message Sent!",
                        description: "We'll get back to you as soon as possible.",
                      });
                      setSubject("");
                      setUpcomingLitterId(null);
                    } catch (err) {
                      console.error("Error submitting upcoming litter inquiry:", err);
                      toast({
                        title: "Error",
                        description: "Failed to send. Please try again or contact us directly.",
                        variant: "destructive",
                      });
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white">Name *</Label>
                    <Input id="name" name="name" placeholder="Your name" required className="border-white/20 bg-white/5 text-white placeholder:text-white/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">Email *</Label>
                    <Input id="email" name="email" type="email" placeholder="your@email.com" required className="border-white/20 bg-white/5 text-white placeholder:text-white/50" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white">Phone</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="(123) 456-7890" className="border-white/20 bg-white/5 text-white placeholder:text-white/50" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-white">Message *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="How can we help you?"
                    rows={5}
                    required
                    className="border-white/20 bg-white/5 text-white placeholder:text-white/50"
                  />
                </div>

                {captchaRequired && (
                  <div className="flex justify-center">
                    <TurnstileWidget
                      onVerify={(token) => setGeneralFormToken(token)}
                      onExpire={() => setGeneralFormToken(null)}
                      onError={() => setGeneralFormToken(null)}
                    />
                  </div>
                )}

                <StickerButton
                  type="submit"
                  size="lg"
                  disabled={isSubmitting || !captchaSatisfiedGeneral}
                  className={pinkStickerClass}
                >
                  {isSubmitting ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </StickerButton>
              </form>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </section>

      {/* How We Help Section */}
      <section className="border-t border-white/10 bg-[#0a0214] py-14 md:py-16">
        <div className={containerClass}>
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-black tracking-tight md:text-4xl">How We Help</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className={sectionCardClass}>
              <CardHeader>
                <CardTitle className="text-xl text-white">Virtual Consultations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/70">
                  Schedule a free consultation to discuss breed compatibility, lifestyle fit, and answer all your questions about bringing home your Dream Puppy.
                </p>
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader>
                <CardTitle className="text-xl text-white">Health & Care Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/70">
                  We provide detailed puppy care guides, vaccination records, and ongoing health support to ensure your new family member thrives.
                </p>
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader>
                <CardTitle className="text-xl text-white">Lifetime Guidance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/70">
                  Questions about training, behavior, or care? We're here for you every step of the way with lifetime support and expert advice.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className={`${containerClass} text-center`}>
          <p className="mb-4 text-white/75">Prefer quick contact? Text or call us directly.</p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <StickerButton size="lg" className={pinkStickerClass} asChild>
              <a href={smsHref} className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Text us now
              </a>
            </StickerButton>
            <StickerButton size="lg" className={violetStickerClass} asChild>
              <a href={telHref} className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {businessInfo.phone}
              </a>
            </StickerButton>
          </div>
        </div>
      </section>
      <GalacticHomeMiniFooter />
      </div>
    </Layout>
  );
}
