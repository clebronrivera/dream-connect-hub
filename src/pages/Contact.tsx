import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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

function isValidUuid(value: string | null): value is string {
  return !!value && UUID_REGEX.test(value);
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
  const { t } = useTranslation();
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

  useEffect(() => {
    const subjectFromUrl = searchParams.get("subject");
    if (subjectFromUrl === SUBJECT_OTHER_CONSULTATION) setSubject(SUBJECT_OTHER_CONSULTATION);
    if (subjectFromUrl === "upcoming-litter" || subjectFromUrl === SUBJECT_UPCOMING_LITTER) {
      setSubject(SUBJECT_UPCOMING_LITTER);
    }
  }, [searchParams]);

  useEffect(() => {
    const litterParam = searchParams.get("litter");
    if (!isValidUuid(litterParam) || !upcomingLitters?.length) return;
    if (upcomingLitters.some((litter) => litter.id === litterParam)) {
      setUpcomingLitterId(litterParam);
    }
  }, [searchParams, upcomingLitters]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const selectedLitter = upcomingLitterId && upcomingLitters?.find((litter) => litter.id === upcomingLitterId);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || undefined,
      subject: subject || (formData.get("subject") as string),
      message: formData.get("message") as string,
      upcoming_litter_id: upcomingLitterId || null,
      upcoming_litter_label: selectedLitter
        ? `${selectedLitter.display_breed || selectedLitter.breed}${selectedLitter.due_label ? `, ${selectedLitter.due_label}` : ""}`
        : null,
    };

    try {
      const { error } = await insertContactMessage(data);
      if (error) throw error;

      toast({
        title: t("contact.form.successTitle"),
        description: t("contact.form.successDescription"),
      });

      (e.target as HTMLFormElement).reset();
      setSubject("");
      setUpcomingLitterId(null);
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast({
        title: t("contact.form.errorTitle"),
        description: t("contact.form.errorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardTitle =
    subject === SUBJECT_PUPPY_INQUIRY
      ? t("contact.form.title.puppyInquiry")
      : subject === SUBJECT_UPCOMING_LITTER
        ? t("contact.form.title.upcomingLitter")
        : t("contact.form.title.default");
  const cardDescription =
    subject === SUBJECT_PUPPY_INQUIRY
      ? t("contact.form.description.puppyInquiry")
      : subject === SUBJECT_UPCOMING_LITTER
        ? t("contact.form.description.upcomingLitter")
        : t("contact.form.description.default");

  return (
    <Layout>
      <Seo pageId="contact" />
      <section className="bg-primary py-16">
        <div className="container text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 text-primary-foreground" />
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">
            {t("contact.hero.title")}
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            {t("contact.hero.description")}
          </p>
        </div>
      </section>

      <section className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{t("contact.cards.phone")}</h3>
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
                    <h3 className="font-semibold text-foreground">{t("contact.cards.email")}</h3>
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
                    <h3 className="font-semibold text-foreground">{t("contact.cards.serviceAreas")}</h3>
                    <p className="text-muted-foreground">{t("states.FL")}</p>
                    <p className="text-muted-foreground">{t("states.NC")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{cardTitle}</CardTitle>
              <CardDescription>{cardDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                <Label>{t("contact.form.subjectLabel")}</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("contact.form.subjectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SUBJECT_PUPPY_INQUIRY}>
                      {t("contact.form.subjects.puppyInquiry")}
                    </SelectItem>
                    <SelectItem value={SUBJECT_UPCOMING_LITTER}>
                      {t("contact.form.subjects.upcomingLitter")}
                    </SelectItem>
                    <SelectItem value="general">{t("contact.form.subjects.general")}</SelectItem>
                    <SelectItem value="other">{t("contact.form.subjects.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {subject === SUBJECT_PUPPY_INQUIRY ? (
                <PuppyInterestForm
                  puppies={puppies ?? []}
                  submitLabel={t("forms.puppyInterest.submit")}
                />
              ) : subject === SUBJECT_UPCOMING_LITTER ? (
                <UpcomingLitterInquiryForm
                  litters={upcomingLitters ?? []}
                  initialLitterId={upcomingLitterId}
                  isSubmitting={isSubmitting}
                  submitLabel={t("contact.form.sendMessage")}
                  onSubmit={async (payload) => {
                    setIsSubmitting(true);
                    try {
                      const { error } = await insertContactMessage(
                        upcomingLitterPayloadToRow(payload)
                      );
                      if (error) throw error;
                      toast({
                        title: t("contact.form.successTitle"),
                        description: t("contact.form.successDescription"),
                      });
                      setSubject("");
                      setUpcomingLitterId(null);
                    } catch (err) {
                      console.error("Error submitting upcoming litter inquiry:", err);
                      toast({
                        title: t("contact.form.errorTitle"),
                        description: t("contact.form.errorDescription"),
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
                      <Label htmlFor="name">{t("common.name")} *</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder={t("common.namePlaceholder")}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t("common.email")} *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder={t("common.emailPlaceholder")}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t("common.phone")}</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder={t("common.phonePlaceholder")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">{t("common.message")} *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder={t("contact.form.placeholders.message")}
                      rows={5}
                      required
                    />
                  </div>

                  <Button type="submit" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? (
                      t("common.sending")
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {t("contact.form.sendMessage")}
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
