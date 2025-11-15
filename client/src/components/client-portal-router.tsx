import { ReactNode, useEffect, useRef } from "react";
import { Switch, Route, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import ClientPortal from "@/pages/client-portal";
import ClientPortalProject from "@/pages/client-portal-project";
import SelectProject from "@/pages/select-project";
import Portal from "@/pages/portal";
import PublicSmartFile from "@/pages/public-smart-file";
import SmartFileSuccess from "@/pages/smart-file-success";
import PublicBooking from "@/pages/public-booking";
import PublicBookingCalendar from "@/pages/public-booking-calendar";
import PublicGalleries from "@/pages/public-galleries";
import ClientGalleryView from "@/pages/client-gallery-view";
import BookingConfirmation from "@/pages/booking-confirmation";
import PublicReviewSubmit from "@/pages/public-review-submit";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function ClientPortalGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const hasRedirected = useRef(false);

  // Use useEffect for redirect to prevent React error #185
  useEffect(() => {
    if (!loading && (!user || user.role !== 'CLIENT') && !hasRedirected.current) {
      hasRedirected.current = true;
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== 'CLIENT') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Redirecting...</div>
      </div>
    );
  }

  return <>{children}</>;
}

export function ClientPortalRouter() {
  return (
    <div className="min-h-screen">
      <Switch>
        {/* Client portal routes - require CLIENT role authentication */}
        <Route path="/client-portal">
          <ClientPortalGuard>
            <ClientPortal />
          </ClientPortalGuard>
        </Route>
        <Route path="/client-portal/select-project">
          <ClientPortalGuard>
            <SelectProject />
          </ClientPortalGuard>
        </Route>
        <Route path="/client-portal/projects/:id">
          <ClientPortalGuard>
            <ClientPortalProject />
          </ClientPortalGuard>
        </Route>
        
        {/* Magic link validation routes - token-based, no auth required */}
        <Route path="/client-portal/validate/:token" component={Portal} />
        <Route path="/portal/:token" component={Portal} />
        
        {/* Public Smart File routes - token-based, no auth required */}
        <Route path="/smart-file/:token/success" component={SmartFileSuccess} />
        <Route path="/smart-file/:token" component={PublicSmartFile} />
        
        {/* Public Booking routes - token-based, no auth required */}
        <Route path="/public/booking/:token" component={PublicBooking} />
        <Route path="/booking/calendar/:publicToken" component={PublicBookingCalendar} />
        <Route path="/booking/confirmation" component={BookingConfirmation} />
        
        {/* Public Gallery routes - token-based or photographer-level access */}
        <Route path="/public/galleries/:photographerPublicToken" component={PublicGalleries} />
        <Route path="/client/galleries/:galleryId" component={ClientGalleryView} />
        
        {/* Public Review submission */}
        <Route path="/reviews/submit/:photographerId" component={PublicReviewSubmit} />
        
        {/* Login fallback for protected client routes */}
        <Route path="/login" component={Login} />
        
        {/* Catch-all */}
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}
