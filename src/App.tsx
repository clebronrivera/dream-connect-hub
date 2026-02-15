import { lazy, Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";

const Index = lazy(() => import("./pages/Index"));
const Puppies = lazy(() => import("./pages/Puppies"));
const Consultation = lazy(() => import("./pages/Consultation"));
const Essentials = lazy(() => import("./pages/Essentials"));
const Contact = lazy(() => import("./pages/Contact"));
const Breeds = lazy(() => import("./pages/Breeds"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/admin/Login"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const PuppiesList = lazy(() => import("./pages/admin/puppies/PuppiesList"));
const PuppyForm = lazy(() => import("./pages/admin/puppies/PuppyForm"));
const ProductsList = lazy(() => import("./pages/admin/inventory/ProductsList"));
const ProductForm = lazy(() => import("./pages/admin/inventory/ProductForm"));
const KitsList = lazy(() => import("./pages/admin/inventory/KitsList"));
const KitForm = lazy(() => import("./pages/admin/inventory/KitForm"));
const Inquiries = lazy(() => import("./pages/admin/Inquiries"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/puppies" element={<Puppies />} />
            <Route path="/consultation" element={<Consultation />} />
            <Route path="/essentials" element={<Essentials />} />
            <Route path="/contact" element={<Contact />} />
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
                <Route path="inventory/products" element={<ProductsList />} />
                <Route path="inventory/products/new" element={<ProductForm />} />
                <Route path="inventory/products/:id/edit" element={<ProductForm />} />
                <Route path="inventory/kits" element={<KitsList />} />
                <Route path="inventory/kits/new" element={<KitForm />} />
                <Route path="inventory/kits/:id/edit" element={<KitForm />} />
                <Route path="inquiries" element={<Inquiries />} />
              </Route>
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
