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

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
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

        console.log('🔍 Portal validation:', {
          pathname: window.location.pathname,
          isClientPortalValidate,
          apiEndpoint,
          token: token.substring(0, 10) + '...'
        });

        const response = await fetch(apiEndpoint, {
          method: "GET",
          credentials: "include"
        });

        if (!response.ok) {
          const data = await response.json();
          setStatus("error");
          setErrorMessage(data.message || "Invalid or expired link");
          return;
        }

        const data = await response.json();
        setStatus("success");

        // CRITICAL: Refetch auth to update user state before redirecting
        // This prevents race condition where /client-portal loads before auth is updated
        console.log('✅ Magic link validated, refreshing auth state...');
        await refetchUser();
        console.log('✅ Auth state refreshed, redirecting...');

        // Redirect based on response type
        if (data.redirect) {
          // Client portal tokens may include redirect URL
          setTimeout(() => {
            navigate(data.redirect);
          }, 1500);
        } else if (data.projectId) {
          // Project-specific token
          setTimeout(() => {
            navigate(`/client-portal/projects/${data.projectId}`);
          }, 1500);
        } else {
          // Generic client token - go to project selection or overview
          setTimeout(() => {
            navigate('/client-portal');
          }, 1500);
        }
      } catch (error) {
        console.error("Portal token validation error:", error);
        setStatus("error");
        setErrorMessage("Failed to validate access link");
      }
    };

    validateToken();
  }, [token, navigate, refetchUser]);

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
