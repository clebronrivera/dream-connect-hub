import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { appEnv } from "@/lib/env";
import { Dog, Heart, MapPin, Phone, Mail, Users, CheckCircle2 } from "lucide-react";

const services = [
  {
    icon: Dog,
    title: "Available Puppies",
    description: "Find your perfect furry companion from our selection of healthy, happy puppies raised with love.",
    cta: "Browse Puppies",
    link: "/puppies",
  },
];

const trustPoints = [
  {
    icon: Users,
    title: "Family Operated",
    description: "Dedicated to pets and their families since day one",
  },
  {
    icon: MapPin,
    title: "Serving FL & NC",
    description: "Proudly serving Florida and North Carolina",
  },
  {
    icon: Heart,
    title: "Raised with Love",
    description: "Every puppy receives personal care and attention",
  },
];

export default function Index() {
  const featuredService = services[0];

  return (
    <Layout>
      <Seo pageId="home" />
      {/* Hero Section — banner from env or hardcoded Supabase URL (Lovable has no env); fallback to red */}
      {(() => {
        const baseUrl = appEnv.supabaseUrl ?? '';
        const defaultBanner = baseUrl
          ? `${baseUrl.replace(/\/$/, '')}/storage/v1/object/public/site-assets/banner-puppies.png.jpeg`
          : '';
        const bannerUrl =
          appEnv.bannerImageUrl?.trim() || defaultBanner;
        const useImage = Boolean(bannerUrl);
        return (
          <section
            className={`relative py-20 lg:py-32 min-h-[28rem] ${useImage ? "bg-cover bg-center bg-no-repeat" : "bg-primary"}`}
            style={useImage ? { backgroundImage: `url(${bannerUrl})` } : undefined}
          >
            {useImage && (
              <div className="absolute inset-0 bg-black/50" aria-hidden />
            )}
            <div className="container relative z-10">
              <div className="max-w-3xl mx-auto text-center">
                <Dog className={`h-16 w-16 mx-auto mb-6 ${useImage ? "text-white drop-shadow-md" : "text-primary-foreground"}`} />
                <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-6 ${useImage ? "text-white drop-shadow-md" : "text-primary-foreground"}`}>
                  Welcome to Puppy Heaven
                </h1>
                <p className={`text-lg md:text-xl mb-8 ${useImage ? "text-white/90 drop-shadow-sm" : "text-primary-foreground/80"}`}>
                  Your trusted partner for finding the perfect puppy and everything your furry friend needs to thrive.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="secondary" className="text-black" asChild>
                    <Link to="/puppies">
                      <Dog className="h-5 w-5 mr-2" />
                      Browse Puppies
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Services Section */}
      <section className="container py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          Our Services
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          From finding your perfect companion to ongoing support, we're here for every step of your pet journey.
        </p>
        <div className="mx-auto max-w-5xl">
          <Card className="overflow-hidden border-primary/20 shadow-sm hover:shadow-lg transition-shadow">
            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr]">
              <div className="p-8 md:p-10">
                <CardHeader className="p-0 mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <featuredService.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl md:text-3xl">{featuredService.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <CardDescription className="text-base mb-6 max-w-xl">
                    {featuredService.description}
                  </CardDescription>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button size="lg" asChild>
                      <Link to={featuredService.link}>{featuredService.cta}</Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <Link to="/contact">Ask About Availability</Link>
                    </Button>
                  </div>
                </CardContent>
              </div>

              <div className="bg-muted/40 border-t md:border-t-0 md:border-l p-8 md:p-10">
                <h3 className="text-lg font-semibold text-foreground mb-4">What to expect</h3>
                <div className="space-y-3 text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    Healthy, socialized puppies raised with daily care and attention.
                  </p>
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    Detailed listings with current photos and helpful notes.
                  </p>
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    Friendly support to help you find the right fit for your home.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-muted/30 py-16">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
            Why Choose Puppy Heaven?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {trustPoints.map((point, index) => (
              <div key={index} className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <point.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{point.title}</h3>
                <p className="text-muted-foreground">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="container py-16">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-12">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
              <p className="text-primary-foreground/80 mb-8">
                Whether you're looking for a new puppy, need pet advice, or want to stock up on supplies, 
                we're here to help. Reach out today!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <a 
                  href="tel:321-697-8864" 
                  className="flex items-center gap-2 justify-center text-primary-foreground hover:underline"
                >
                  <Phone className="h-5 w-5" />
                  321-697-8864
                </a>
                <a 
                  href="mailto:Dreampuppies22@gmail.com" 
                  className="flex items-center gap-2 justify-center text-primary-foreground hover:underline"
                >
                  <Mail className="h-5 w-5" />
                  Dreampuppies22@gmail.com
                </a>
              </div>
              <Button variant="secondary" size="lg" asChild>
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
}
