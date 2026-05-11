import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Dog,
  MessageSquare,
  LogOut,
  Package,
  Box,
  ExternalLink,
  CalendarHeart,
  BarChart2,
  Heart,
  FileSignature,
  CreditCard,
  Menu,
  HelpCircle,
  Star,
  ClipboardCheck,
  Newspaper,
  KeyRound,
} from 'lucide-react';

export function AdminLayout() {
  const { signOut, user } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Puppies', href: '/admin/puppies', icon: Dog },
    { name: 'Breeding Dogs', href: '/admin/breeding-dogs', icon: Heart },
    { name: 'Upcoming Litters', href: '/admin/upcoming-litters', icon: CalendarHeart },
    { name: 'Products', href: '/admin/inventory/products', icon: Package },
    { name: 'Kits', href: '/admin/inventory/kits', icon: Box },
    { name: 'Agreements', href: '/admin/agreements', icon: FileSignature },
    { name: 'Deposit Requests', href: '/admin/deposit-requests', icon: ClipboardCheck },
    { name: 'Inquiries', href: '/admin/inquiries', icon: MessageSquare },
    { name: 'Payment Settings', href: '/admin/payment-settings', icon: CreditCard },
    { name: 'Breeder Passcode', href: '/admin/settings/breeder-passcode', icon: KeyRound },
    { name: 'Dreamy Reviews', href: '/admin/testimonials', icon: Star },
    { name: 'Newsletter', href: '/admin/newsletter', icon: Newspaper },
    { name: 'FAQ', href: '/admin/faq', icon: HelpCircle },
    { name: 'Business Modes', href: '/admin/business-modes', icon: BarChart2 },
  ];

  const navItems = navigation.map((item) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        key={item.name}
        to={item.href}
        className={`flex items-center px-6 py-3 text-sm font-medium transition-colors border-r-4 ${
          isActive
            ? 'border-primaryDeep bg-primaryDeep/10 text-primaryDeep'
            : 'border-transparent text-foreground hover:bg-muted/80'
        }`}
      >
        <item.icon className="mr-3 h-5 w-5 shrink-0" />
        {item.name}
      </Link>
    );
  });

  const sidebarFooter = (
    <div className="p-6 border-t border-line space-y-2">
      <Link
        to="/"
        className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-foreground bg-muted/60 hover:bg-muted rounded-md border border-line transition-colors"
      >
        <ExternalLink className="h-4 w-4" />
        View main site
      </Link>
      <Button variant="outline" className="w-full border-line" onClick={() => signOut()}>
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </div>
  );

  return (
    <>
      <Seo pageId="admin" canonicalPath={location.pathname} />
      <div className="flex h-screen bg-muted/40">
        <div className="hidden md:flex w-64 bg-card border-r border-line shadow-sm flex-col">
          <div className="p-6 border-b border-line">
            <p className="font-display text-lg tracking-tight text-ink">Dream Puppies</p>
            <h1 className="text-sm font-semibold text-muted-foreground mt-1">Admin</h1>
            <p className="text-xs text-muted-foreground mt-2 truncate">{user?.email}</p>
          </div>
          <nav className="mt-2 flex-1 overflow-y-auto">{navItems}</nav>
          {sidebarFooter}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="md:hidden flex items-center gap-3 p-3 bg-card border-b border-line">
            <Sheet key={location.pathname}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                <div className="flex flex-col h-full bg-card">
                  <div className="p-6 border-b border-line">
                    <p className="font-display text-base text-ink">Dream Puppies</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{user?.email}</p>
                  </div>
                  <nav className="flex-1 overflow-y-auto">{navItems}</nav>
                  {sidebarFooter}
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold text-foreground">Admin</h1>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
