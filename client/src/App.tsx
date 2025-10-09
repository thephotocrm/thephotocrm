import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { MobileHeader } from "@/components/layout/mobile-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AdminHeader } from "@/components/admin-header";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Templates from "@/pages/templates";
import Automations from "@/pages/automations";
import DripCampaigns from "@/pages/drip-campaigns";
import Packages from "@/pages/packages";
import AddOns from "@/pages/add-ons";
import SmartFiles from "@/pages/smart-files";
import SmartFileBuilder from "@/pages/smart-file-builder";
import LeadForms from "@/pages/lead-forms";
import LeadFormBuilder from "@/pages/lead-form-builder";
import WidgetGenerator from "@/pages/widget-generator";
import Questionnaires from "@/pages/questionnaires";
import Scheduling from "@/pages/scheduling";
import Reports from "@/pages/reports";
import Earnings from "@/pages/earnings";
import Settings from "@/pages/settings";
import ClientPortal from "@/pages/client-portal";
import PublicSmartFile from "@/pages/public-smart-file";
import SmartFileSuccess from "@/pages/smart-file-success";
import PublicBooking from "@/pages/public-booking";
import PublicBookingCalendar from "@/pages/public-booking-calendar";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminSetup from "@/pages/admin-setup";
import NotFound from "@/pages/not-found";

const Checkout = lazy(() => import("@/pages/checkout"));

function ProtectedRoutes() {
  const { user, loading } = useAuth();

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
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <MobileHeader />
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/admin/dashboard" component={AdminDashboard} />
            <Route path="/clients" component={Clients} />
            <Route path="/clients/:id" component={ClientDetail} />
            <Route path="/projects" component={Projects} />
            <Route path="/projects/:id" component={ProjectDetail} />
            <Route path="/templates" component={Templates} />
            <Route path="/automations" component={Automations} />
            <Route path="/drip-campaigns" component={DripCampaigns} />
            <Route path="/packages" component={Packages} />
            <Route path="/add-ons" component={AddOns} />
            <Route path="/smart-files" component={SmartFiles} />
            <Route path="/smart-files/:id/edit" component={SmartFileBuilder} />
            <Route path="/lead-forms" component={LeadForms} />
            <Route path="/lead-forms/:id/configure" component={LeadFormBuilder} />
            <Route path="/widget-generator" component={WidgetGenerator} />
            <Route path="/questionnaires" component={Questionnaires} />
            <Route path="/scheduling" component={Scheduling} />
            <Route path="/reports" component={Reports} />
            <Route path="/earnings" component={Earnings} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </SidebarInset>
      </SidebarProvider>
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
      
      {/* Public pages */}
      <Route path="/checkout">
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <Checkout />
        </Suspense>
      </Route>
      <Route path="/client-portal" component={ClientPortal} />
      <Route path="/smart-file/:token/success" component={SmartFileSuccess} />
      <Route path="/smart-file/:token" component={PublicSmartFile} />
      <Route path="/public/booking/:token" component={PublicBooking} />
      <Route path="/booking/calendar/:publicToken" component={PublicBookingCalendar} />
      <Route path="/admin/setup" component={AdminSetup} />
      
      {/* Protected app routes - match specific paths */}
      <Route path="/dashboard"><ProtectedRoutes /></Route>
      <Route path="/admin/dashboard"><ProtectedRoutes /></Route>
      <Route path="/clients"><ProtectedRoutes /></Route>
      <Route path="/clients/:id"><ProtectedRoutes /></Route>
      <Route path="/projects"><ProtectedRoutes /></Route>
      <Route path="/projects/:id"><ProtectedRoutes /></Route>
      <Route path="/templates"><ProtectedRoutes /></Route>
      <Route path="/automations"><ProtectedRoutes /></Route>
      <Route path="/drip-campaigns"><ProtectedRoutes /></Route>
      <Route path="/packages"><ProtectedRoutes /></Route>
      <Route path="/add-ons"><ProtectedRoutes /></Route>
      <Route path="/smart-files"><ProtectedRoutes /></Route>
      <Route path="/smart-files/:id/edit"><ProtectedRoutes /></Route>
      <Route path="/lead-forms"><ProtectedRoutes /></Route>
      <Route path="/lead-forms/:id/configure"><ProtectedRoutes /></Route>
      <Route path="/widget-generator"><ProtectedRoutes /></Route>
      <Route path="/questionnaires"><ProtectedRoutes /></Route>
      <Route path="/scheduling"><ProtectedRoutes /></Route>
      <Route path="/reports"><ProtectedRoutes /></Route>
      <Route path="/earnings"><ProtectedRoutes /></Route>
      <Route path="/settings"><ProtectedRoutes /></Route>
      
      {/* Landing page - must be last so other routes match first */}
      <Route path="/" component={Landing} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
