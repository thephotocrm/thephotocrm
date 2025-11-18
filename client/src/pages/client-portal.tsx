import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ClientPortalLayout } from "@/components/layout/client-portal-layout";
import { 
  Camera, 
  CheckCircle, 
  Clock, 
  FileText, 
  ExternalLink,
  Calendar,
  Heart,
  Users,
  MapPin,
  Phone,
  Mail,
  Loader2,
  XCircle
} from "lucide-react";

interface ClientPortalData {
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    weddingDate?: string | null;
    stage: {
      name: string;
    };
  };
  photographer: {
    businessName: string;
    logoUrl?: string;
    email?: string;
    phone?: string;
  };
  projects: Array<{
    id: string;
    title: string;
    projectType: string;
    eventDate?: string;
    status: string;
    role: 'PRIMARY' | 'PARTICIPANT';
    stage?: {
      name: string;
    };
    primaryClient: {
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
  checklistItems: Array<{
    id: string;
    title: string;
    completedAt: string | null;
    orderIndex: number;
  }>;
  links: Array<{
    id: string;
    title: string;
    url: string;
    orderIndex: number;
  }>;
  questionnaires: Array<{
    id: string;
    template: {
      title: string;
      description?: string;
    };
    status: string;
    completedAt: string | null;
  }>;
  estimates: Array<{
    id: string;
    title: string;
    status: string;
    totalCents: number;
    token: string;
    createdAt: string;
  }>;
  bookings: Array<{
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    status: string;
  }>;
  hasProjects?: boolean;
}

export default function ClientPortal() {
  const { user, loading, refetchUser } = useAuth();
  const [, setLocation] = useLocation();
  const [tokenStatus, setTokenStatus] = useState<"idle" | "validating" | "success" | "error">("idle");
  const [tokenError, setTokenError] = useState("");
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const hasValidatedToken = useRef(false);
  const hasRedirectedToLogin = useRef(false);

  // Check for magic link token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token && !hasValidatedToken.current) {
      hasValidatedToken.current = true;
      const validateToken = async () => {
        setTokenStatus("validating");
        try {
          const response = await fetch(`/api/client-portal/validate/${token}`, {
            method: "GET",
            credentials: "include"
          });

          if (!response.ok) {
            const data = await response.json();
            setTokenStatus("error");
            setTokenError(data.message || "Invalid or expired link");
            return;
          }

          const data = await response.json();
          setTokenStatus("success");
          
          // Refresh user auth state first
          await refetchUser();
          
          // Smart routing based on token type and project count (navigation happens in useEffect)
          if (data.loginMode === 'PROJECT' && data.projectId) {
            // Project-specific link - go directly to that project
            console.log("Will redirect to project:", data.projectId);
            setRedirectUrl(`/client-portal/projects/${data.projectId}`);
          } else if (data.loginMode === 'CLIENT') {
            // Generic portal link - check project count
            if (data.projects && data.projects.length === 1) {
              // Single project - auto-redirect
              console.log("Single project - will auto-redirect to:", data.projects[0].id);
              setRedirectUrl(`/client-portal/projects/${data.projects[0].id}`);
            } else if (data.projects && data.projects.length > 1) {
              // Multiple projects - show selection page
              console.log("Multiple projects - showing selection");
              setRedirectUrl('/client-portal/select-project');
            } else {
              // No projects - stay on main portal
              console.log("No projects - staying on portal");
            }
          }
        } catch (error) {
          console.error("Token validation error:", error);
          setTokenStatus("error");
          setTokenError("Failed to validate access link");
        }
      };

      validateToken();
    }
  }, [refetchUser]);

  // State-driven navigation in useEffect to prevent React error #185
  useEffect(() => {
    if (redirectUrl) {
      console.log('✅ Redirecting to:', redirectUrl);
      setLocation(redirectUrl);
      // Clear redirect URL after navigation
      setRedirectUrl(null);
    }
  }, [redirectUrl, setLocation]);

  // Redirect to login if not authenticated (prevent infinite loop with ref guard)
  useEffect(() => {
    if (!loading && !user && tokenStatus !== "validating" && !hasRedirectedToLogin.current) {
      hasRedirectedToLogin.current = true;
      setLocation("/login");
    }
  }, [loading, user, tokenStatus, setLocation]);

  // Fetch client portal data from API
  const { data: portalData, isLoading: portalLoading } = useQuery<ClientPortalData>({
    queryKey: ["/api/client-portal"],
    enabled: !!user
  });

  // Auto-redirect to most recent project when data loads
  // ONLY on base /client-portal route to preserve multi-project selection UX
  const [location] = useLocation();
  useEffect(() => {
    const isBasePortalRoute = location === '/client-portal';
    if (isBasePortalRoute && portalData && portalData.projects.length > 0 && !redirectUrl) {
      // Projects are already sorted by createdAt DESC from backend
      // Always redirect to the first (most recent) project
      const mostRecentProject = portalData.projects[0];
      console.log(`🚀 Auto-redirecting to most recent project: ${mostRecentProject.id}`);
      setRedirectUrl(`/client-portal/projects/${mostRecentProject.id}`);
    }
  }, [location, portalData, redirectUrl]);

  // Show token validation state
  if (tokenStatus === "validating") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md" data-testid="card-validating-token">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 py-8">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" data-testid="icon-loading" />
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Verifying your access...</h2>
                <p className="text-sm text-muted-foreground">
                  Please wait while we log you in
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenStatus === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
        <Card className="w-full max-w-md" data-testid="card-token-error">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 py-8">
              <XCircle className="w-12 h-12 text-red-600" data-testid="icon-error" />
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Access Link Invalid</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {tokenError}
                </p>
                <Button onClick={() => setLocation("/login")} data-testid="button-go-to-login">
                  Go to Login
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || portalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // If no data returned from API, show error
  if (!portalData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md" data-testid="card-portal-error">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 py-8">
              <XCircle className="w-12 h-12 text-red-600" />
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Unable to Load Portal</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  There was an error loading your client portal data.
                </p>
                <Button onClick={() => window.location.reload()} data-testid="button-reload">
                  Reload Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasProjects = portalData.projects.length > 0;
  const completedChecklistItems = portalData.checklistItems.filter(item => item.completedAt).length;
  const checklistProgress = portalData.checklistItems.length > 0 
    ? (completedChecklistItems / portalData.checklistItems.length) * 100 
    : 0;

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'COMPLETED':
        return 'default';
      case 'PENDING':
        return 'secondary';
      case 'SENT':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <ClientPortalLayout currentProjectId={portalData.projects[0]?.id}>
      {/* Cover Photo Hero Banner */}
      {/* TODO: Add photographer.coverImageUrl field to schema for custom branding */}
      <div 
        className="relative h-48 md:h-64 w-full bg-cover bg-center bg-gray-100"
        style={{ 
          backgroundImage: 'url(https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1200&h=400&fit=crop)'
        }}
        data-testid="hero-banner"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50"></div>
        <div className="relative h-full flex items-end p-6 md:p-8">
          <div className="text-white max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-1 drop-shadow-lg" data-testid="text-welcome">
              Welcome, {portalData.contact.firstName} {portalData.contact.lastName && `& ${portalData.contact.lastName}`}!
            </h2>
            <div className="flex items-center text-white/90 drop-shadow">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/25">
                {hasProjects ? portalData.contact.stage?.name || 'Active' : 'No Project'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Status info bar */}
        {portalData.contact.weddingDate && (
          <div className="mb-8 flex flex-wrap items-center gap-6 text-muted-foreground">
            <div className="flex items-center">
              <Heart className="w-4 h-4 mr-2" />
              <span>Wedding: {new Date(portalData.contact.weddingDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              <span>Status: {portalData.contact.stage.name}</span>
            </div>
          </div>
        )}

        {/* No Projects Empty State */}
        {!hasProjects && (
          <Card className="mb-8" data-testid="card-no-projects">
            <CardContent className="py-12">
              <div className="text-center">
                <Camera className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Your photographer hasn't assigned any projects to you yet. They'll create your project soon and you'll be able to access all your wedding details here.
                </p>
                {(portalData.photographer.email || portalData.photographer.phone) && (
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">Need to get in touch?</p>
                    {portalData.photographer.email && (
                      <div className="flex items-center justify-center">
                        <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                        <a href={`mailto:${portalData.photographer.email}`} className="text-primary hover:underline">
                          {portalData.photographer.email}
                        </a>
                      </div>
                    )}
                    {portalData.photographer.phone && (
                      <div className="flex items-center justify-center">
                        <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                        <a href={`tel:${portalData.photographer.phone}`} className="text-primary hover:underline">
                          {portalData.photographer.phone}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Wedding Checklist */}
            {hasProjects && portalData.checklistItems.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Wedding Checklist
                    </CardTitle>
                    <Badge variant="outline">
                      {completedChecklistItems} of {portalData.checklistItems.length} complete
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{Math.round(checklistProgress)}%</span>
                    </div>
                    <Progress value={checklistProgress} className="h-2" />
                  </div>
                  
                  <div className="space-y-3">
                    {portalData.checklistItems.map((item) => (
                      <div key={item.id} className="flex items-center space-x-3">
                        <Checkbox 
                          checked={!!item.completedAt} 
                          disabled={!!item.completedAt}
                          data-testid={`checklist-item-${item.id}`}
                        />
                        <span className={item.completedAt ? "line-through text-muted-foreground" : ""}>
                          {item.title}
                        </span>
                        {item.completedAt && (
                          <Badge variant="outline" className="ml-auto">
                            Completed
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Questionnaires */}
            {hasProjects && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Questionnaires
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {portalData.questionnaires.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No questionnaires assigned yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {portalData.questionnaires.map((questionnaire) => (
                      <div key={questionnaire.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div>
                          <h4 className="font-medium">{questionnaire.template.title}</h4>
                          {questionnaire.template.description && (
                            <p className="text-sm text-muted-foreground">{questionnaire.template.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusColor(questionnaire.status)}>
                            {questionnaire.status === 'PENDING' ? 'Complete' : 'Completed'}
                          </Badge>
                          {questionnaire.status === 'PENDING' && (
                            <Button size="sm" data-testid={`complete-questionnaire-${questionnaire.id}`}>
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Estimates & Invoices */}
            {hasProjects && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Estimates & Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {portalData.estimates.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No estimates available yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {portalData.estimates.map((estimate) => (
                        <div key={estimate.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                          <div>
                            <h4 className="font-medium">{estimate.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              Created: {new Date(estimate.createdAt).toLocaleDateString()}
                            </p>
                            <p className="font-mono text-lg">{formatPrice(estimate.totalCents)}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={getStatusColor(estimate.status)}>
                              {estimate.status}
                            </Badge>
                            <Button 
                              size="sm" 
                              onClick={() => setLocation(`/estimates/${estimate.token}`)}
                              data-testid={`view-estimate-${estimate.id}`}
                            >
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Upcoming Bookings */}
            {hasProjects && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Upcoming Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {portalData.bookings.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No appointments scheduled yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {portalData.bookings.map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                          <div>
                            <h4 className="font-medium">{booking.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(booking.startAt).toLocaleDateString()} at{' '}
                              {new Date(booking.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <Badge variant={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Links */}
            {hasProjects && portalData.links.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Links</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {portalData.links.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent transition-colors"
                        data-testid={`quick-link-${link.id}`}
                      >
                        <span className="font-medium">{link.title}</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-3 text-muted-foreground" />
                    <span className="text-sm">{portalData.contact.email}</span>
                  </div>
                  {portalData.contact.phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-3 text-muted-foreground" />
                      <span className="text-sm">{portalData.contact.phone}</span>
                    </div>
                  )}
                  {portalData.contact.weddingDate && (
                    <div className="flex items-center">
                      <Heart className="w-4 h-4 mr-3 text-muted-foreground" />
                      <span className="text-sm">
                        {new Date(portalData.contact.weddingDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Support */}
            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Have questions or need assistance? We're here to help make your wedding photography experience perfect.
                </p>
                <Button className="w-full" data-testid="button-contact-support">
                  Contact Us
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ClientPortalLayout>
  );
}
