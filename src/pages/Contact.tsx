import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, MapPin, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { PuppyInterestForm } from "@/components/PuppyInterestForm";
import { UpcomingLitterInquiryForm } from "@/components/UpcomingLitterInquiryForm";
import type { Puppy } from "@/lib/supabase";
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUuid(s: string | null): s is string {
  return !!s && UUID_REGEX.test(s);
}

async function fetchAvailablePuppies(): Promise<Puppy[]> {
  const { data, error } = await supabase
    .from("puppies")
    .select("*")
    .eq("status", "Available")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export default function Contact() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subject, setSubject] = useState("");
  const [upcomingLitterId, setUpcomingLitterId] = useState<string | null>(null);
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
      const { error } = await insertContactMessage(data);
      if (error) throw error;

      toast({
        title: "Message Sent!",
        description: "We'll get back to you as soon as possible.",
      });
      
      (e.target as HTMLFormElement).reset();
      setSubject("");
      setUpcomingLitterId(null);
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

  return (
    <Layout>
      <Seo pageId="contact" />
      {/* Hero Section */}
      <section className="bg-primary py-16">
        <div className="container text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 text-primary-foreground" />
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">Contact Us</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Have questions? We'd love to hear from you. Reach out and we'll respond as soon as we can.
          </p>
        </div>
      </section>

      <section className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info Cards */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Phone</h3>
                    <a 
                      href="tel:321-697-8864" 
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      321-697-8864
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Email</h3>
                    <a 
                      href="mailto:Dreampuppies22@gmail.com" 
                      className="text-muted-foreground hover:text-foreground transition-colors break-all"
                    >
                      Dreampuppies22@gmail.com
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Service Areas</h3>
                    <p className="text-muted-foreground">Florida</p>
                    <p className="text-muted-foreground">North Carolina</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {subject === SUBJECT_PUPPY_INQUIRY
                  ? "Puppy Interest Form"
                  : subject === SUBJECT_UPCOMING_LITTER
                    ? "Upcoming Litter"
                    : "Send us a Message"}
              </CardTitle>
              <CardDescription>
                {subject === SUBJECT_PUPPY_INQUIRY
                  ? "Tell us about yourself and your puppy preferences. We'll get back to you soon."
                  : subject === SUBJECT_UPCOMING_LITTER
                    ? "Join the waitlist or inquire about a deposit for an upcoming litter. We'll follow up with next steps."
                    : "Fill out the form below and we'll get back to you as soon as possible."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                <Label>Subject *</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
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
                      const { error } = await insertContactMessage(
                        upcomingLitterPayloadToRow(payload)
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
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" name="name" placeholder="Your name" required />
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea 
                    id="message" 
                    name="message" 
                    placeholder="How can we help you?"
                    rows={5}
                    required 
                  />
                </div>

                <Button type="submit" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
