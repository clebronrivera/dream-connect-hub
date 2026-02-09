import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
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
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const categories = [
  { icon: Utensils, name: "Food & Nutrition", description: "Premium food and supplements" },
  { icon: BedDouble, name: "Bedding & Comfort", description: "Cozy beds and blankets" },
  { icon: Gamepad2, name: "Toys & Play", description: "Interactive toys and games" },
  { icon: GraduationCap, name: "Training Supplies", description: "Leashes, treats, and aids" },
  { icon: Sparkles, name: "Grooming & Care", description: "Brushes, shampoos, and more" },
  { icon: Utensils, name: "Feeding Accessories", description: "Bowls, feeders, and mats" },
];

const starterKits = [
  {
    name: "Essential Kit",
    price: 79.99,
    description: "Everything a new puppy needs to get started",
    items: ["Food bowl & water bowl", "Puppy bed", "Collar & leash", "Starter toy set"],
  },
  {
    name: "Complete Kit",
    price: 149.99,
    description: "Comprehensive starter set for your new companion",
    items: ["Everything in Essential", "Premium food supply", "Grooming basics", "Training treats", "Crate pad"],
    popular: true,
  },
  {
    name: "Premium Deluxe Kit",
    price: 229.99,
    description: "The ultimate new puppy experience",
    items: ["Everything in Complete", "Orthopedic bed", "Interactive toy bundle", "Full grooming set", "Training guide"],
  },
];

const faqs = [
  {
    question: "How do I place an order?",
    answer: "Contact us via phone (321-697-8864) or email (Dreampuppies22@gmail.com) to place your order. We'll help you select the perfect items for your pet's needs.",
  },
  {
    question: "What are the shipping options?",
    answer: "We offer free shipping on orders over $50 within Florida and North Carolina. Standard shipping typically takes 3-5 business days.",
  },
  {
    question: "Can I customize a starter kit?",
    answer: "Absolutely! We can customize any starter kit to better suit your puppy's specific needs. Just let us know your preferences when ordering.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, PayPal, and Venmo. Payment details will be provided when you contact us to place an order.",
  },
  {
    question: "What is your return policy?",
    answer: "We offer a 30-day return policy on unused items in original packaging. Contact us to initiate a return.",
  },
];

const products = [
  { name: "Premium Puppy Food", price: 49.99, status: "Sold Out" },
  { name: "Cozy Cloud Bed", price: 79.99, status: "Sold Out" },
  { name: "Interactive Puzzle Toy", price: 24.99, status: "Sold Out" },
  { name: "Training Treat Bundle", price: 19.99, status: "Sold Out" },
  { name: "Grooming Starter Set", price: 34.99, status: "Sold Out" },
  { name: "Adjustable Puppy Collar", price: 15.99, status: "Sold Out" },
];

function ProductInquiryDialog({ productName }: { productName: string }) {
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
      phone: formData.get("phone") as string || undefined,
      message: formData.get("message") as string || undefined,
    };

    try {
      const { error } = await supabase
        .from("product_inquiries")
        .insert([data]);

      if (error) throw error;

      toast({
        title: "Inquiry Submitted!",
        description: "We'll contact you soon about this product.",
      });

      setOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Error submitting product inquiry:", error);
      toast({
        title: "Error",
        description: "Failed to submit inquiry. Please try again.",
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
          Contact to Order
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inquire About {productName}</DialogTitle>
          <DialogDescription>
            Fill out the form below and we'll contact you about this product.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prod-name">Name *</Label>
            <Input id="prod-name" name="name" placeholder="Your name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prod-email">Email *</Label>
            <Input id="prod-email" name="email" type="email" placeholder="your@email.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prod-phone">Phone</Label>
            <Input id="prod-phone" name="phone" type="tel" placeholder="(123) 456-7890" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prod-message">Message</Label>
            <Textarea 
              id="prod-message" 
              name="message" 
              placeholder="Any questions or special requests?"
              rows={4}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Inquiry"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function KitInquiryDialog({ kitName }: { kitName: string }) {
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
      phone: formData.get("phone") as string || undefined,
      message: formData.get("message") as string || undefined,
    };

    try {
      const { error } = await supabase
        .from("product_inquiries")
        .insert([data]);

      if (error) throw error;

      toast({
        title: "Inquiry Submitted!",
        description: "We'll contact you soon about this starter kit.",
      });

      setOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Error submitting kit inquiry:", error);
      toast({
        title: "Error",
        description: "Failed to submit inquiry. Please try again.",
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
          Contact to Order
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inquire About {kitName}</DialogTitle>
          <DialogDescription>
            Fill out the form below and we'll contact you about this starter kit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kit-name">Name *</Label>
            <Input id="kit-name" name="name" placeholder="Your name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kit-email">Email *</Label>
            <Input id="kit-email" name="email" type="email" placeholder="your@email.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kit-phone">Phone</Label>
            <Input id="kit-phone" name="phone" type="tel" placeholder="(123) 456-7890" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kit-message">Message</Label>
            <Textarea 
              id="kit-message" 
              name="message" 
              placeholder="Any customization requests or questions?"
              rows={4}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Inquiry"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Essentials() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-primary py-16">
        <div className="container text-center">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-primary-foreground" />
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">Pet Essentials</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Everything your new puppy needs to thrive. Quality products handpicked for happy, healthy pets.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-12">
        <h2 className="text-3xl font-bold text-center text-foreground mb-10">Shop by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <category.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{category.name}</h3>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section className="bg-muted/30 py-12">
        <div className="container">
          <h2 className="text-3xl font-bold text-center text-foreground mb-10">Featured Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground/50" />
                </div>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <span 
                      className={`text-xs px-2 py-1 rounded-full ${
                        product.status === "Available" 
                          ? "bg-primary/10 text-primary" 
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {product.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-foreground">${product.price}</span>
                    <ProductInquiryDialog productName={product.name} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Starter Kits */}
      <section className="container py-12">
        <h2 className="text-3xl font-bold text-center text-foreground mb-4">Starter Kits</h2>
        <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
          Save with our curated bundles designed to give your new puppy the perfect start.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {starterKits.map((kit, index) => (
            <Card key={index} className={kit.popular ? "border-2 border-primary relative" : ""}>
              {kit.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{kit.name}</CardTitle>
                <CardDescription>{kit.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-foreground mb-4">${kit.price}</div>
                <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left">
                  {kit.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <KitInquiryDialog kitName={kit.name} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/30 py-12">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-10">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="container py-12 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Order?</h2>
        <p className="text-lg text-muted-foreground mb-6 max-w-xl mx-auto">
          Contact us to place your order or ask any questions about our products.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <a href="tel:321-697-8864">
              <Phone className="h-4 w-4 mr-2" />
              Call 321-697-8864
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="mailto:Dreampuppies22@gmail.com">Email Us</a>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
