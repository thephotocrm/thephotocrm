import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function Portal() {
  const { token } = useParams();
  const [, navigate] = useLocation();
  const { refetchUser } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      console.log('🚀 [PORTAL] Starting validation flow', {
        token: token?.substring(0, 20) + '...',
        pathname: window.location.pathname,
        href: window.location.href
      });

      if (!token) {
        console.error('❌ [PORTAL] No token provided');
        setStatus("error");
        setErrorMessage("No token provided");
        return;
      }

      try {
        // Determine which API endpoint to call based on the actual pathname
        const isClientPortalValidate = window.location.pathname.startsWith('/client-portal/validate/');
        const apiEndpoint = isClientPortalValidate 
          ? `/api/client-portal/validate/${token}`
          : `/api/portal/${token}`;

        console.log('🔍 [PORTAL] Calling API:', {
          pathname: window.location.pathname,
          isClientPortalValidate,
          apiEndpoint
        });

        const response = await fetch(apiEndpoint, {
          method: "GET",
          credentials: "include"
        });

        console.log('📡 [PORTAL] API response:', {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
          const data = await response.json();
          console.error('❌ [PORTAL] Validation failed:', data);
          setStatus("error");
          setErrorMessage(data.message || "Invalid or expired link");
          return;
        }

        const data = await response.json();
        console.log('✅ [PORTAL] Validation successful:', data);
        setStatus("success");

        // CRITICAL: Refetch auth to update user state before redirecting
        console.log('🔄 [PORTAL] Refetching user auth state...');
        const userResult = await refetchUser();
        console.log('✅ [PORTAL] Auth state refreshed:', userResult);

        // Determine redirect URL and set state (navigation happens in useEffect)
        let targetUrl = '/client-portal';
        if (data.redirect) {
          targetUrl = data.redirect;
        } else if (data.projectId) {
          targetUrl = `/client-portal/projects/${data.projectId}`;
        }
        
        console.log('🎯 [PORTAL] Setting redirect URL:', targetUrl);
        setRedirectUrl(targetUrl);
      } catch (error) {
        console.error("❌ [PORTAL] Token validation error:", error);
        setStatus("error");
        setErrorMessage("Failed to validate access link");
      }
    };

    validateToken();
  }, [token, refetchUser]);

  // State-driven navigation in useEffect to prevent React error #185
  useEffect(() => {
    if (redirectUrl) {
      console.log('🚀 [PORTAL-NAV] Navigation effect triggered');
      console.log('🎯 [PORTAL-NAV] Target URL:', redirectUrl);
      console.log('⏰ [PORTAL-NAV] Will navigate in 1500ms...');
      
      // Delay to show success message briefly
      const timer = setTimeout(() => {
        console.log('➡️ [PORTAL-NAV] NAVIGATING NOW to:', redirectUrl);
        navigate(redirectUrl);
        console.log('✅ [PORTAL-NAV] Navigate called');
      }, 1500);
      
      return () => {
        console.log('🧹 [PORTAL-NAV] Cleanup - clearing timer');
        clearTimeout(timer);
      };
    }
  }, [redirectUrl, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md" data-testid="card-portal-status">
        <CardContent className="pt-6">
          {status === "loading" && (
            <div className="flex flex-col items-center space-y-4 py-8">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Verifying access...</h2>
                <p className="text-sm text-muted-foreground">
                  Please wait while we verify your link
                </p>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center space-y-4 py-8">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2 text-green-800">
                  Access verified!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Redirecting you to your project...
                </p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center space-y-4 py-8">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2 text-red-800">
                  Access denied
                </h2>
                <p className="text-sm text-muted-foreground">
                  {errorMessage}
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Please request a new link from your photographer
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
