import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ClientPortalLayout } from "@/components/layout/client-portal-layout";
import { 
  Calendar,
  Mail,
  Phone,
  Loader2,
  Image as ImageIcon,
  Eye,
  Users,
  MapPin,
  Clock,
  CheckSquare,
  FileText,
  Camera,
  Activity,
  StickyNote,
  CreditCard,
  Send
} from "lucide-react";

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

type TabType = 'overview' | 'activity' | 'tasks' | 'files' | 'galleries' | 'payments' | 'notes';

export default function ClientPortalProject() {
  const { user, loading: authLoading, logout } = useAuth();
  const [, params] = useRoute("/client-portal/projects/:id");
  const [location, setLocation] = useLocation();
  const projectId = params?.id;
  
  // Force re-render when query params change
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    const handleLocationChange = () => {
      forceUpdate({}); // Trigger re-render
    };
    
    // Listen to both popstate (back/forward) and pushState/replaceState (wouter navigation)
    window.addEventListener('popstate', handleLocationChange);
    
    // Intercept pushState and replaceState to detect wouter navigation
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      handleLocationChange();
    };
    
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      handleLocationChange();
    };
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);
  
  // Derive active tab directly from URL query params (re-computes on every render)
  const searchParams = new URLSearchParams(window.location.search);
  const tab = searchParams.get('tab') as TabType;
  const activeTab: TabType = (tab && ['overview', 'activity', 'tasks', 'files', 'galleries', 'payments', 'notes'].includes(tab)) 
    ? tab 
    : 'overview';
  
  // Helper to navigate to a specific tab
  const navigateToTab = (tabName: TabType) => {
    if (tabName === 'overview') {
      setLocation(`/client-portal/projects/${projectId}`);
    } else {
      setLocation(`/client-portal/projects/${projectId}?tab=${tabName}`);
    }
  };

  // Message dialog state
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const { toast } = useToast();

  const { data: project, isLoading } = useQuery<ClientProject>({
    queryKey: ["/api/client-portal/projects", projectId],
    enabled: !!projectId && !!user
  });

  const { data: allProjects } = useQuery<ClientProject[]>({
    queryKey: ["/api/client-portal/projects"],
    enabled: !!user
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { subject: string; body: string }) => {
      return await apiRequest("POST", `/api/client-portal/projects/${projectId}/send-message`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/projects", projectId] });
      setMessageDialogOpen(false);
      setMessageSubject("");
      setMessageBody("");
      toast({
        title: "Message sent",
        description: "Your message has been sent to your photographer."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = () => {
    if (!messageSubject.trim() || !messageBody.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both subject and message",
        variant: "destructive"
      });
      return;
    }
    sendMessageMutation.mutate({
      subject: messageSubject,
      body: messageBody
    });
  };

  if (!authLoading && !user) {
    setLocation("/login");
    return null;
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold mb-2">Project not found</h2>
              <p className="text-sm text-muted-foreground mb-4">
                You don't have access to this project.
              </p>
              <Button onClick={() => setLocation("/client-portal")} data-testid="button-back-portal">
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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <ClientPortalLayout currentProjectId={projectId}>
        {/* Cover Photo Hero Banner */}
        {/* TODO: Add photographer.coverImageUrl field to schema for custom branding */}
        <div 
          className="relative h-64 md:h-80 w-full bg-cover bg-center bg-gray-100"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=400&fit=crop)' }}
          data-testid="hero-banner"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60"></div>
          <div className="relative h-full flex items-end p-6 md:p-8">
            <div className="text-white max-w-4xl">
              <h1 className="text-3xl md:text-4xl font-bold mb-2 drop-shadow-lg" data-testid="text-project-title">
                {project.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-white/95 drop-shadow">
                {project.eventDate && (
                  <div className="flex items-center" data-testid="text-event-date">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">
                      {new Date(project.eventDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                {project.stage && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30" data-testid="badge-stage">
                    {project.stage.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Participant Bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 mr-4">Project Team</span>
            <div className="flex items-center space-x-2">
              <Avatar className="w-8 h-8 border-2 border-white" data-testid="avatar-client">
                <AvatarFallback className="bg-primary text-white text-xs">
                  {getInitials(project.client.firstName, project.client.lastName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-700" data-testid="text-client-name">
                {project.client.firstName} {project.client.lastName}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6 max-w-6xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Quick Stats Cards */}
                <Card className="bg-white border-gray-200" data-testid="card-tasks-stat">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Tasks</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {project.checklistItems?.filter(i => i.completedAt).length || 0}/
                          {project.checklistItems?.length || 0}
                        </p>
                      </div>
                      <CheckSquare className="w-8 h-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200" data-testid="card-files-stat">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Documents</p>
                        <p className="text-3xl font-bold text-gray-900">{project.smartFiles?.length || 0}</p>
                      </div>
                      <FileText className="w-8 h-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200" data-testid="card-galleries-stat">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Galleries</p>
                        <p className="text-3xl font-bold text-gray-900">{project.galleries?.length || 0}</p>
                      </div>
                      <ImageIcon className="w-8 h-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity Preview */}
              {project.activities && project.activities.length > 0 && (
                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-xl">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {project.activities.slice(0, 3).map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b last:border-0" data-testid={`activity-${activity.id}`}>
                          <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">{activity.title}</p>
                            {activity.description && (
                              <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(activity.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {project.activities.length > 3 && (
                      <Button 
                        variant="ghost" 
                        className="w-full mt-4" 
                        onClick={() => navigateToTab('activity')}
                        data-testid="button-view-all-activity"
                      >
                        View All Activity
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Messages & Activity</h1>
                <Button 
                  onClick={() => setMessageDialogOpen(true)}
                  className="gap-2"
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </Button>
              </div>
              <Card className="bg-white border-gray-200">
                <CardContent className="pt-6">
                  {(() => {
                    // Filter activities to show only EMAIL-related activities (exclude SMS)
                    const emailActivities = (project.activities || []).filter(
                      activity => activity.type?.includes('EMAIL') || activity.type?.includes('RECEIVED')
                    );
                    
                    if (emailActivities.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-gray-900 font-medium">No messages yet</p>
                          <p className="text-sm text-gray-500 mt-2">
                            Start a conversation by sending a message to your photographer.
                          </p>
                          <Button 
                            onClick={() => setMessageDialogOpen(true)}
                            className="mt-4"
                            variant="outline"
                            data-testid="button-send-first-message"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send your first message
                          </Button>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-4">
                        {emailActivities.map((activity) => (
                          <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors" data-testid={`activity-item-${activity.id}`}>
                            <Mail className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900">{activity.title}</p>
                              {activity.description && (
                                <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-2">
                                {new Date(activity.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Files</h1>
                <p className="text-gray-600 mt-2">View invoices, contracts, and documents.</p>
              </div>
              
              {/* Smart Files Section */}
              <Card className="bg-white border-gray-200">
                <CardContent className="pt-6">
                  {(!project.smartFiles || project.smartFiles.length === 0) ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-900 font-medium">No files shared yet</p>
                      <p className="text-sm text-gray-500 mt-2">Your invoices, contracts, and documents will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {project.smartFiles.map((smartFile) => (
                        <div key={smartFile.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors" data-testid={`smartfile-card-${smartFile.id}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="font-semibold text-gray-900">{smartFile.title}</h4>
                                <Badge variant={getStatusColor(smartFile.status)} className="text-xs">
                                  {smartFile.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500 mb-2">
                                Created {new Date(smartFile.createdAt).toLocaleDateString()}
                              </p>
                              {smartFile.totalCents > 0 && (
                                <p className="text-2xl font-bold text-gray-900">{formatPrice(smartFile.totalCents)}</p>
                              )}
                            </div>
                            <Button 
                              onClick={() => setLocation(`/smart-file/${smartFile.token}`)}
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

          {/* Galleries Tab */}
          {activeTab === 'galleries' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Galleries</h1>
                <p className="text-gray-600 mt-2">View your photo galleries.</p>
              </div>
              
              {/* Galleries Section */}
              <Card className="bg-white border-gray-200">
                <CardContent className="pt-6">
                  {(!project.galleries || project.galleries.length === 0) ? (
                    <div className="text-center py-12">
                      <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-900 font-medium">No galleries shared yet</p>
                      <p className="text-sm text-gray-500 mt-2">Your photos will appear here when ready.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {project.galleries.map((gallery) => (
                        <div key={gallery.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors" data-testid={`gallery-card-${gallery.id}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{gallery.title}</h4>
                              <p className="text-sm text-gray-500 mt-1">
                                {gallery.imageCount} {gallery.imageCount === 1 ? 'photo' : 'photos'}
                              </p>
                            </div>
                            <Badge variant={gallery.isPublic ? "default" : "secondary"} className="text-xs">
                              {gallery.isPublic ? 'Public' : 'Private'}
                            </Badge>
                          </div>
                          <Button 
                            size="sm" 
                            className="w-full" 
                            onClick={() => setLocation(`/client/galleries/${gallery.id}`)}
                            data-testid={`view-gallery-${gallery.id}`}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Gallery
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
            <div className="space-y-6 max-w-4xl">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
                <p className="text-gray-600 mt-2">View and manage your invoices and contracts.</p>
              </div>
              <Card className="bg-white border-gray-200">
                <CardContent className="pt-6">
                  {(!project.smartFiles || project.smartFiles.length === 0) ? (
                    <div className="text-center py-12">
                      <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-900 font-medium">No invoices yet!</p>
                      <p className="text-sm text-gray-500 mt-2">Your invoices and contracts will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {project.smartFiles.map((smartFile) => (
                        <div key={smartFile.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors" data-testid={`smartfile-card-${smartFile.id}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="font-semibold text-gray-900">{smartFile.title}</h4>
                                <Badge variant={getStatusColor(smartFile.status)} className="text-xs">
                                  {smartFile.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500 mb-2">
                                Created {new Date(smartFile.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-2xl font-bold text-gray-900">{formatPrice(smartFile.totalCents)}</p>
                            </div>
                            <Button 
                              onClick={() => setLocation(`/smart-file/${smartFile.token}`)}
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

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-6 max-w-4xl">
              <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
              <Card className="bg-white border-gray-200">
                <CardContent className="pt-6">
                  {(!project.checklistItems || project.checklistItems.length === 0) ? (
                    <div className="text-center py-12">
                      <CheckSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-900 font-medium">No tasks yet</p>
                      <p className="text-sm text-gray-500 mt-2">Your photographer will assign tasks here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {project.checklistItems.map((item) => (
                        <div key={item.id} className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg" data-testid={`checklist-item-${item.id}`}>
                          <Checkbox 
                            checked={!!item.completedAt} 
                            disabled={!!item.completedAt}
                          />
                          <span className={item.completedAt ? "line-through text-gray-500" : "text-gray-900"}>
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

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-6 max-w-4xl">
              <h1 className="text-3xl font-bold text-gray-900">Notes</h1>
              <Card className="bg-white border-gray-200">
                <CardContent className="pt-6">
                  {(!project.notes || project.notes.length === 0) ? (
                    <div className="text-center py-12">
                      <StickyNote className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-900 font-medium">No notes yet</p>
                      <p className="text-sm text-gray-500 mt-2">Shared notes will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {project.notes.map((note) => (
                        <div key={note.id} className="border border-gray-200 rounded-lg p-4 bg-yellow-50 border-yellow-200" data-testid={`note-card-${note.id}`}>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.noteText}</p>
                          <p className="text-xs text-gray-500 mt-3 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
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

        {/* Message Composer Dialog */}
        <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Send Message to {project.photographer.businessName}</DialogTitle>
              <DialogDescription>
                Your message will be sent directly to your photographer's email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="message-subject">Subject</Label>
                <Input
                  id="message-subject"
                  placeholder="Enter message subject"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  data-testid="input-message-subject"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message-body">Message</Label>
                <Textarea
                  id="message-body"
                  placeholder="Type your message here..."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  rows={8}
                  data-testid="textarea-message-body"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setMessageDialogOpen(false);
                  setMessageSubject("");
                  setMessageBody("");
                }}
                data-testid="button-cancel-message"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending}
                data-testid="button-confirm-send-message"
              >
                {sendMessageMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </ClientPortalLayout>
  );
}
