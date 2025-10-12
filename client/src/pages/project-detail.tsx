import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, User, Mail, Phone, FileText, DollarSign, Clock, Copy, Eye, MoreVertical, Trash, Send, MessageSquare, Plus, X, Heart, Briefcase, Camera, ChevronDown, Menu, Link as LinkIcon, ExternalLink, Lock, Settings, Tag } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { PhotographerSignatureDialog } from "@/components/photographer-signature-dialog";
import heroImage from "@assets/stock_images/vintage_camera_photo_e2b0b796.jpg";

interface Project {
  id: string;
  title: string;
  projectType: string;
  eventDate?: string;
  notes?: string;
  status: string;
  createdAt: string;
  leadSource?: string;
  referralName?: string;
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

interface Participant {
  id: string;
  projectId: string;
  clientId: string;
  addedAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ProjectSmartFile {
  id: string;
  projectId: string;
  smartFileId: string;
  smartFileName: string;
  token: string;
  status: string;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  paidAt?: string;
  createdAt: string;
  pagesSnapshot?: any[];
  formAnswers?: any;
}

interface SmartFile {
  id: string;
  name: string;
  description?: string;
  projectType?: string;
  status: string;
  pages?: any[];
}

type TimelineEvent = 
  | {
      type: 'activity';
      id: string;
      title: string;
      description?: string;
      activityType: string;
      metadata?: any;
      createdAt: string;
    }
  | {
      type: 'email';
      id: string;
      title: string;
      description: string;
      status: string;
      sentAt?: string;
      openedAt?: string;
      clickedAt?: string;
      createdAt: string;
    }
  | {
      type: 'sms';
      id: string;
      body: string;
      direction: string;
      createdAt: string;
    };

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("activity");
  
  // State for various dialogs
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [participantEmail, setParticipantEmail] = useState("");
  const [attachSmartFileOpen, setAttachSmartFileOpen] = useState(false);
  const [selectedSmartFileId, setSelectedSmartFileId] = useState("");
  const [smartFileToSend, setSmartFileToSend] = useState<ProjectSmartFile | null>(null);
  const [pendingSmartFileToSend, setPendingSmartFileToSend] = useState<ProjectSmartFile | null>(null);
  const [contractPageToSign, setContractPageToSign] = useState<any>(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sendToParticipants, setSendToParticipants] = useState(false);

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
    enabled: !!user && !!id
  });

  const { data: stages } = useQuery<any[]>({
    queryKey: ["/api/stages"],
    enabled: !!user
  });

  const { data: participants } = useQuery<Participant[]>({
    queryKey: ["/api/projects", id, "participants"],
    enabled: !!user && !!id
  });

  const { data: history } = useQuery<TimelineEvent[]>({
    queryKey: ["/api/projects", id, "history"],
    enabled: !!user && !!id
  });

  const { data: smartFiles } = useQuery<ProjectSmartFile[]>({
    queryKey: ["/api/projects", id, "smart-files"],
    enabled: !!user && !!id
  });

  const { data: allSmartFiles } = useQuery<SmartFile[]>({
    queryKey: ["/api/smart-files"],
    enabled: !!user && attachSmartFileOpen
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      return await apiRequest("PATCH", `/api/projects/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({
        title: "Project updated",
        description: "The project has been updated successfully."
      });
    }
  });

  const addParticipantMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("POST", `/api/projects/${id}/participants`, { email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "participants"] });
      setParticipantEmail("");
      setIsAddingParticipant(false);
      toast({
        title: "Participant added",
        description: "The participant has been added successfully."
      });
    }
  });

  const attachSmartFileMutation = useMutation({
    mutationFn: async (smartFileId: string) => {
      return await apiRequest("POST", `/api/projects/${id}/smart-files`, { smartFileId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "smart-files"] });
      setAttachSmartFileOpen(false);
      setSelectedSmartFileId("");
      toast({
        title: "Smart File attached",
        description: "The Smart File has been attached to this project."
      });
    }
  });

  const sendSmartFileMutation = useMutation({
    mutationFn: async (projectSmartFileId: string) => {
      return await apiRequest("POST", `/api/projects/${id}/smart-files/${projectSmartFileId}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "smart-files"] });
      setSmartFileToSend(null);
      setPendingSmartFileToSend(null);
      toast({
        title: "Smart File sent",
        description: "The Smart File has been sent to the client."
      });
    },
    onError: (error: any) => {
      if (error.code === "PHOTOGRAPHER_SIGNATURE_REQUIRED" && smartFileToSend) {
        const pagesSnapshot = smartFileToSend.pagesSnapshot || [];
        const contractPage = pagesSnapshot.find((page: any) => page.pageType === 'CONTRACT');
        
        if (contractPage) {
          setContractPageToSign(contractPage);
          setPendingSmartFileToSend(smartFileToSend);
          setSignatureDialogOpen(true);
          setSmartFileToSend(null);
          return;
        }
      }
      
      toast({
        title: "Failed to send Smart File",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { subject: string; body: string; sendToParticipants: boolean }) => {
      return await apiRequest("POST", `/api/projects/${id}/send-message`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "history"] });
      setMessageSubject("");
      setMessageBody("");
      setMessageDialogOpen(false);
      toast({
        title: "Message sent",
        description: "Your email has been sent successfully."
      });
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'WEDDING':
        return <Heart className="w-4 h-4" />;
      case 'PORTRAIT':
        return <User className="w-4 h-4" />;
      case 'COMMERCIAL':
        return <Briefcase className="w-4 h-4" />;
      default:
        return <Camera className="w-4 h-4" />;
    }
  };

  const getProjectTypeLabel = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase();
  };

  const getActivityIcon = (event: TimelineEvent) => {
    if (event.type === 'email') return <Mail className="w-4 h-4" />;
    if (event.type === 'sms') return <MessageSquare className="w-4 h-4" />;
    if (event.type === 'activity') {
      if (event.activityType === 'SMART_FILE_SENT') return <FileText className="w-4 h-4" />;
      if (event.activityType === 'SMART_FILE_VIEWED') return <Eye className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  const totalParticipants = (participants?.length || 0) + 1; // +1 for main contact

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-64 bg-gradient-to-br from-slate-500 to-slate-600">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <div className="relative h-full flex flex-col justify-between p-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/90 text-sm">
            <Menu className="w-4 h-4" />
            <span className="uppercase tracking-wider font-medium">PROJECTS</span>
          </div>

          {/* Project Title */}
          <div>
            <h1 className="text-4xl font-semibold text-white mb-2" data-testid="text-project-title">
              {project.title}
            </h1>
            <div className="flex items-center gap-2 text-white/90">
              {getProjectTypeIcon(project.projectType)}
              <span className="capitalize">{getProjectTypeLabel(project.projectType)}</span>
              {project.eventDate && (
                <>
                  <span className="mx-1">•</span>
                  <span>{formatDate(project.eventDate)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Participants Bar */}
      <div className="border-b bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Visible to you + {totalParticipants - 1} participant{totalParticipants - 1 !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center -space-x-2">
              {/* Main Contact Avatar */}
              <div 
                className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium border-2 border-white"
                title={`${project.client.firstName} ${project.client.lastName}`}
              >
                {getInitials(project.client.firstName, project.client.lastName)}
              </div>
              
              {/* Participant Avatars */}
              {participants?.slice(0, 3).map((participant) => (
                <div 
                  key={participant.id}
                  className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-medium border-2 border-white"
                  title={`${participant.client.firstName} ${participant.client.lastName}`}
                >
                  {getInitials(participant.client.firstName, participant.client.lastName)}
                </div>
              ))}
              
              {/* Add Button */}
              <button 
                onClick={() => setIsAddingParticipant(true)}
                className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 transition-colors"
                data-testid="button-add-participant"
              >
                <Plus className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="border-b bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" data-testid="button-schedule">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setAttachSmartFileOpen(true)}
              data-testid="button-attach"
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              Attach
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-ai-actions">
                  AI ACTIONS <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setMessageDialogOpen(true)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send SMS
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button 
            size="sm" 
            className="bg-black hover:bg-black/90 text-white"
            onClick={() => setAttachSmartFileOpen(true)}
            data-testid="button-create-file"
          >
            CREATE FILE
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6">
        <TabsList className="border-b w-full justify-start rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger 
            value="activity" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            data-testid="tab-activity"
          >
            Activity
          </TabsTrigger>
          <TabsTrigger 
            value="files" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            data-testid="tab-files"
          >
            Files
          </TabsTrigger>
          <TabsTrigger 
            value="tasks" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            data-testid="tab-tasks"
          >
            Tasks
          </TabsTrigger>
          <TabsTrigger 
            value="financials" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            data-testid="tab-financials"
          >
            Financials
          </TabsTrigger>
          <TabsTrigger 
            value="notes" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            data-testid="tab-notes"
          >
            Notes
          </TabsTrigger>
          <TabsTrigger 
            value="details" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            data-testid="tab-details"
          >
            Details
          </TabsTrigger>
        </TabsList>

        {/* Content Area with Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            <TabsContent value="activity" className="m-0">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <span className="font-medium">RECENT ACTIVITY</span>
                </div>
                
                {history && history.length > 0 ? (
                  <div className="space-y-3">
                    {history.map((event) => (
                      <div 
                        key={event.id} 
                        className="flex gap-4 p-4 bg-gray-50 rounded-lg"
                        data-testid={`activity-${event.id}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center flex-shrink-0">
                          {getActivityIcon(event)}
                        </div>
                        <div className="flex-1 min-w-0">
                          {event.type === 'activity' && (
                            <div>
                              <p className="font-medium text-sm">{event.title}</p>
                              {event.description && (
                                <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatDate(event.createdAt)}
                              </p>
                            </div>
                          )}
                          {event.type === 'email' && (
                            <div>
                              <p className="font-medium text-sm">{event.title}</p>
                              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  {event.status}
                                </Badge>
                                <p className="text-xs text-muted-foreground">
                                  {event.sentAt && formatDate(event.sentAt)}
                                </p>
                              </div>
                            </div>
                          )}
                          {event.type === 'sms' && (
                            <div>
                              <p className="text-sm">{event.body}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {event.direction === 'OUTBOUND' ? 'Sent' : 'Received'} • {formatDate(event.createdAt)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No activity yet</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="files" className="m-0">
              <div className="space-y-4">
                {smartFiles && smartFiles.length > 0 ? (
                  <div className="space-y-3">
                    {smartFiles.map((sf) => (
                      <div 
                        key={sf.id} 
                        className="p-4 border rounded-lg hover:shadow-sm transition-shadow"
                        data-testid={`smart-file-${sf.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <FileText className="w-10 h-10 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{sf.smartFileName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {sf.status}
                                </Badge>
                                {sf.sentAt && (
                                  <span className="text-xs text-muted-foreground">
                                    Sent {formatDate(sf.sentAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {sf.status === 'DRAFT' && (
                                <DropdownMenuItem onClick={() => setSmartFileToSend(sf)}>
                                  <Send className="w-4 h-4 mr-2" />
                                  Send to Client
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild>
                                <a href={`/smart-files/${sf.smartFileId}?projectId=${project.id}`} target="_blank" rel="noopener noreferrer">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Preview
                                </a>
                              </DropdownMenuItem>
                              {sf.token && (
                                <DropdownMenuItem onClick={() => {
                                  const url = `${window.location.origin}/p/${sf.token}`;
                                  navigator.clipboard.writeText(url);
                                  toast({ title: "Link copied to clipboard" });
                                }}>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copy Client Link
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No files attached yet</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => setAttachSmartFileOpen(true)}
                    >
                      Attach Smart File
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="m-0">
              <div className="text-center py-12 text-muted-foreground">
                <p>Tasks feature coming soon</p>
              </div>
            </TabsContent>

            <TabsContent value="financials" className="m-0">
              <div className="text-center py-12 text-muted-foreground">
                <p>Financials feature coming soon</p>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="m-0">
              <div className="space-y-4">
                {project.notes ? (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{project.notes}</p>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No notes yet</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="details" className="m-0">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-medium">
                        {project.client.firstName} {project.client.lastName}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Mail className="w-4 h-4" />
                        <span>{project.client.email}</span>
                      </div>
                      {project.client.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Phone className="w-4 h-4" />
                          <span>{project.client.phone}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Client Portal Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium">Client portal</CardTitle>
                <Settings className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <span className="text-sm text-muted-foreground truncate flex-1">
                    https://lazyphotog.com/p/{project.id.slice(0, 8)}...
                  </span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/p/${project.id}`);
                        toast({ title: "Link copied to clipboard" });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Include client portal links in files and emails</span>
                  <Switch defaultChecked />
                </div>
                <Button variant="link" className="text-sm p-0 h-auto">
                  What is the client portal?
                </Button>
              </CardContent>
            </Card>

            {/* About This Project Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <CardTitle className="text-sm font-medium">About this project</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Only visible to you and your team
                </p>
                
                {/* Stage */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Stage</Label>
                  <Select 
                    value={project.stage?.id || ''} 
                    onValueChange={(value) => updateProjectMutation.mutate({ stageId: value })}
                  >
                    <SelectTrigger data-testid="select-stage">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages?.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Lead Source */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Lead Source</Label>
                  <Select 
                    value={project.leadSource || ''} 
                    onValueChange={(value) => updateProjectMutation.mutate({ leadSource: value })}
                  >
                    <SelectTrigger data-testid="select-lead-source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Website">Website</SelectItem>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="Facebook">Facebook</SelectItem>
                      <SelectItem value="Google">Google</SelectItem>
                      <SelectItem value="Client Referral">Client Referral</SelectItem>
                      <SelectItem value="Vendor Referral">Vendor Referral</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {project.leadSource === 'Client Referral' && (
                    <Input 
                      placeholder="Who's your referral?"
                      value={project.referralName || ''}
                      onChange={(e) => updateProjectMutation.mutate({ referralName: e.target.value })}
                      className="mt-2"
                      data-testid="input-referral-name"
                    />
                  )}
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tags</Label>
                  <Select>
                    <SelectTrigger data-testid="select-tags">
                      <SelectValue placeholder="Add tags..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="follow-up">Follow Up</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manage company tags
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={isAddingParticipant} onOpenChange={setIsAddingParticipant}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Participant</DialogTitle>
            <DialogDescription>
              Add a participant to this project. They will receive automated emails.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="participant-email">Email Address</Label>
              <Input
                id="participant-email"
                type="email"
                value={participantEmail}
                onChange={(e) => setParticipantEmail(e.target.value)}
                placeholder="participant@example.com"
                data-testid="input-participant-email"
              />
            </div>
            <Button 
              onClick={() => addParticipantMutation.mutate(participantEmail)}
              disabled={!participantEmail || addParticipantMutation.isPending}
              data-testid="button-add-participant-submit"
            >
              Add Participant
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={attachSmartFileOpen} onOpenChange={setAttachSmartFileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach Smart File</DialogTitle>
            <DialogDescription>
              Select a Smart File to attach to this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedSmartFileId} onValueChange={setSelectedSmartFileId}>
              <SelectTrigger data-testid="select-smart-file">
                <SelectValue placeholder="Select Smart File" />
              </SelectTrigger>
              <SelectContent>
                {allSmartFiles?.map((sf) => (
                  <SelectItem key={sf.id} value={sf.id}>
                    {sf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => attachSmartFileMutation.mutate(selectedSmartFileId)}
              disabled={!selectedSmartFileId || attachSmartFileMutation.isPending}
              data-testid="button-attach-submit"
            >
              Attach
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>
              Send an email to the project contact{participants && participants.length > 0 ? ' and participants' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="message-subject">Subject</Label>
              <Input
                id="message-subject"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Email subject"
                data-testid="input-message-subject"
              />
            </div>
            <div>
              <Label htmlFor="message-body">Message</Label>
              <Textarea
                id="message-body"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Email body"
                rows={8}
                data-testid="textarea-message-body"
              />
            </div>
            {participants && participants.length > 0 && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="send-to-participants"
                  checked={sendToParticipants}
                  onCheckedChange={setSendToParticipants}
                />
                <Label htmlFor="send-to-participants">
                  Also send to participants
                </Label>
              </div>
            )}
            <Button 
              onClick={() => sendMessageMutation.mutate({ subject: messageSubject, body: messageBody, sendToParticipants })}
              disabled={!messageSubject || !messageBody || sendMessageMutation.isPending}
              data-testid="button-send-message"
            >
              Send Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!smartFileToSend} onOpenChange={() => setSmartFileToSend(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Smart File to Client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send "{smartFileToSend?.smartFileName}" to the client via email. They will receive a link to view and interact with the Smart File.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => smartFileToSend && sendSmartFileMutation.mutate(smartFileToSend.id)}
              data-testid="button-confirm-send"
            >
              Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {pendingSmartFileToSend && (
        <PhotographerSignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          projectId={project.id}
          projectSmartFileId={pendingSmartFileToSend.id}
          contractPage={contractPageToSign}
          projectData={{
            clientName: `${project.client.firstName} ${project.client.lastName}`,
            photographerName: user?.photographerName || '',
            projectTitle: project.title,
            projectType: project.projectType,
            eventDate: project.eventDate || null,
            selectedPackages: '',
            selectedAddOns: '',
            totalAmount: '',
            depositAmount: '',
            depositPercent: ''
          }}
          onSignatureComplete={() => {
            if (pendingSmartFileToSend) {
              sendSmartFileMutation.mutate(pendingSmartFileToSend.id);
            }
            setSignatureDialogOpen(false);
            setContractPageToSign(null);
            setPendingSmartFileToSend(null);
          }}
        />
      )}
    </div>
  );
}
