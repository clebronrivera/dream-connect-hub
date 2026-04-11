import { useState, useEffect } from 'react';
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
} from 'lucide-react';

export function AdminLayout() {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Puppies', href: '/admin/puppies', icon: Dog },
    { name: 'Breeding Dogs', href: '/admin/breeding-dogs', icon: Heart },
    { name: 'Upcoming Litters', href: '/admin/upcoming-litters', icon: CalendarHeart },
    { name: 'Products', href: '/admin/inventory/products', icon: Package },
    { name: 'Kits', href: '/admin/inventory/kits', icon: Box },
    { name: 'Agreements', href: '/admin/agreements', icon: FileSignature },
    { name: 'Inquiries', href: '/admin/inquiries', icon: MessageSquare },
    { name: 'Payment Settings', href: '/admin/payment-settings', icon: CreditCard },
    { name: 'Dreamy Reviews', href: '/admin/testimonials', icon: Star },
    { name: 'FAQ', href: '/admin/faq', icon: HelpCircle },
    { name: 'Business Modes', href: '/admin/business-modes', icon: BarChart2 },
  ];

  const navItems = navigation.map((item) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        key={item.name}
        to={item.href}
        className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <item.icon className="mr-3 h-5 w-5" />
        {item.name}
      </Link>
    );
  });

  const sidebarFooter = (
    <div className="p-6 border-t space-y-2">
      <Link
        to="/"
        className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors"
      >
        <ExternalLink className="h-4 w-4" />
        View Main Website
      </Link>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => signOut()}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );

  return (
    <>
      <Seo pageId="admin" canonicalPath={location.pathname} />
      <div className="flex h-screen bg-gray-100">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-64 bg-white shadow-lg flex-col">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
          </div>
          <nav className="mt-6 flex-1">
            {navItems}
          </nav>
          {sidebarFooter}
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile top bar */}
          <div className="md:hidden flex items-center gap-3 p-3 bg-white border-b shadow-sm">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
                <div className="flex flex-col h-full">
                  <div className="p-6">
                    <h1 className="text-xl font-bold text-gray-800">Admin</h1>
                    <p className="text-sm text-gray-500 mt-1 truncate">{user?.email}</p>
                  </div>
                  <nav className="flex-1 overflow-y-auto">
                    {navItems}
                  </nav>
                  {sidebarFooter}
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold text-gray-800">Admin</h1>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-auto">
            <div className="p-4 md:p-8">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
