import { useState } from "react";
import { Link } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Menu, PawPrint, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/puppies", label: "Available Puppies" },
  { to: "/breeds", label: "Our Breeds" },
  { to: "/consultation", label: "Pet Consultation" },
  { to: "/essentials", label: "Pet Essentials" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Top Info Bar */}
      <div className="bg-primary text-primary-foreground py-2 text-sm">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-2">
          <a href="mailto:Dreampuppies22@gmail.com" className="flex items-center gap-2 hover:underline">
            <Mail className="h-4 w-4" />
            Dreampuppies22@gmail.com
          </a>
          <p className="text-center text-primary-foreground/90">
            Serving Florida & North Carolina • Consultation & Shipping Nationwide
          </p>
        </div>
      </div>
      
      {/* Main Header */}
      <header className="sticky top-0 z-50 w-full bg-background border-b shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <PawPrint className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">Puppy Heaven</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                activeClassName="text-primary"
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsOpen(false)}
                    className="text-lg font-medium text-muted-foreground transition-colors hover:text-primary py-2"
                    activeClassName="text-primary"
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  );
}
