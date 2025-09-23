import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { MobileHeader } from "@/components/layout/mobile-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
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
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/client-portal" component={ClientPortal} />
      <Route path="/public/proposals/:token" component={PublicProposal} />
      <Route path="/public/booking/:token" component={PublicBooking} />
      <Route>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <MobileHeader />
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/clients" component={Clients} />
              <Route path="/clients/:id" component={ClientDetail} />
              <Route path="/projects" component={Projects} />
              <Route path="/projects/:id" component={ProjectDetail} />
              <Route path="/proposals" component={Proposals} />
              <Route path="/proposals/new" component={ProposalNew} />
              <Route path="/templates" component={Templates} />
              <Route path="/automations" component={Automations} />
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
      </Route>
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
