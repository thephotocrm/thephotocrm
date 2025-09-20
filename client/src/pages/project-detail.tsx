import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Mail, Phone, MapPin, FileText, DollarSign, Clock, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface Project {
  id: string;
  title: string;
  projectType: string;
  eventDate?: string;
  notes?: string;
  status: string;
  createdAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  stage?: {
    id: string;
    name: string;
  };
}

interface Estimate {
  id: string;
  title: string;
  status: string;
  totalCents: number;
  createdAt: string;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
    enabled: !!user && !!id
  });

  const { data: estimates } = useQuery<Estimate[]>({
    queryKey: ["/api/estimates", "project", id],
    enabled: !!user && !!id
  });

  if (loading || projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Project Not Found</h2>
              <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
              <Link href="/projects">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Projects
                </Button>
              </Link>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getEstimateStatusColor = (status: string | null | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'signed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'paid_partial': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'paid_full': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatEstimateStatus = (status: string | null | undefined) => {
    if (!status) return 'Unknown';
    
    return status.toLowerCase().split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getProjectTypeLabel = (type: string | null | undefined) => {
    if (!type) return 'Unknown';
    return type.charAt(0) + type.slice(1).toLowerCase();
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger data-testid="button-menu-toggle" />
            <Link href="/projects">
              <Button variant="ghost" size="sm" data-testid="button-back-projects">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-semibold" data-testid="text-project-title">
                  {project.title}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" data-testid="badge-project-type">
                    {getProjectTypeLabel(project.projectType)}
                  </Badge>
                  <Badge 
                    className={getStatusColor(project.status)}
                    data-testid="badge-project-status"
                  >
                    {project.status}
                  </Badge>
                  {project.stage && (
                    <Badge variant="outline" data-testid="badge-project-stage">
                      {project.stage.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="font-medium" data-testid="text-client-name">
                    {project.client.firstName} {project.client.lastName}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span data-testid="text-client-email">{project.client.email}</span>
                  </div>
                  {project.client.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span data-testid="text-client-phone">{project.client.phone}</span>
                    </div>
                  )}
                </div>
                <Link href={`/clients/${project.client.id}`}>
                  <Button variant="outline" size="sm" className="w-full" data-testid="button-view-client">
                    View Client Details
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Project Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Project Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.eventDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Event Date:</span>
                    <span className="font-medium" data-testid="text-event-date">
                      {formatDate(project.eventDate)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>Created:</span>
                  <span className="font-medium" data-testid="text-created-date">
                    {formatDate(project.createdAt)}
                  </span>
                </div>
                {project.notes && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Notes:</p>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md" data-testid="text-project-notes">
                      {project.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/proposals/new?clientId=${project.client.id}&projectId=${project.id}`}>
                  <Button variant="outline" size="sm" className="w-full" data-testid="button-create-proposal">
                    <FileText className="w-4 h-4 mr-2" />
                    Create Proposal
                  </Button>
                </Link>
                <Link href={`/clients/${project.client.id}`}>
                  <Button variant="outline" size="sm" className="w-full" data-testid="button-view-full-client">
                    <User className="w-4 h-4 mr-2" />
                    View Full Client Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Proposals/Estimates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Proposals & Estimates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {estimates && estimates.length > 0 ? (
                <div className="space-y-3">
                  {estimates.map((estimate) => (
                    <div 
                      key={estimate.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`estimate-${estimate.id}`}
                    >
                      <div className="space-y-1">
                        <p className="font-medium" data-testid={`estimate-title-${estimate.id}`}>
                          {estimate.title}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={getEstimateStatusColor(estimate.status)}
                            data-testid={`estimate-status-${estimate.id}`}
                          >
                            {formatEstimateStatus(estimate.status)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Created {formatDate(estimate.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold" data-testid={`estimate-amount-${estimate.id}`}>
                          {formatCurrency(estimate.totalCents)}
                        </p>
                        <Link href={`/proposals`}>
                          <Button variant="outline" size="sm" data-testid={`button-view-estimate-${estimate.id}`}>
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No proposals created yet</p>
                  <Link href={`/proposals/new?clientId=${project.client.id}&projectId=${project.id}`}>
                    <Button data-testid="button-create-first-proposal">
                      <FileText className="w-4 h-4 mr-2" />
                      Create First Proposal
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}