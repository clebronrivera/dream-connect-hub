import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Index from "./pages/Index";
import Puppies from "./pages/Puppies";
import Consultation from "./pages/Consultation";
import Essentials from "./pages/Essentials";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import PuppiesList from "./pages/admin/puppies/PuppiesList";
import PuppyForm from "./pages/admin/puppies/PuppyForm";
import ProductsList from "./pages/admin/inventory/ProductsList";
import ProductForm from "./pages/admin/inventory/ProductForm";
import KitsList from "./pages/admin/inventory/KitsList";
import KitForm from "./pages/admin/inventory/KitForm";
import PuppyInquiries from "./pages/admin/leads/PuppyInquiries";
import Consultations from "./pages/admin/leads/Consultations";
import ProductInquiries from "./pages/admin/leads/ProductInquiries";
import ContactMessages from "./pages/admin/leads/ContactMessages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/puppies" element={<Puppies />} />
            <Route path="/consultation" element={<Consultation />} />
            <Route path="/essentials" element={<Essentials />} />
            <Route path="/contact" element={<Contact />} />
            
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
                <Route path="leads/puppy-inquiries" element={<PuppyInquiries />} />
                <Route path="leads/consultations" element={<Consultations />} />
                <Route path="leads/product-inquiries" element={<ProductInquiries />} />
                <Route path="leads/contact-messages" element={<ContactMessages />} />
              </Route>
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
