import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ShoppingBag,
  Utensils,
  BedDouble,
  Gamepad2,
  GraduationCap,
  Sparkles,
  Package,
  Phone,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { Product, KitWithItems } from "@/lib/supabase";

const categories = [
  { icon: Utensils, key: "essentials.categories.foodNutrition" },
  { icon: BedDouble, key: "essentials.categories.beddingComfort" },
  { icon: Gamepad2, key: "essentials.categories.toysPlay" },
  { icon: GraduationCap, key: "essentials.categories.trainingSupplies" },
  { icon: Sparkles, key: "essentials.categories.groomingCare" },
  { icon: Utensils, key: "essentials.categories.feedingAccessories" },
] as const;

const faqKeys = [
  "essentials.faqs.order",
  "essentials.faqs.shipping",
  "essentials.faqs.customize",
  "essentials.faqs.payment",
  "essentials.faqs.returnPolicy",
] as const;

function ProductInquiryDialog({ productName }: { productName: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      product_name: productName,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || undefined,
      message: (formData.get("message") as string) || undefined,
    };

    try {
      const { error } = await supabase.from("product_inquiries").insert([data]);
      if (error) throw error;

      toast({
        title: t("forms.productInquiry.successTitle"),
        description: t("forms.productInquiry.successDescriptionProduct"),
      });

      setOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Error submitting product inquiry:", error);
      toast({
        title: t("forms.productInquiry.errorTitle"),
        description: t("forms.productInquiry.errorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Phone className="h-4 w-4 mr-2" />
          {t("common.contactToOrder")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("forms.productInquiry.inquireAbout", { name: productName })}</DialogTitle>
          <DialogDescription>{t("forms.productInquiry.descriptionProduct")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prod-name">{t("forms.productInquiry.fields.name")}</Label>
            <Input id="prod-name" name="name" placeholder={t("forms.productInquiry.placeholders.name")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prod-email">{t("forms.productInquiry.fields.email")}</Label>
            <Input id="prod-email" name="email" type="email" placeholder={t("forms.productInquiry.placeholders.email")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prod-phone">{t("forms.productInquiry.fields.phone")}</Label>
            <Input id="prod-phone" name="phone" type="tel" placeholder={t("forms.productInquiry.placeholders.phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prod-message">{t("forms.productInquiry.fields.message")}</Label>
            <Textarea
              id="prod-message"
              name="message"
              placeholder={t("forms.productInquiry.placeholders.productMessage")}
              rows={4}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common.submitting")}
                </>
              ) : (
                t("forms.productInquiry.submit")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function KitInquiryDialog({ kitName }: { kitName: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      product_name: kitName,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || undefined,
      message: (formData.get("message") as string) || undefined,
    };

    try {
      const { error } = await supabase.from("product_inquiries").insert([data]);
      if (error) throw error;

      toast({
        title: t("forms.productInquiry.successTitle"),
        description: t("forms.productInquiry.successDescriptionKit"),
      });

      setOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Error submitting kit inquiry:", error);
      toast({
        title: t("forms.productInquiry.errorTitle"),
        description: t("forms.productInquiry.errorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Phone className="h-4 w-4 mr-2" />
          {t("common.contactToOrder")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("forms.productInquiry.inquireAbout", { name: kitName })}</DialogTitle>
          <DialogDescription>{t("forms.productInquiry.descriptionKit")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kit-name">{t("forms.productInquiry.fields.name")}</Label>
            <Input id="kit-name" name="name" placeholder={t("forms.productInquiry.placeholders.name")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kit-email">{t("forms.productInquiry.fields.email")}</Label>
            <Input id="kit-email" name="email" type="email" placeholder={t("forms.productInquiry.placeholders.email")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kit-phone">{t("forms.productInquiry.fields.phone")}</Label>
            <Input id="kit-phone" name="phone" type="tel" placeholder={t("forms.productInquiry.placeholders.phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kit-message">{t("forms.productInquiry.fields.message")}</Label>
            <Textarea
              id="kit-message"
              name="message"
              placeholder={t("forms.productInquiry.placeholders.kitMessage")}
              rows={4}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common.submitting")}
                </>
              ) : (
                t("forms.productInquiry.submit")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Essentials() {
  const { t } = useTranslation();
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["essentials-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .in("status", ["available", "sold_out"])
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const { data: kits = [], isLoading: kitsLoading } = useQuery({
    queryKey: ["essentials-kits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kits")
        .select(`
          *,
          kit_items (
            id,
            item_text,
            display_order
          )
        `)
        .in("status", ["available", "sold_out"])
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as KitWithItems[];
    },
  });

  return (
    <Layout>
      <Seo pageId="essentials" />
      <section className="bg-primary py-16">
        <div className="container text-center">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-primary-foreground" />
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">
            {t("essentials.hero.title")}
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            {t("essentials.hero.description")}
          </p>
        </div>
      </section>

      <section className="container py-12">
        <h2 className="text-3xl font-bold text-center text-foreground mb-10">
          {t("essentials.categoriesTitle")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Card key={category.key} className="text-center hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <category.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">
                  {t(`${category.key}.name`)}
                </h3>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/30 py-12">
        <div className="container">
          <h2 className="text-3xl font-bold text-center text-foreground mb-10">
            {t("essentials.featuredProducts")}
          </h2>
          {productsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                    {product.photo ? (
                      <img
                        src={product.photo}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="h-16 w-16 text-muted-foreground/50" />
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          product.status === "available"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {t(`productStatus.${product.status}`)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-foreground">${Number(product.price).toFixed(2)}</span>
                      <ProductInquiryDialog productName={product.name} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="container py-12">
        <h2 className="text-3xl font-bold text-center text-foreground mb-4">
          {t("essentials.starterKits.title")}
        </h2>
        <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
          {t("essentials.starterKits.description")}
        </p>
        {kitsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {kits.map((kit) => {
              const items = (kit.kit_items ?? [])
                .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
              return (
                <Card key={kit.id} className={kit.badge ? "border-2 border-primary relative" : ""}>
                  {kit.badge && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                      {kit.badge}
                    </div>
                  )}
                  <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                    {kit.photo ? (
                      <img src={kit.photo} alt={kit.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-16 w-16 text-muted-foreground/50" />
                    )}
                  </div>
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl">{kit.name}</CardTitle>
                    <CardDescription>{kit.description ?? ""}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-4xl font-bold text-foreground mb-4">${Number(kit.price).toFixed(2)}</div>
                    <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left">
                      {items.map((item) => (
                        <li key={item.id} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {item.item_text}
                        </li>
                      ))}
                    </ul>
                    <KitInquiryDialog kitName={kit.name} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-muted/30 py-12">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-10">
            {t("essentials.faqTitle")}
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqKeys.map((key, index) => (
              <AccordionItem key={key} value={`item-${index}`}>
                <AccordionTrigger className="text-left">{t(`${key}.question`)}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t(`${key}.answer`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="container py-12 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          {t("essentials.contactCta.title")}
        </h2>
        <p className="text-lg text-muted-foreground mb-6 max-w-xl mx-auto">
          {t("essentials.contactCta.description")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <a href="tel:321-697-8864">
              <Phone className="h-4 w-4 mr-2" />
              {t("common.call", { phone: "321-697-8864" })}
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="mailto:Dreampuppies22@gmail.com">{t("common.emailUs")}</a>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
