import { lazy, Suspense, useEffect, useState } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { DomainProvider } from "./hooks/use-domain";
import { DomainRouter } from "./components/domain-router";
import { MobileHeader } from "@/components/layout/mobile-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AdminHeader } from "@/components/admin-header";
import { ChatbotWidget } from "@/components/chatbot-widget";
import OnboardingBanner from "@/components/OnboardingBanner";
import OnboardingModal from "@/components/OnboardingModal";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import LinkGoogle from "@/pages/link-google";
import Dashboard from "@/pages/dashboard";
import Contacts from "@/pages/contacts";
import ContactDetail from "@/pages/contact-detail";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Inbox from "@/pages/inbox";
import Templates from "@/pages/templates-new";
import Automations from "@/pages/automations";
import DripCampaigns from "@/pages/drip-campaigns";
import Packages from "@/pages/packages";
import AddOns from "@/pages/add-ons";
import SmartFiles from "@/pages/smart-files";
import SmartFileBuilder from "@/pages/smart-file-builder";
import Galleries from "@/pages/galleries";
import GalleryDetail from "@/pages/gallery-detail";
import ClientGalleryView from "@/pages/client-gallery-view";
import LeadForms from "@/pages/lead-forms";
import LeadFormBuilder from "@/pages/lead-form-builder";
import WidgetGenerator from "@/pages/widget-generator";
import Questionnaires from "@/pages/questionnaires";
import Scheduling from "@/pages/scheduling";
import Reports from "@/pages/reports";
import Earnings from "@/pages/earnings";
import Settings from "@/pages/settings";
import Tutorials from "@/pages/tutorials";
import LeadHub from "@/pages/lead-hub";
import BudgetEstimator from "@/pages/budget-estimator";
import HowItWorks from "@/pages/how-it-works";
import FacebookAds from "@/pages/facebook-ads";
import GoogleAds from "@/pages/google-ads";
import InstagramAds from "@/pages/instagram-ads";
import PinterestAds from "@/pages/pinterest-ads";
import TikTokAds from "@/pages/tiktok-ads";
import ClientPortal from "@/pages/client-portal";
import ClientPortalProject from "@/pages/client-portal-project";
import SelectProject from "@/pages/select-project";
import Portal from "@/pages/portal";
import PublicSmartFile from "@/pages/public-smart-file";
import SmartFileSuccess from "@/pages/smart-file-success";
import PublicBooking from "@/pages/public-booking";
import PublicBookingCalendar from "@/pages/public-booking-calendar";
import PublicGalleries from "@/pages/public-galleries";
import BookingConfirmation from "@/pages/booking-confirmation";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminSetup from "@/pages/admin-setup";
import LeadFormDemo from "@/pages/lead-form-demo";
import NotFound from "@/pages/not-found";
import PublicReviewSubmit from "@/pages/public-review-submit";
import Testimonials from "@/pages/testimonials";

const Checkout = lazy(() => import("@/pages/checkout"));

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const [location] = useLocation();
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);

  // Fetch photographer data for onboarding (only for photographers)
  const { data: photographer } = useQuery({
    queryKey: ['/api/photographers/me'],
    enabled: !!user && user.role === 'PHOTOGRAPHER'
  });

  // Show onboarding modal on first login
  useEffect(() => {
    if (photographer && !photographer.onboardingCompletedAt && !photographer.onboardingDismissed) {
      setOnboardingModalOpen(true);
    }
  }, [photographer]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }
  
  return (
    <>
      {(user?.role === 'ADMIN' || user?.isImpersonating) && (
        <AdminHeader
          isImpersonating={user?.isImpersonating}
          photographerName={user?.businessName}
          photographerEmail={user?.isImpersonating ? user?.email : undefined}
        />
      )}
      <SidebarProvider fixedHeight={location === '/inbox'}>
        <AppSidebar />
        <SidebarInset>
          {/* Onboarding Banner - Shows on all pages for photographers */}
          {photographer && user.role === 'PHOTOGRAPHER' && (
            <OnboardingBanner 
              photographer={photographer}
              onOpenModal={() => setOnboardingModalOpen(true)}
            />
          )}
          <MobileHeader />
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/admin/dashboard" component={AdminDashboard} />
            <Route path="/contacts" component={Contacts} />
            <Route path="/contacts/:id" component={ContactDetail} />
            <Route path="/projects" component={Projects} />
            <Route path="/projects/:id" component={ProjectDetail} />
            <Route path="/inbox" component={Inbox} />
            <Route path="/templates" component={Templates} />
            <Route path="/automations" component={Automations} />
            <Route path="/drip-campaigns" component={DripCampaigns} />
            <Route path="/packages" component={Packages} />
            <Route path="/add-ons" component={AddOns} />
            <Route path="/smart-files" component={SmartFiles} />
            <Route path="/smart-files/:id/edit" component={SmartFileBuilder} />
            <Route path="/galleries" component={Galleries} />
            <Route path="/galleries/:galleryId" component={GalleryDetail} />
            <Route path="/lead-forms" component={LeadForms} />
            <Route path="/lead-forms/:id/configure" component={LeadFormBuilder} />
            <Route path="/widget-generator" component={WidgetGenerator} />
            <Route path="/questionnaires" component={Questionnaires} />
            <Route path="/scheduling" component={Scheduling} />
            <Route path="/reports" component={Reports} />
            <Route path="/earnings" component={Earnings} />
            <Route path="/lead-hub" component={LeadHub} />
            <Route path="/budget-estimator" component={BudgetEstimator} />
            <Route path="/how-it-works" component={HowItWorks} />
            <Route path="/facebook-ads" component={FacebookAds} />
            <Route path="/google-ads" component={GoogleAds} />
            <Route path="/instagram-ads" component={InstagramAds} />
            <Route path="/pinterest-ads" component={PinterestAds} />
            <Route path="/tiktok-ads" component={TikTokAds} />
            <Route path="/settings" component={Settings} />
            <Route path="/tutorials" component={Tutorials} />
            <Route path="/testimonials" component={Testimonials} />
            <Route component={NotFound} />
          </Switch>
        </SidebarInset>
        <ChatbotWidget 
          context="dashboard" 
          photographerName={user?.businessName} 
          hideOnMobile={location === '/inbox'}
        />
      </SidebarProvider>
      
      {/* Onboarding Modal - Global for photographers */}
      {photographer && user.role === 'PHOTOGRAPHER' && (
        <OnboardingModal
          open={onboardingModalOpen}
          onOpenChange={setOnboardingModalOpen}
        />
      )}
    </>
  );
}

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      {/* Auth routes */}
      <Route path="/auth/login" component={Login} />
      <Route path="/auth/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/link-google" component={LinkGoogle} />
      
      {/* Public pages */}
      <Route path="/checkout">
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <Checkout />
        </Suspense>
      </Route>
      <Route path="/client-portal" component={ClientPortal} />
      <Route path="/client-portal/select-project" component={SelectProject} />
      <Route path="/client-portal/projects/:id" component={ClientPortalProject} />
      <Route path="/portal/:token" component={Portal} />
      <Route path="/smart-file/:token/success" component={SmartFileSuccess} />
      <Route path="/smart-file/:token" component={PublicSmartFile} />
      <Route path="/public/booking/:token" component={PublicBooking} />
      <Route path="/booking/calendar/:publicToken" component={PublicBookingCalendar} />
      <Route path="/public/galleries/:photographerPublicToken" component={PublicGalleries} />
      <Route path="/client/galleries/:galleryId" component={ClientGalleryView} />
      <Route path="/booking/confirmation" component={BookingConfirmation} />
      <Route path="/admin/setup" component={AdminSetup} />
      <Route path="/lead-form" component={LeadFormDemo} />
      <Route path="/reviews/submit/:photographerId" component={PublicReviewSubmit} />
      
      {/* Protected app routes - match specific paths */}
      <Route path="/dashboard"><ProtectedRoutes /></Route>
      <Route path="/admin/dashboard"><ProtectedRoutes /></Route>
      <Route path="/contacts"><ProtectedRoutes /></Route>
      <Route path="/contacts/:id"><ProtectedRoutes /></Route>
      <Route path="/projects"><ProtectedRoutes /></Route>
      <Route path="/projects/:id"><ProtectedRoutes /></Route>
      <Route path="/inbox"><ProtectedRoutes /></Route>
      <Route path="/templates"><ProtectedRoutes /></Route>
      <Route path="/automations"><ProtectedRoutes /></Route>
      <Route path="/drip-campaigns"><ProtectedRoutes /></Route>
      <Route path="/packages"><ProtectedRoutes /></Route>
      <Route path="/add-ons"><ProtectedRoutes /></Route>
      <Route path="/smart-files"><ProtectedRoutes /></Route>
      <Route path="/smart-files/:id/edit"><ProtectedRoutes /></Route>
      <Route path="/galleries"><ProtectedRoutes /></Route>
      <Route path="/galleries/:galleryId"><ProtectedRoutes /></Route>
      <Route path="/lead-forms"><ProtectedRoutes /></Route>
      <Route path="/lead-forms/:id/configure"><ProtectedRoutes /></Route>
      <Route path="/widget-generator"><ProtectedRoutes /></Route>
      <Route path="/questionnaires"><ProtectedRoutes /></Route>
      <Route path="/scheduling"><ProtectedRoutes /></Route>
      <Route path="/reports"><ProtectedRoutes /></Route>
      <Route path="/earnings"><ProtectedRoutes /></Route>
      <Route path="/lead-hub"><ProtectedRoutes /></Route>
      <Route path="/budget-estimator"><ProtectedRoutes /></Route>
      <Route path="/how-it-works"><ProtectedRoutes /></Route>
      <Route path="/facebook-ads"><ProtectedRoutes /></Route>
      <Route path="/google-ads"><ProtectedRoutes /></Route>
      <Route path="/instagram-ads"><ProtectedRoutes /></Route>
      <Route path="/pinterest-ads"><ProtectedRoutes /></Route>
      <Route path="/tiktok-ads"><ProtectedRoutes /></Route>
      <Route path="/settings"><ProtectedRoutes /></Route>
      <Route path="/tutorials"><ProtectedRoutes /></Route>
      <Route path="/testimonials"><ProtectedRoutes /></Route>
      
      {/* Landing page - must be last so other routes match first */}
      <Route path="/" component={Landing} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DomainProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <DomainRouter>
              <Router />
            </DomainRouter>
          </TooltipProvider>
        </AuthProvider>
      </DomainProvider>
    </QueryClientProvider>
  );
}

export default App;
