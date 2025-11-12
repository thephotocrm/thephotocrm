import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    weddingDate?: string;
    stage: {
      name: string;
    };
  };
  photographer: {
    businessName: string;
    logoUrl?: string;
  };
  projects?: Array<{
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
}

export default function ClientPortal() {
  const { user, loading, refetchUser } = useAuth();
  const [, setLocation] = useLocation();
  const [tokenStatus, setTokenStatus] = useState<"idle" | "validating" | "success" | "error">("idle");
  const [tokenError, setTokenError] = useState("");

  // Check for magic link token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token && !user) {
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
          
          // Remove token from URL immediately to prevent re-validation
          window.history.replaceState({}, '', '/client-portal');
          
          // Refresh user auth state
          await refetchUser();
          
          // Smart routing based on token type and project count
          // Use setTimeout to ensure navigation happens after state update
          setTimeout(() => {
            if (data.loginMode === 'PROJECT' && data.projectId) {
              // Project-specific link - go directly to that project
              console.log("Redirecting to project:", data.projectId);
              setLocation(`/client-portal/projects/${data.projectId}`);
            } else if (data.loginMode === 'CLIENT') {
              // Generic portal link - check project count
              if (data.projects && data.projects.length === 1) {
                // Single project - auto-redirect
                console.log("Single project - auto-redirecting to:", data.projects[0].id);
                setLocation(`/client-portal/projects/${data.projects[0].id}`);
              } else if (data.projects && data.projects.length > 1) {
                // Multiple projects - show selection page
                console.log("Multiple projects - showing selection");
                setLocation('/client-portal/select-project');
              } else {
                // No projects - stay on main portal
                console.log("No projects - staying on portal");
              }
            }
          }, 100);
        } catch (error) {
          console.error("Token validation error:", error);
          setTokenStatus("error");
          setTokenError("Failed to validate access link");
        }
      };

      validateToken();
    }
  }, [user, refetchUser, setLocation]);

  // Fetch client portal data from API
  const { data: portalData, isLoading: portalLoading } = useQuery<ClientPortalData>({
    queryKey: ["/api/client-portal"],
    enabled: !!user
  });

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

  // For client portal access, redirect to login if not authenticated
  if (!loading && !user && tokenStatus !== "validating") {
    setLocation("/login");
    return null;
  }

  if (loading || portalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Fallback to mock data if API fails
  const fallbackData: ClientPortalData = {
    client: {
      firstName: "Emily",
      lastName: "Peterson",
      email: "emily.peterson@email.com",
      phone: "(555) 123-4567",
      weddingDate: "2024-06-15",
      stage: { name: "Consultation" }
    },
    photographer: {
      businessName: "Sarah Johnson Photography",
      logoUrl: undefined
    },
    checklistItems: [
      { id: "1", title: "Send welcome packet", completedAt: "2024-01-15", orderIndex: 0 },
      { id: "2", title: "Schedule consultation call", completedAt: null, orderIndex: 1 },
      { id: "3", title: "Send questionnaire", completedAt: null, orderIndex: 2 },
      { id: "4", title: "Create and send proposal", completedAt: null, orderIndex: 3 }
    ],
    links: [
      { id: "1", title: "Client Portal", url: "/client-portal", orderIndex: 0 },
      { id: "2", title: "Wedding Planning Guide", url: "#", orderIndex: 1 },
      { id: "3", title: "Portfolio Gallery", url: "#", orderIndex: 2 }
    ],
    questionnaires: [
      {
        id: "1",
        template: { title: "Wedding Day Details", description: "Help us capture your perfect day" },
        status: "PENDING",
        completedAt: null
      }
    ],
    estimates: [
      {
        id: "1",
        title: "Gold Wedding Package",
        status: "SENT",
        totalCents: 450000,
        token: "est_12345",
        createdAt: "2024-01-10"
      }
    ],
    bookings: [
      {
        id: "1",
        title: "Consultation Call",
        startAt: "2024-02-01T14:00:00",
        endAt: "2024-02-01T15:00:00",
        status: "CONFIRMED"
      }
    ]
  };

  // Use API data if available, otherwise fallback to mock data
  const currentPortalData = portalData || fallbackData;

  const completedChecklistItems = currentPortalData.checklistItems.filter(item => item.completedAt).length;
  const checklistProgress = (completedChecklistItems / currentPortalData.checklistItems.length) * 100;

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Camera className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{currentPortalData.photographer.businessName}</h1>
                <p className="text-sm text-muted-foreground">Client Portal</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome, {currentPortalData.client.firstName} & {currentPortalData.client.lastName}!
          </h2>
          <div className="flex items-center space-x-6 text-muted-foreground">
            {currentPortalData.client.weddingDate && (
              <div className="flex items-center">
                <Heart className="w-4 h-4 mr-2" />
                <span>Wedding: {new Date(currentPortalData.client.weddingDate).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              <span>Status: {currentPortalData.client.stage.name}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Wedding Checklist */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Wedding Checklist
                  </CardTitle>
                  <Badge variant="outline">
                    {completedChecklistItems} of {currentPortalData.checklistItems.length} complete
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
                  {currentPortalData.checklistItems.map((item) => (
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

            {/* Questionnaires */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Questionnaires
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentPortalData.questionnaires.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No questionnaires assigned yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {currentPortalData.questionnaires.map((questionnaire) => (
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

            {/* Estimates & Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Estimates & Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentPortalData.estimates.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No estimates available yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {currentPortalData.estimates.map((estimate) => (
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

            {/* Upcoming Bookings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Upcoming Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentPortalData.bookings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No appointments scheduled yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {currentPortalData.bookings.map((booking) => (
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentPortalData.links.map((link) => (
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

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-3 text-muted-foreground" />
                    <span className="text-sm">{currentPortalData.client.email}</span>
                  </div>
                  {currentPortalData.client.phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-3 text-muted-foreground" />
                      <span className="text-sm">{currentPortalData.client.phone}</span>
                    </div>
                  )}
                  {currentPortalData.client.weddingDate && (
                    <div className="flex items-center">
                      <Heart className="w-4 h-4 mr-3 text-muted-foreground" />
                      <span className="text-sm">
                        {new Date(currentPortalData.client.weddingDate).toLocaleDateString()}
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
    </div>
  );
}
