import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Camera,
  ChevronDown,
  LayoutDashboard,
  Activity,
  CheckSquare,
  FileText,
  CreditCard,
  StickyNote,
  Settings,
  LogOut,
  Calendar,
  Heart,
  MapPin,
  Phone,
  Mail,
  Loader2,
  Image as ImageIcon,
  Download,
  Eye,
  Clock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClientProject {
  id: string;
  title: string;
  projectType: string;
  eventDate?: string;
  status: string;
  role: 'PRIMARY' | 'PARTICIPANT';
  stage?: {
    name: string;
  };
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  photographer: {
    businessName: string;
    logoUrl?: string;
  };
  activities?: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    createdAt: string;
  }>;
  smartFiles?: Array<{
    id: string;
    title: string;
    status: string;
    totalCents: number;
    token: string;
    createdAt: string;
  }>;
  checklistItems?: Array<{
    id: string;
    title: string;
    completedAt: string | null;
    orderIndex: number;
  }>;
  galleries?: Array<{
    id: string;
    title: string;
    imageCount: number;
    isPublic: boolean;
    createdAt: string;
  }>;
  notes?: Array<{
    id: string;
    noteText: string;
    createdAt: string;
  }>;
}

type TabType = 'overview' | 'activity' | 'tasks' | 'files' | 'payments' | 'notes';

export default function ClientPortalProject() {
  const { user, loading: authLoading, logout } = useAuth();
  const [, params] = useRoute("/client-portal/projects/:id");
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const projectId = params?.id;

  // Fetch project data
  const { data: project, isLoading } = useQuery<ClientProject>({
    queryKey: ["/api/client-portal/projects", projectId],
    enabled: !!projectId && !!user
  });

  // Fetch client's other projects for switcher
  const { data: allProjects } = useQuery<ClientProject[]>({
    queryKey: ["/api/client-portal/projects"],
    enabled: !!user
  });

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    setLocation("/login");
    return null;
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold mb-2">Project not found</h2>
              <p className="text-sm text-muted-foreground mb-4">
                You don't have access to this project.
              </p>
              <Button onClick={() => setLocation("/client-portal")}>
                Back to Portal
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

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
      case 'SIGNED':
      case 'PAID':
        return 'default';
      case 'PENDING':
      case 'SENT':
        return 'secondary';
      case 'VIEWED':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const navItems = [
    { id: 'overview' as TabType, label: 'Overview', icon: LayoutDashboard },
    { id: 'activity' as TabType, label: 'Activity', icon: Activity },
    { id: 'tasks' as TabType, label: 'Tasks', icon: CheckSquare },
    { id: 'files' as TabType, label: 'Files', icon: FileText },
    { id: 'payments' as TabType, label: 'Payments', icon: CreditCard },
    { id: 'notes' as TabType, label: 'Notes', icon: StickyNote },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        {/* Header with Project Switcher */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Camera className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold truncate">{project.photographer.businessName}</h1>
              <p className="text-xs text-muted-foreground">Client Portal</p>
            </div>
          </div>

          {/* Project Switcher - Only show if multiple projects */}
          {allProjects && allProjects.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-between"
                  data-testid="button-project-switcher"
                >
                  <span className="truncate">{project.title}</span>
                  <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {allProjects.map((proj) => (
                  <DropdownMenuItem
                    key={proj.id}
                    onClick={() => setLocation(`/client-portal/projects/${proj.id}`)}
                    data-testid={`project-option-${proj.id}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{proj.title}</p>
                      <p className="text-xs text-muted-foreground">{proj.projectType}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-accent text-foreground'
                }`}
                data-testid={`nav-tab-${item.id}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={() => setActiveTab('overview')}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-accent text-foreground transition-colors"
            data-testid="button-settings"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-accent text-foreground transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log out</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
                <div className="flex items-center space-x-4 text-muted-foreground">
                  {project.eventDate && (
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{new Date(project.eventDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {project.stage && (
                    <Badge variant="outline">{project.stage.name}</Badge>
                  )}
                </div>
              </div>

              {/* Project Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-3 text-muted-foreground" />
                    <span className="text-sm">{project.client.email}</span>
                  </div>
                  {project.client.phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-3 text-muted-foreground" />
                      <span className="text-sm">{project.client.phone}</span>
                    </div>
                  )}
                  {project.eventDate && (
                    <div className="flex items-center">
                      <Heart className="w-4 h-4 mr-3 text-muted-foreground" />
                      <span className="text-sm">
                        Event Date: {new Date(project.eventDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{project.checklistItems?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Tasks</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{project.smartFiles?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Documents</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{project.galleries?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Galleries</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold">Activity</h1>
              <Card>
                <CardContent className="pt-6">
                  {(!project.activities || project.activities.length === 0) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No activity yet</p>
                      <p className="text-sm">Updates will appear here as things happen.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {project.activities.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b last:border-0">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                          <div className="flex-1">
                            <p className="font-medium">{activity.title}</p>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground">{activity.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(activity.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold">Tasks</h1>
              <Card>
                <CardContent className="pt-6">
                  {(!project.checklistItems || project.checklistItems.length === 0) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No tasks assigned yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {project.checklistItems.map((item) => (
                        <div key={item.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                          <Checkbox 
                            checked={!!item.completedAt} 
                            disabled
                            data-testid={`task-${item.id}`}
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
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold">Files</h1>
              <Card>
                <CardHeader>
                  <CardTitle>Galleries</CardTitle>
                </CardHeader>
                <CardContent>
                  {(!project.galleries || project.galleries.length === 0) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No galleries shared yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {project.galleries.map((gallery) => (
                        <div key={gallery.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{gallery.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {gallery.imageCount} photos
                            </p>
                          </div>
                          <Button size="sm" data-testid={`view-gallery-${gallery.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold">Payments</h1>
              <p className="text-muted-foreground">View and keep tabs on invoices.</p>
              <Card>
                <CardContent className="pt-6">
                  {(!project.smartFiles || project.smartFiles.length === 0) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No paper trail yet!</p>
                      <p className="text-sm">Your invoices will appear here for quick and easy tracking.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {project.smartFiles.map((smartFile) => (
                        <div key={smartFile.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{smartFile.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              Created: {new Date(smartFile.createdAt).toLocaleDateString()}
                            </p>
                            <p className="font-mono text-lg mt-1">{formatPrice(smartFile.totalCents)}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={getStatusColor(smartFile.status)}>
                              {smartFile.status}
                            </Badge>
                            <Button 
                              size="sm" 
                              onClick={() => setLocation(`/estimates/${smartFile.token}`)}
                              data-testid={`view-smartfile-${smartFile.id}`}
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
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold">Notes</h1>
              <Card>
                <CardContent className="pt-6">
                  {(!project.notes || project.notes.length === 0) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <StickyNote className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No notes yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {project.notes.map((note) => (
                        <div key={note.id} className="p-4 border rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">{note.noteText}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(note.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
