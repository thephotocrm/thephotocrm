import { Switch, Route } from "wouter";
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
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Proposals from "@/pages/proposals";
import ProposalNew from "@/pages/proposal-new";
import Templates from "@/pages/templates";
import Automations from "@/pages/automations";
import DripCampaigns from "@/pages/drip-campaigns";
import Packages from "@/pages/packages";
import WidgetGenerator from "@/pages/widget-generator";
import Questionnaires from "@/pages/questionnaires";
import Scheduling from "@/pages/scheduling";
import Reports from "@/pages/reports";
import Earnings from "@/pages/earnings";
import Settings from "@/pages/settings";
import Checkout from "@/pages/checkout";
import ClientPortal from "@/pages/client-portal";
import PublicProposal from "@/pages/public-proposal";
import PublicBooking from "@/pages/public-booking";
import PublicBookingCalendar from "@/pages/public-booking-calendar";
import AdminDashboard from "@/pages/admin-dashboard";
import NotFound from "@/pages/not-found";

function ProtectedRoutes() {
  const { user } = useAuth();
  
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
            <Route path="/proposals" component={Proposals} />
            <Route path="/proposals/new" component={ProposalNew} />
            <Route path="/templates" component={Templates} />
            <Route path="/automations" component={Automations} />
            <Route path="/drip-campaigns" component={DripCampaigns} />
            <Route path="/packages" component={Packages} />
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
      
      {/* Public pages */}
      <Route path="/checkout" component={Checkout} />
      <Route path="/client-portal" component={ClientPortal} />
      <Route path="/public/proposals/:token" component={PublicProposal} />
      <Route path="/public/booking/:token" component={PublicBooking} />
      <Route path="/booking/calendar/:publicToken" component={PublicBookingCalendar} />
      
      {/* Protected app routes - match specific paths */}
      <Route path="/dashboard"><ProtectedRoutes /></Route>
      <Route path="/admin/dashboard"><ProtectedRoutes /></Route>
      <Route path="/clients"><ProtectedRoutes /></Route>
      <Route path="/clients/:id"><ProtectedRoutes /></Route>
      <Route path="/projects"><ProtectedRoutes /></Route>
      <Route path="/projects/:id"><ProtectedRoutes /></Route>
      <Route path="/proposals"><ProtectedRoutes /></Route>
      <Route path="/proposals/new"><ProtectedRoutes /></Route>
      <Route path="/templates"><ProtectedRoutes /></Route>
      <Route path="/automations"><ProtectedRoutes /></Route>
      <Route path="/drip-campaigns"><ProtectedRoutes /></Route>
      <Route path="/packages"><ProtectedRoutes /></Route>
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
