import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Video, FileText, CheckCircle, AlertCircle } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    title: "Complete Survey",
    description: "Fill out our detailed consultation survey about your pet's behavior and needs.",
  },
  {
    icon: Video,
    title: "30-Minute Session",
    description: "Schedule a virtual one-on-one session with our pet behavior specialist.",
  },
  {
    icon: FileText,
    title: "Receive Plan",
    description: "Get a personalized recommendation plan tailored to your pet's specific needs.",
  },
];

export default function Consultation() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-muted/30 py-16">
        <div className="container text-center">
          <Video className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-bold text-foreground mb-4">Virtual Pet Behavior Consultation</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get expert guidance on pet behavior, training, and care from the comfort of your home. 
            Our specialists are here to help your furry friend thrive.
          </p>
        </div>
      </section>

      {/* How It Works */}
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

      {/* Pricing */}
      <section className="bg-muted/30 py-12">
        <div className="container">
          <h2 className="text-3xl font-bold text-center text-foreground mb-10">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Intro Offer */}
            <Card className="border-2 border-primary relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg">
                Best Value
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Intro Offer</CardTitle>
                <CardDescription>First-time consultation</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-5xl font-bold text-foreground mb-2">$25</div>
                <p className="text-muted-foreground mb-4">per 30-minute session</p>
                <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                  <li className="flex items-center gap-2 justify-center">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    One per household
                  </li>
                  <li className="flex items-center gap-2 justify-center">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Full consultation experience
                  </li>
                  <li className="flex items-center gap-2 justify-center">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Written summary included
                  </li>
                </ul>
                <Button className="w-full">Get Started</Button>
              </CardContent>
            </Card>

            {/* Regular Session */}
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Regular Session</CardTitle>
                <CardDescription>Follow-up consultations</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-5xl font-bold text-foreground mb-2">$50</div>
                <p className="text-muted-foreground mb-4">per 30-minute session</p>
                <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                  <li className="flex items-center gap-2 justify-center">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Ongoing support
                  </li>
                  <li className="flex items-center gap-2 justify-center">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Progress tracking
                  </li>
                  <li className="flex items-center gap-2 justify-center">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Updated recommendations
                  </li>
                </ul>
                <Button variant="outline" className="w-full">Book Session</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-12 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Get Started?</h2>
        <p className="text-lg text-muted-foreground mb-6 max-w-xl mx-auto">
          Complete our consultation survey to begin your journey toward a happier, better-behaved pet.
        </p>
        <Button size="lg">Complete Consultation Survey</Button>
      </section>

      {/* Disclaimer */}
      <section className="container pb-12">
        <div className="bg-muted/50 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground mb-1">Important Disclaimer</h4>
              <p className="text-sm text-muted-foreground">
                Our pet consultation service is for educational and behavioral guidance purposes only. 
                This service does not replace professional veterinary care. For medical concerns, 
                please consult a licensed veterinarian.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
