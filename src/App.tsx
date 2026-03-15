import { lazy, Suspense, type ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";

import Index from "./pages/Index";
import Puppies from "./pages/Puppies";
import Consultation from "./pages/Consultation";
import Essentials from "./pages/Essentials";
import Contact from "./pages/Contact";
import UpcomingLitters from "./pages/UpcomingLitters";
import Breeds from "./pages/Breeds";
import NotFound from "./pages/NotFound";
const Login = lazy(() => import("./pages/admin/Login"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const PuppiesList = lazy(() => import("./pages/admin/puppies/PuppiesList"));
const PuppyForm = lazy(() => import("./pages/admin/puppies/PuppyForm"));
const LitterForm = lazy(() => import("./pages/admin/litters/LitterForm"));
const BreedingDogsList = lazy(() => import("./pages/admin/breeding-dogs/BreedingDogsList"));
const BreedingDogForm = lazy(() => import("./pages/admin/breeding-dogs/BreedingDogForm"));
const UpcomingLittersList = lazy(() => import("./pages/admin/upcoming-litters/UpcomingLittersList"));
const UpcomingLitterForm = lazy(() => import("./pages/admin/upcoming-litters/UpcomingLitterForm"));
const ProductsList = lazy(() => import("./pages/admin/inventory/ProductsList"));
const ProductForm = lazy(() => import("./pages/admin/inventory/ProductForm"));
const KitsList = lazy(() => import("./pages/admin/inventory/KitsList"));
const KitForm = lazy(() => import("./pages/admin/inventory/KitForm"));
const Inquiries = lazy(() => import("./pages/admin/Inquiries"));
const BusinessModes = lazy(() => import("./pages/admin/BusinessModes"));

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute - reduces refetch on tab focus for admin/dashboard
      },
    },
  });
}

type AppProvidersProps = {
  children: ReactNode;
  queryClient: QueryClient;
};

export function AppProviders({ children, queryClient }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {children}
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/puppies" element={<Puppies />} />
        <Route path="/puppies/:id" element={<Puppies />} />
        <Route path="/consultation" element={<Consultation />} />
        <Route path="/essentials" element={<Essentials />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/upcoming-litters" element={<UpcomingLitters />} />
        <Route path="/breeds" element={<Breeds />} />

        {/* Admin login */}
        <Route path="/admin/login" element={<Login />} />

        {/* Protected admin routes */}
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="puppies" element={<PuppiesList />} />
            <Route path="puppies/new" element={<PuppyForm />} />
            <Route path="puppies/:id/edit" element={<PuppyForm />} />
            <Route path="litters/:id/edit" element={<LitterForm />} />
            <Route path="breeding-dogs" element={<BreedingDogsList />} />
            <Route path="breeding-dogs/new" element={<BreedingDogForm />} />
            <Route path="breeding-dogs/:id/edit" element={<BreedingDogForm />} />
            <Route path="upcoming-litters" element={<UpcomingLittersList />} />
            <Route path="upcoming-litters/new" element={<UpcomingLitterForm />} />
            <Route path="upcoming-litters/:id/edit" element={<UpcomingLitterForm />} />
            <Route path="inventory/products" element={<ProductsList />} />
            <Route path="inventory/products/new" element={<ProductForm />} />
            <Route path="inventory/products/:id/edit" element={<ProductForm />} />
            <Route path="inventory/kits" element={<KitsList />} />
            <Route path="inventory/kits/new" element={<KitForm />} />
            <Route path="inventory/kits/:id/edit" element={<KitForm />} />
            <Route path="inquiries" element={<Inquiries />} />
            <Route path="business-modes" element={<BusinessModes />} />
          </Route>
        </Route>

        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

type AppProps = {
  router?: ReactNode;
  queryClient?: QueryClient;
};

const defaultQueryClient = createAppQueryClient();

const App = ({ router, queryClient = defaultQueryClient }: AppProps) => (
  <AppProviders queryClient={queryClient}>
    {router ?? (
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    )}
  </AppProviders>
);

export default App;
