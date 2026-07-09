import { Suspense, type ReactNode } from "react";
import { lazyWithRetry } from "@/lib/lazy-with-retry";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/lib/query-client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BreederAuthProvider } from "@/contexts/BreederAuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { BreederRoute } from "@/components/breeder/BreederRoute";
import { BreederLayout } from "@/components/breeder/BreederLayout";
import { GoogleTranslateRuntime } from "@/components/i18n/GoogleTranslateRuntime";

import { ErrorBoundary } from "@/components/ErrorBoundary";
const Index = lazyWithRetry(() => import("./pages/Index"));
const Puppies = lazyWithRetry(() => import("./pages/Puppies"));
const Consultation = lazyWithRetry(() => import("./pages/Consultation"));
const Essentials = lazyWithRetry(() => import("./pages/Essentials"));
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const UpcomingLitters = lazyWithRetry(() => import("./pages/UpcomingLitters"));
const Breeds = lazyWithRetry(() => import("./pages/Breeds"));
const BreedDetail = lazyWithRetry(() => import("./pages/BreedDetail"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Login = lazyWithRetry(() => import("./pages/admin/Login"));
const Dashboard = lazyWithRetry(() => import("./pages/admin/Dashboard"));
const PuppiesList = lazyWithRetry(() => import("./pages/admin/puppies/PuppiesList"));
const PuppyForm = lazyWithRetry(() => import("./pages/admin/puppies/PuppyForm"));
const LitterForm = lazyWithRetry(() => import("./pages/admin/litters/LitterForm"));
const BreedingDogsList = lazyWithRetry(() => import("./pages/admin/breeding-dogs/BreedingDogsList"));
const BreedingDogForm = lazyWithRetry(() => import("./pages/admin/breeding-dogs/BreedingDogForm"));
const UpcomingLittersList = lazyWithRetry(() => import("./pages/admin/upcoming-litters/UpcomingLittersList"));
const UpcomingLitterForm = lazyWithRetry(() => import("./pages/admin/upcoming-litters/UpcomingLitterForm"));
const ProductsList = lazyWithRetry(() => import("./pages/admin/inventory/ProductsList"));
const ProductForm = lazyWithRetry(() => import("./pages/admin/inventory/ProductForm"));
const KitsList = lazyWithRetry(() => import("./pages/admin/inventory/KitsList"));
const KitForm = lazyWithRetry(() => import("./pages/admin/inventory/KitForm"));
const Inquiries = lazyWithRetry(() => import("./pages/admin/Inquiries"));
const BusinessModes = lazyWithRetry(() => import("./pages/admin/BusinessModes"));
const DepositAgreement = lazyWithRetry(() => import("./pages/DepositAgreement"));
const PaymentDashboard = lazyWithRetry(() => import("./pages/PaymentDashboard"));
const AgreementsPage = lazyWithRetry(() => import("./pages/admin/AgreementsPage"));
const PickupHandover = lazyWithRetry(() => import("./pages/admin/PickupHandover"));
const PaymentMethodsSettings = lazyWithRetry(() => import("./pages/admin/PaymentMethodsSettings"));
const FaqPage = lazyWithRetry(() => import("./pages/FaqPage"));
const FaqManager = lazyWithRetry(() => import("./pages/admin/FaqManager"));
const DreamyReviews = lazyWithRetry(() => import("./pages/DreamyReviews"));
const TestimonialsList = lazyWithRetry(() => import("./pages/admin/TestimonialsList"));
const Newsletter = lazyWithRetry(() => import("./pages/admin/Newsletter"));
const BusinessInfoPage = lazyWithRetry(() => import("./pages/admin/BusinessInfoPage"));
const TrainingPlanPage = lazyWithRetry(() => import("./pages/TrainingPlanPage"));
const DepositRequests = lazyWithRetry(() => import("./pages/admin/DepositRequests"));
const RequestDeposit = lazyWithRetry(() => import("./pages/RequestDeposit"));
const AgreementDownload = lazyWithRetry(() => import("./pages/AgreementDownload"));
const ForgotPassword = lazyWithRetry(() => import("./pages/admin/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/admin/ResetPassword"));
const HeroV3Mockup = lazyWithRetry(() => import("./pages/dev/HeroV3Mockup"));
const UpcomingLittersV2Mockup = lazyWithRetry(() => import("./pages/dev/UpcomingLittersV2Mockup"));
const BreederPasscodeSettings = lazyWithRetry(() => import("./pages/admin/settings/BreederPasscodeSettings"));
const BreederLogin = lazyWithRetry(() => import("./pages/breeder/BreederLogin"));
const BreederHome = lazyWithRetry(() => import("./pages/breeder/BreederHome"));
const BreederLitter = lazyWithRetry(() => import("./pages/breeder/BreederLitter"));
const BreederLitterSetup = lazyWithRetry(() => import("./pages/breeder/BreederLitterSetup"));
const BreederPuppiesWizard = lazyWithRetry(() => import("./pages/breeder/BreederPuppiesWizard"));
const BreederPuppyCapture = lazyWithRetry(() => import("./pages/breeder/BreederPuppyCapture"));
const BreederLitterDates = lazyWithRetry(() => import("./pages/breeder/BreederLitterDates"));
const BreederParents = lazyWithRetry(() => import("./pages/breeder/BreederParents"));
const BreederParentEdit = lazyWithRetry(() => import("./pages/breeder/BreederParentEdit"));
const BreederUpcomingLitterNew = lazyWithRetry(() => import("./pages/breeder/BreederUpcomingLitterNew"));
const BreederPuppiesPage = lazyWithRetry(() => import("./pages/breeder/BreederPuppiesPage"));
const BreederPhotos = lazyWithRetry(() => import("./pages/breeder/BreederPhotos"));
const BreederLittersPage = lazyWithRetry(() => import("./pages/breeder/BreederLittersPage"));
const About = lazyWithRetry(() => import("./pages/About"));
const OurDogs = lazyWithRetry(() => import("./pages/OurDogs"));

type AppProvidersProps = {
  children: ReactNode;
  queryClient: QueryClient;
};

export function AppProviders({ children, queryClient }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <LanguageProvider>
          <AuthProvider>
            <BreederAuthProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                {children}
              </TooltipProvider>
            </BreederAuthProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export function AppRoutes() {
  return (
    <ErrorBoundary>
      <GoogleTranslateRuntime />
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
        <Route path="/our-dogs" element={<OurDogs />} />
        <Route path="/breeds" element={<Breeds />} />
        <Route path="/breeds/:slug" element={<BreedDetail />} />
        <Route path="/deposit" element={<DepositAgreement />} />
        <Route path="/payment/:agreementId/:buyerToken" element={<PaymentDashboard />} />
        <Route path="/agreements/:agreementId/:buyerToken/download" element={<AgreementDownload />} />
        <Route path="/request-deposit" element={<RequestDeposit />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/dreamy-reviews" element={<DreamyReviews />} />
        <Route path="/training-plan" element={<TrainingPlanPage />} />
        <Route path="/training-plan/:problemType" element={<TrainingPlanPage />} />
        <Route path="/about" element={<About />} />

        {/* Dev / design mockups (URL-only; not linked from public nav) */}
        {import.meta.env.DEV && (
          <>
            <Route path="/__mockup/hero-v3" element={<HeroV3Mockup />} />
            <Route path="/__mockup/upcoming-v2" element={<UpcomingLittersV2Mockup />} />
          </>
        )}

        {/* Breeder tool (Yolanda) — token-gated via localStorage */}
        <Route path="/breeder/login" element={<BreederLogin />} />
        <Route path="/breeder" element={<BreederRoute />}>
          <Route element={<BreederLayout />}>
            <Route index element={<BreederHome />} />
            <Route path="litters" element={<BreederLittersPage />} />
            <Route path="puppies" element={<BreederPuppiesPage />} />
            <Route path="photos" element={<BreederPhotos />} />
            <Route path="litters/:litterId" element={<BreederLitter />} />
            <Route path="litters/:litterId/setup" element={<BreederLitterSetup />} />
            <Route path="litters/:litterId/wizard" element={<BreederPuppiesWizard />} />
            <Route path="litters/:litterId/dates" element={<BreederLitterDates />} />
            <Route path="puppies/:puppyId/capture" element={<BreederPuppyCapture />} />
            <Route path="parents" element={<BreederParents />} />
            <Route path="parents/new" element={<BreederParentEdit />} />
            <Route path="parents/:dogId/edit" element={<BreederParentEdit />} />
            <Route path="upcoming-litters/new" element={<BreederUpcomingLitterNew />} />
          </Route>
        </Route>

        {/* Admin login + password reset */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin/forgot-password" element={<ForgotPassword />} />
        <Route path="/admin/reset-password" element={<ResetPassword />} />

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
            <Route path="agreements" element={<AgreementsPage />} />
            <Route path="pickup/:agreementId" element={<PickupHandover />} />
            <Route path="deposit-requests" element={<DepositRequests />} />
            <Route path="payment-settings" element={<PaymentMethodsSettings />} />
            <Route path="settings/breeder-passcode" element={<BreederPasscodeSettings />} />
            <Route path="faq" element={<FaqManager />} />
            <Route path="testimonials" element={<TestimonialsList />} />
            <Route path="newsletter" element={<Newsletter />} />
            <Route path="settings/business-info" element={<BusinessInfoPage />} />
          </Route>
        </Route>

        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
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
