import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dog, Video, ShoppingBag, Heart, MapPin, Phone, Mail, Users } from "lucide-react";

const services = [
  {
    icon: Dog,
    title: "Available Puppies",
    description: "Find your perfect furry companion from our selection of healthy, happy puppies raised with love.",
    cta: "Browse Puppies",
    link: "/puppies",
  },
  {
    icon: Video,
    title: "Pet Consultation",
    description: "Get expert virtual guidance on pet behavior, training, and care from our experienced specialists.",
    cta: "Get Consultation",
    link: "/consultation",
  },
  {
    icon: ShoppingBag,
    title: "Pet Essentials",
    description: "Everything your new puppy needs to thrive — from starter kits to premium supplies.",
    cta: "Shop Essentials",
    link: "/essentials",
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
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative bg-muted/30 py-20 lg:py-32">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <Dog className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Welcome to Puppy Heaven
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              Your trusted partner for finding the perfect puppy, expert pet consultation, 
              and everything your furry friend needs to thrive.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/puppies">
                  <Dog className="h-5 w-5 mr-2" />
                  Browse Puppies
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/consultation">
                  <Video className="h-5 w-5 mr-2" />
                  Pet Consultation
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/essentials">
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  Shop Essentials
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="container py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          Our Services
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          From finding your perfect companion to ongoing support, we're here for every step of your pet journey.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <service.icon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">{service.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="mb-6">{service.description}</CardDescription>
                <Button asChild>
                  <Link to={service.link}>{service.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
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
