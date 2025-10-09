import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, User, Mail, Phone, MapPin, FileText, DollarSign, Clock, ArrowLeft, ClipboardCheck, UserPlus, X, History, Send, MessageSquare, Plus, Copy, Eye, MoreVertical, Trash } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { PhotographerSignatureDialog } from "@/components/photographer-signature-dialog";

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

interface ProjectQuestionnaire {
  id: string;
  templateId: string;
  answers?: any;
  submittedAt?: string;
  createdAt: string;
  templateTitle: string;
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
      bouncedAt?: string;
      createdAt: string;
      templateName?: string;
      templateSubject?: string;
      automationName?: string;
    }
  | {
      type: 'sms';
      id: string;
      title: string;
      description: string;
      status: string;
      sentAt?: string;
      deliveredAt?: string;
      createdAt: string;
      direction?: string;
      messageBody?: string;
      templateName?: string;
      automationName?: string;
    };

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [participantEmail, setParticipantEmail] = useState("");
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sendToParticipants, setSendToParticipants] = useState(true);
  const [attachSmartFileOpen, setAttachSmartFileOpen] = useState(false);
  const [selectedSmartFileId, setSelectedSmartFileId] = useState("");
  const [smartFileToSend, setSmartFileToSend] = useState<ProjectSmartFile | null>(null);
  const [smartFileToRemove, setSmartFileToRemove] = useState<ProjectSmartFile | null>(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [contractPageToSign, setContractPageToSign] = useState<any>(null);
  const [pendingSmartFileToSend, setPendingSmartFileToSend] = useState<ProjectSmartFile | null>(null);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
    enabled: !!user && !!id
  });

  const { data: questionnaires } = useQuery<ProjectQuestionnaire[]>({
    queryKey: ["/api/projects", id, "questionnaires"],
    enabled: !!user && !!id
  });

  const { data: participants, isLoading: participantsLoading } = useQuery<Participant[]>({
    queryKey: ["/api/projects", id, "participants"],
    enabled: !!user && !!id
  });

  const { data: history, isLoading: historyLoading } = useQuery<TimelineEvent[]>({
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
        description: "The participant has been added and will receive automated emails."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add participant",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async (participantId: string) => {
      return await apiRequest("DELETE", `/api/projects/${id}/participants/${participantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "participants"] });
      toast({
        title: "Participant removed",
        description: "The participant has been removed from the project."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove participant",
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
      toast({
        title: "Message sent",
        description: "Your email has been sent successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "An error occurred",
        variant: "destructive"
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
    },
    onError: (error: any) => {
      toast({
        title: "Failed to attach Smart File",
        description: error.message || "An error occurred",
        variant: "destructive"
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
      // Check if photographer signature is required
      if (error.code === "PHOTOGRAPHER_SIGNATURE_REQUIRED" && smartFileToSend) {
        // Find the contract page from the Smart File
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

  const sendSmartFileSMSMutation = useMutation({
    mutationFn: async (projectSmartFileId: string) => {
      return await apiRequest("POST", `/api/projects/${id}/smart-files/${projectSmartFileId}/send-sms`);
    },
    onSuccess: () => {
      toast({
        title: "SMS sent",
        description: "The Smart File link has been sent via text message."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send SMS",
        description: error.message || "Client phone number may be missing",
        variant: "destructive"
      });
    }
  });

  const removeSmartFileMutation = useMutation({
    mutationFn: async (projectSmartFileId: string) => {
      return await apiRequest("DELETE", `/api/projects/${id}/smart-files/${projectSmartFileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "smart-files"] });
      setSmartFileToRemove(null);
      toast({
        title: "Smart File removed",
        description: "The Smart File has been removed from this project."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove Smart File",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantEmail.trim()) return;
    addParticipantMutation.mutate(participantEmail.trim());
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageSubject.trim() || !messageBody.trim()) return;
    sendMessageMutation.mutate({
      subject: messageSubject.trim(),
      body: messageBody.trim(),
      sendToParticipants
    });
  };

  if (loading || projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!project) {
    return (
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

  const getProjectTypeLabel = (type: string | null | undefined) => {
    if (!type) return 'Unknown';
    return type.charAt(0) + type.slice(1).toLowerCase();
  };

  const getQuestionnaireStatusColor = (questionnaire: ProjectQuestionnaire) => {
    if (questionnaire.submittedAt) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    }
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
  };

  const getQuestionnaireStatus = (questionnaire: ProjectQuestionnaire) => {
    if (questionnaire.submittedAt) {
      return 'Completed';
    }
    return 'Pending';
  };

  const getSmartFileStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'SENT': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'VIEWED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'ACCEPTED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'DEPOSIT_PAID': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'PAID': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const handleAttachSmartFile = () => {
    if (!selectedSmartFileId) return;
    attachSmartFileMutation.mutate(selectedSmartFileId);
  };

  const handleCopyLink = (smartFile: ProjectSmartFile) => {
    const link = `${window.location.origin}/smart-file/${smartFile.token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied",
      description: "Smart File link has been copied to clipboard."
    });
  };

  return (
    <>
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
                <Link href={`/clients/${project.client.id}`}>
                  <Button variant="outline" size="sm" className="w-full" data-testid="button-view-full-client">
                    <User className="w-4 h-4 mr-2" />
                    View Full Client Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Smart Files */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Smart Files
                </CardTitle>
                <Button size="sm" onClick={() => setAttachSmartFileOpen(true)} data-testid="button-attach-smart-file">
                  <Plus className="w-4 h-4 mr-2" />
                  Attach Smart File
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {smartFiles && smartFiles.length > 0 ? (
                <div className="space-y-3">
                  {smartFiles.map((sf) => (
                    <div 
                      key={sf.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`smart-file-${sf.id}`}
                    >
                      <div className="space-y-1">
                        <p className="font-medium" data-testid={`smart-file-name-${sf.id}`}>
                          {sf.smartFileName}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={getSmartFileStatusColor(sf.status)}
                            data-testid={`smart-file-status-${sf.id}`}
                          >
                            {sf.status}
                          </Badge>
                          {sf.sentAt && (
                            <span className="text-sm text-muted-foreground">
                              Sent {formatDate(sf.sentAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`button-smart-file-menu-${sf.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {sf.status === 'DRAFT' && (
                            <DropdownMenuItem 
                              onClick={() => setSmartFileToSend(sf)}
                              data-testid={`button-send-smart-file-${sf.id}`}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Send to Client
                            </DropdownMenuItem>
                          )}
                          {['SENT', 'VIEWED', 'ACCEPTED', 'PAID', 'DEPOSIT_PAID'].includes(sf.status) && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => handleCopyLink(sf)}
                                data-testid={`button-copy-link-${sf.id}`}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Link
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => sendSmartFileSMSMutation.mutate(sf.id)}
                                data-testid={`button-send-sms-${sf.id}`}
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Send via Text
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem 
                            onClick={() => setLocation(`/smart-files/${sf.smartFileId}/edit`)}
                            data-testid={`button-view-smart-file-${sf.id}`}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {/* Only show remove option if no payments or signatures */}
                          {sf.status !== 'DEPOSIT_PAID' && sf.status !== 'PAID' && !sf.clientSignatureUrl && !sf.photographerSignatureUrl && (
                            <DropdownMenuItem 
                              onClick={() => setSmartFileToRemove(sf)}
                              data-testid={`button-remove-smart-file-${sf.id}`}
                            >
                              <Trash className="w-4 h-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No Smart Files attached yet</p>
                  <Button onClick={() => setAttachSmartFileOpen(true)} data-testid="button-attach-first-smart-file">
                    <Plus className="w-4 h-4 mr-2" />
                    Attach First Smart File
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Questionnaires */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                Questionnaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              {questionnaires && questionnaires.length > 0 ? (
                <div className="space-y-3">
                  {questionnaires.map((questionnaire) => (
                    <div 
                      key={questionnaire.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`questionnaire-${questionnaire.id}`}
                    >
                      <div className="space-y-1">
                        <p className="font-medium" data-testid={`questionnaire-title-${questionnaire.id}`}>
                          {questionnaire.templateTitle}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={getQuestionnaireStatusColor(questionnaire)}
                            data-testid={`questionnaire-status-${questionnaire.id}`}
                          >
                            {getQuestionnaireStatus(questionnaire)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Assigned {formatDate(questionnaire.createdAt)}
                          </span>
                          {questionnaire.submittedAt && (
                            <span className="text-sm text-muted-foreground">
                              • Completed {formatDate(questionnaire.submittedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {questionnaire.submittedAt ? (
                          <Button variant="outline" size="sm" data-testid={`button-view-questionnaire-${questionnaire.id}`}>
                            View Responses
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" data-testid={`button-send-questionnaire-${questionnaire.id}`}>
                            Send to Client
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No questionnaires assigned yet</p>
                  <Link href="/questionnaires">
                    <Button data-testid="button-manage-questionnaires">
                      <ClipboardCheck className="w-4 h-4 mr-2" />
                      Manage Questionnaires
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Participants
                </CardTitle>
                {!isAddingParticipant && (
                  <Button 
                    onClick={() => setIsAddingParticipant(true)} 
                    size="sm"
                    data-testid="button-add-participant"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Participant
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isAddingParticipant && (
                <form onSubmit={handleAddParticipant} className="mb-4 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Participant Email
                      </label>
                      <Input
                        type="email"
                        placeholder="participant@example.com"
                        value={participantEmail}
                        onChange={(e) => setParticipantEmail(e.target.value)}
                        required
                        data-testid="input-participant-email"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Participants receive automated emails and can view project details through their own portal.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        size="sm"
                        disabled={addParticipantMutation.isPending}
                        data-testid="button-confirm-add-participant"
                      >
                        {addParticipantMutation.isPending ? "Adding..." : "Add"}
                      </Button>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setIsAddingParticipant(false);
                          setParticipantEmail("");
                        }}
                        data-testid="button-cancel-add-participant"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {participantsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                </div>
              ) : participants && participants.length > 0 ? (
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <div 
                      key={participant.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`participant-${participant.id}`}
                    >
                      <div className="space-y-1">
                        <p className="font-medium" data-testid={`participant-name-${participant.id}`}>
                          {participant.client.firstName} {participant.client.lastName}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          <span data-testid={`participant-email-${participant.id}`}>
                            {participant.client.email}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Added {formatDate(participant.addedAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeParticipantMutation.mutate(participant.id)}
                        disabled={removeParticipantMutation.isPending}
                        data-testid={`button-remove-participant-${participant.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">No participants added yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add family members, friends, or wedding planners who should receive automated updates
                  </p>
                  {!isAddingParticipant && (
                    <Button onClick={() => setIsAddingParticipant(true)} data-testid="button-add-first-participant">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add First Participant
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message Composer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send Message
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <Label htmlFor="message-subject">Subject</Label>
                  <Input
                    id="message-subject"
                    type="text"
                    placeholder="Enter email subject"
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    required
                    data-testid="input-message-subject"
                  />
                </div>
                <div>
                  <Label htmlFor="message-body">Message</Label>
                  <Textarea
                    id="message-body"
                    placeholder="Type your message here..."
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    required
                    rows={6}
                    data-testid="textarea-message-body"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="send-to-participants"
                    checked={sendToParticipants}
                    onChange={(e) => setSendToParticipants(e.target.checked)}
                    className="w-4 h-4"
                    data-testid="checkbox-send-participants"
                  />
                  <Label htmlFor="send-to-participants" className="text-sm font-normal cursor-pointer">
                    BCC participants ({participants?.length || 0} participants)
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sendMessageMutation.isPending ? "Sending..." : "Send Email"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Email will be sent via Gmail (or SendGrid if Gmail is unavailable) to {project.client.email}
                  {sendToParticipants && participants && participants.length > 0 && ` with ${participants.length} participant(s) BCC'd`}
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Project History Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Project History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                </div>
              ) : history && history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((event) => (
                    <div 
                      key={event.id} 
                      className="border-l-2 border-muted pl-4 pb-4 last:pb-0"
                      data-testid={`timeline-event-${event.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {event.type === 'email' && <Mail className="w-4 h-4 text-blue-500" />}
                          {event.type === 'sms' && <MessageSquare className="w-4 h-4 text-green-500" />}
                          {event.type === 'activity' && <Clock className="w-4 h-4 text-gray-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm" data-testid={`timeline-title-${event.id}`}>
                                {event.title}
                              </p>
                              {event.description && (
                                <p className="text-sm text-muted-foreground mt-1" data-testid={`timeline-description-${event.id}`}>
                                  {event.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  {event.type}
                                </Badge>
                                {event.type === 'email' && (
                                  <>
                                    <Badge variant="outline" className="text-xs">
                                      {event.status}
                                    </Badge>
                                    {event.openedAt && (
                                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                                        Opened
                                      </Badge>
                                    )}
                                  </>
                                )}
                                {event.type === 'sms' && (
                                  <Badge variant="outline" className="text-xs">
                                    {event.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(event.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No activity yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Project communications and updates will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Attach Smart File Dialog */}
        <Dialog open={attachSmartFileOpen} onOpenChange={setAttachSmartFileOpen}>
          <DialogContent data-testid="dialog-attach-smart-file">
            <DialogHeader>
              <DialogTitle>Attach Smart File</DialogTitle>
              <DialogDescription>
                Select a Smart File to attach to this project
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {allSmartFiles && allSmartFiles.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {allSmartFiles
                    .filter(sf => sf.status === 'ACTIVE')
                    .map((smartFile) => (
                      <div
                        key={smartFile.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedSmartFileId === smartFile.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedSmartFileId(smartFile.id)}
                        data-testid={`select-smart-file-${smartFile.id}`}
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{smartFile.name}</p>
                          {smartFile.description && (
                            <p className="text-sm text-muted-foreground">
                              {smartFile.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {smartFile.projectType && (
                              <Badge variant="outline" className="text-xs">
                                {smartFile.projectType}
                              </Badge>
                            )}
                            {smartFile.pages && (
                              <span>{smartFile.pages.length} pages</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No Smart Files available</p>
                  <Button onClick={() => {
                    setAttachSmartFileOpen(false);
                    setLocation('/smart-files');
                  }} data-testid="button-create-smart-file">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Smart File
                  </Button>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAttachSmartFileOpen(false);
                    setSelectedSmartFileId("");
                  }}
                  data-testid="button-cancel-attach"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAttachSmartFile}
                  disabled={!selectedSmartFileId || attachSmartFileMutation.isPending}
                  data-testid="button-confirm-attach"
                >
                  {attachSmartFileMutation.isPending ? "Attaching..." : "Attach"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Send Smart File Confirmation Dialog */}
        <AlertDialog open={!!smartFileToSend} onOpenChange={(open) => !open && setSmartFileToSend(null)}>
          <AlertDialogContent data-testid="dialog-send-smart-file">
            <AlertDialogHeader>
              <AlertDialogTitle>Send Smart File to Client</AlertDialogTitle>
              <AlertDialogDescription>
                This will send the Smart File "{smartFileToSend?.smartFileName}" to {project?.client.firstName} {project?.client.lastName} via email. Continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-send">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => smartFileToSend && sendSmartFileMutation.mutate(smartFileToSend.id)}
                disabled={sendSmartFileMutation.isPending}
                data-testid="button-confirm-send"
              >
                {sendSmartFileMutation.isPending ? "Sending..." : "Send"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Remove Smart File Confirmation Dialog */}
        <AlertDialog open={!!smartFileToRemove} onOpenChange={(open) => !open && setSmartFileToRemove(null)}>
          <AlertDialogContent data-testid="dialog-remove-smart-file">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Smart File</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove "{smartFileToRemove?.smartFileName}" from this project. The Smart File itself will not be deleted. Continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-remove">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => smartFileToRemove && removeSmartFileMutation.mutate(smartFileToRemove.id)}
                disabled={removeSmartFileMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-remove"
              >
                {removeSmartFileMutation.isPending ? "Removing..." : "Remove"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Photographer Signature Dialog */}
        {pendingSmartFileToSend && project && (
          <PhotographerSignatureDialog
            open={signatureDialogOpen}
            onOpenChange={setSignatureDialogOpen}
            projectId={id!}
            projectSmartFileId={pendingSmartFileToSend.id}
            contractPage={contractPageToSign}
            projectData={{
              clientName: `${project.client.firstName} ${project.client.lastName}`,
              photographerName: user?.photographerName || '',
              projectTitle: project.title,
              projectType: project.projectType,
              eventDate: project.eventDate ? new Date(project.eventDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null,
            }}
            onSignatureComplete={() => {
              // After signing, retry sending the Smart File
              if (pendingSmartFileToSend) {
                setSmartFileToSend(pendingSmartFileToSend);
                sendSmartFileMutation.mutate(pendingSmartFileToSend.id);
              }
            }}
          />
        )}
    </>
  );
}