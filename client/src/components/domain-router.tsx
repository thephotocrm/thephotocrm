import { useDomain } from "@/hooks/use-domain";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import InvalidPortal from "@/pages/invalid-portal";
import { ReactNode, useEffect } from "react";
import { ClientPortalRouter } from './client-portal-router';

interface DomainRouterProps {
  children: ReactNode;
}

export function DomainRouter({ children }: DomainRouterProps) {
  // CRITICAL: All hooks must be called BEFORE any conditional returns (React rules of hooks)
  const { domain, isLoading } = useDomain();
  const { user, loading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Redirect root path to appropriate landing page
  useEffect(() => {
    if (domain?.type === 'client_portal' && domain.isCustomSubdomain && location === '/') {
      // Wait for auth to load before making any decisions
      if (authLoading) return;
      
      // Redirect to client portal or login based on auth status
      if (user) {
        setLocation('/client-portal');
      } else {
        setLocation('/login');
      }
    }
  }, [domain, location, setLocation, user, authLoading]);

  // NOW safe to do conditional returns - all hooks have been called
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Error loading domain information</div>
      </div>
    );
  }

  // BASE CLIENT PORTAL DOMAIN (tpcportal.co) - Show error
  if (domain.type === 'client_portal' && !domain.isCustomSubdomain) {
    return <InvalidPortal />;
  }

  // INVALID PHOTOGRAPHER SUBDOMAIN - Show error
  if (domain.type === 'client_portal' && domain.isCustomSubdomain && domain.photographerNotFound) {
    return <InvalidPortal />;
  }

  // CLIENT PORTAL SUBDOMAIN (slug.tpcportal.co) - Render dedicated client portal routes only
  // This prevents CLIENT-role users from accessing photographer routes and hitting auth loops
  if (domain.type === 'client_portal' && domain.isCustomSubdomain) {
    return <ClientPortalRouter />;
  }

  // PHOTOGRAPHER/DEV DOMAIN (thephotocrm.com or replit.dev) - Render full photographer app
  return <>{children}</>;
}
