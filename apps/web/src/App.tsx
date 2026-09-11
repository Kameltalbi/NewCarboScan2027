import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { NotificationBanner } from "@/components/NotificationBanner";
import { SkipToContent } from "@/components/a11y/SkipToContent";
import { RedirectCarboStart } from "@/components/RedirectCarboStart";
import { CookieBanner } from "@/components/CookieBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnalyticsRouteListener } from "@/components/analytics/AnalyticsRouteListener";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { initErrorMonitoring } from "@/utils/errorMonitoring";


import { Suspense, lazy, useEffect } from "react";
import { Loader2 } from "lucide-react";

// Initialize error monitoring
initErrorMonitoring();

// Pages publiques — lazy loaded pour réduire le bundle initial
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Inscription = lazy(() => import("./pages/Inscription"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SitemapRedirect = lazy(() => import("./pages/SitemapRedirect"));
const Contact = lazy(() => import("./pages/Contact"));
const About = lazy(() => import("./pages/About"));
const Team = lazy(() => import("./pages/Team"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Demo = lazy(() => import("./pages/Demo"));
const DemoSteps = lazy(() => import("./pages/DemoSteps"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const LegalMentions = lazy(() => import("./pages/LegalMentions"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const CGV = lazy(() => import("./pages/CGV"));
const BilanGratuit = lazy(() => import("./pages/BilanGratuit"));
const Changelog = lazy(() => import("./pages/Changelog"));

// Landing pages modules — lazy loaded
const BilanCarbone = lazy(() => import("./pages/BilanCarbone"));
const FacteursEmission = lazy(() => import("./pages/FacteursEmission"));
const EmpreinteProduit = lazy(() => import("./pages/EmpreinteProduit"));
const ACVLanding = lazy(() => import("./pages/ACVLanding"));
const CollectLanding = lazy(() => import("./pages/CollectLanding"));
const DecarbotechLanding = lazy(() => import("./pages/DecarbotechLanding"));
const CBAM = lazy(() => import("./pages/CBAM"));
const WattBimLanding = lazy(() => import("./pages/WattBimLanding"));

// Landing pages SEO sectorielles
const BilanCarboneIndustrie = lazy(() => import("./pages/BilanCarboneIndustrie"));
const BilanCarboneTransport = lazy(() => import("./pages/BilanCarboneTransport"));
const BilanCarboneBTP = lazy(() => import("./pages/BilanCarboneBTP"));
const BilanCarboneAgroalimentaire = lazy(() => import("./pages/BilanCarboneAgroalimentaire"));
const BilanCarboneEnergie = lazy(() => import("./pages/BilanCarboneEnergie"));

const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));

// Nouveau routeur unifié
const AppRouter = lazy(() => import("./app/AppRouter").then(m => ({ default: m.AppRouter })));

// Onboarding
const OnboardingWizard = lazy(() => import("./components/onboarding/OnboardingWizard").then(m => ({ default: m.OnboardingWizard })));

// Autres pages — lazy loaded
const PlanEssentiel = lazy(() => import("./pages/PlanEssentiel"));
const CarboPro = lazy(() => import("./pages/CarboPro"));
const CarboOmnibus = lazy(() => import("./pages/CarboOmnibus"));
const Premium = lazy(() => import("./pages/Premium"));
const Payment = lazy(() => import("./pages/Payment"));
const Checkout = lazy(() => import("./pages/Checkout"));
const SolutionsHome = lazy(() => import("./pages/solutions/SolutionsHome"));
const SolutionsCatalog = lazy(() => import("./pages/solutions/SolutionsCatalog"));
const SolutionsSupport = lazy(() => import("./pages/solutions/SolutionsSupport"));
const FormationBilanCarbone = lazy(() => import("./pages/FormationBilanCarbone"));
const AteliersInternes = lazy(() => import("./pages/AteliersInternes"));
const StrategieDecarbonation = lazy(() => import("./pages/StrategieDecarbonation"));
const EmpreinteProduitCalculator = lazy(() => import("./pages/EmpreinteProduitCalculator"));
const DynamicCarbonCalculator = lazy(() => import("./pages/DynamicCarbonCalculator"));
const EmissionFactors = lazy(() => import("./pages/EmissionFactors").then(m => ({ default: m.EmissionFactors })));
const EmpreinteProduitReport = lazy(() => import("./pages/EmpreinteProduitReport"));
const CBAMCalculator = lazy(() => import("./pages/CBAMCalculator"));
const CarboScanRoi = lazy(() => import("./pages/CarboScanRoi"));
const EconomicSimulator = lazy(() => import("./pages/EconomicSimulator"));
const CarboScanAcademy = lazy(() => import("./pages/CarboScanAcademy"));
const AutresServices = lazy(() => import("./pages/AutresServices"));
const CommentCaMarche = lazy(() => import("./pages/CommentCaMarche").then(m => ({ default: m.CommentCaMarche })));
const AdminBlog = lazy(() => import("./pages/AdminBlog"));
const Developers = lazy(() => import("./pages/Developers"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function App() {
  return (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppDataProvider>
          <TooltipProvider delayDuration={200}>
          <ErrorBoundary>
          <Toaster />
          <Sonner />
          <PWAInstallPrompt />
          <BrowserRouter>
            <SkipToContent />
            <AnalyticsRouteListener />
            <NotificationBanner />
            <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Pages publiques */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/inscription" element={<Inscription />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              <Route path="/team" element={<Team />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/demo-steps" element={<DemoSteps />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/admin/blog" element={<AdminBlog />} />
              <Route path="/legal-mentions" element={<LegalMentions />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/cgv" element={<CGV />} />
              <Route path="/bilan-gratuit" element={<BilanGratuit />} />

              <Route path="/changelog" element={<Changelog />} />
              <Route path="/developers" element={<Developers />} />

              {/* Landing pages modules */}
              <Route path="/bilan-carbone" element={<BilanCarbone />} />
              <Route path="/facteurs-emission" element={<FacteursEmission />} />
              <Route path="/empreinte-produit" element={<EmpreinteProduit />} />
              <Route path="/acv-landing" element={<ACVLanding />} />
              <Route path="/collect" element={<CollectLanding />} />
              <Route path="/decarbotech" element={<DecarbotechLanding />} />
              <Route path="/cbam" element={<CBAM />} />
              <Route path="/wattbim" element={<WattBimLanding />} />

              {/* Landing pages SEO sectorielles */}
              <Route path="/bilan-carbone-industrie" element={<BilanCarboneIndustrie />} />
              <Route path="/bilan-carbone-transport" element={<BilanCarboneTransport />} />
              <Route path="/bilan-carbone-btp" element={<BilanCarboneBTP />} />
              <Route path="/bilan-carbone-agroalimentaire" element={<BilanCarboneAgroalimentaire />} />
              <Route path="/bilan-carbone-energie" element={<BilanCarboneEnergie />} />

              {/* Onboarding */}
              <Route path="/onboarding" element={
                <Suspense fallback={<LoadingFallback />}>
                  <OnboardingWizard />
                </Suspense>
              } />

              {/* NOUVELLE STRUCTURE DE NAVIGATION - Routes unifiées */}
              <Route path="/app/*" element={
                <Suspense fallback={<LoadingFallback />}>
                  <AppRouter />
                </Suspense>
              } />

              {/* Admin */}
              <Route path="/superadmin/*" element={
                <Suspense fallback={<LoadingFallback />}>
                  <SuperAdmin />
                </Suspense>
              } />

              {/* Redirections compatibilité */}
              <Route path="/carbo-start/*" element={<RedirectCarboStart />} />
              
              {/* Autres pages */}
              <Route path="/plan-essentiel" element={<PlanEssentiel />} />
              <Route path="/carbo-pro" element={<CarboPro />} />
              <Route path="/carbo-omnibus" element={<CarboOmnibus />} />
              <Route path="/premium" element={<Premium />} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/solutions" element={<SolutionsHome />} />
              <Route path="/solutions/solutions" element={<SolutionsCatalog />} />
              <Route path="/solutions/accompagnement" element={<SolutionsSupport />} />
              <Route path="/formation-bilan-carbone" element={<FormationBilanCarbone />} />
              <Route path="/ateliers-internes" element={<AteliersInternes />} />
              <Route path="/strategie-decarbonation" element={<StrategieDecarbonation />} />
              <Route path="/empreinte-produit-calculator" element={<EmpreinteProduitCalculator />} />
              <Route path="/calculateur-carbone" element={<EmpreinteProduitCalculator />} />
              <Route path="/dynamic-questionnaire" element={<DynamicCarbonCalculator />} />
              <Route path="/emission-factors" element={<EmissionFactors />} />
              <Route path="/empreinte-produit-report" element={<EmpreinteProduitReport />} />
              <Route path="/cbam-calculator" element={<CBAMCalculator />} />
              <Route path="/calculateur-roi" element={<CarboScanRoi />} />
              <Route path="/roi-carboscan" element={<Navigate to="/calculateur-roi" replace />} />
              <Route path="/simulateur-economique" element={<EconomicSimulator />} />
              <Route path="/carboscan-academy" element={<CarboScanAcademy />} />
              <Route path="/autres-services" element={<AutresServices />} />
              <Route path="/comment-ca-marche" element={<CommentCaMarche />} />

              <Route path="/sitemap" element={<SitemapRedirect />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            <CookieBanner />
          </BrowserRouter>
          </ErrorBoundary>
          </TooltipProvider>
        </AppDataProvider>
      </AuthProvider>
    </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
