import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dog, Heart } from "lucide-react";

// Placeholder puppy data - will be replaced with Airtable integration
const placeholderPuppies = [
  { id: 1, name: "Bella", breed: "Golden Retriever", gender: "Female", price: 2500, status: "Available" },
  { id: 2, name: "Max", breed: "French Bulldog", gender: "Male", price: 3500, status: "Available" },
  { id: 3, name: "Luna", breed: "Labrador Retriever", gender: "Female", price: 2200, status: "Reserved" },
  { id: 4, name: "Charlie", breed: "Poodle", gender: "Male", price: 2800, status: "Available" },
  { id: 5, name: "Daisy", breed: "Cavalier King Charles", gender: "Female", price: 3000, status: "Available" },
  { id: 6, name: "Cooper", breed: "Bernese Mountain Dog", gender: "Male", price: 3200, status: "Available" },
];

export default function Puppies() {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {placeholderPuppies.map((puppy) => (
            <Card key={puppy.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Placeholder Image */}
              <div className="aspect-square bg-muted flex items-center justify-center">
                <Dog className="h-24 w-24 text-muted-foreground/50" />
              </div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{puppy.name}</CardTitle>
                  <span 
                    className={`text-xs px-2 py-1 rounded-full ${
                      puppy.status === "Available" 
                        ? "bg-primary/10 text-primary" 
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {puppy.status}
                  </span>
                </div>
                <CardDescription>{puppy.breed} • {puppy.gender}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-foreground">${puppy.price.toLocaleString()}</span>
                  <Button disabled={puppy.status !== "Available"}>
                    <Heart className="h-4 w-4 mr-2" />
                    Inquire
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Note about Airtable */}
      <section className="container pb-12">
        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Note: Puppy data is currently using placeholder content. Airtable integration will be connected to display live inventory.
          </p>
        </div>
      </section>
    </Layout>
  );
}
