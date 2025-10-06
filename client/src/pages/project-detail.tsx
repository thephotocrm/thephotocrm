import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, User, Mail, Phone, MapPin, FileText, DollarSign, Clock, ArrowLeft, ClipboardCheck, UserPlus, X } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [participantEmail, setParticipantEmail] = useState("");
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
    enabled: !!user && !!id
  });

  const { data: estimates } = useQuery<Estimate[]>({
    queryKey: ["/api/estimates", "project", id],
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

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantEmail.trim()) return;
    addParticipantMutation.mutate(participantEmail.trim());
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
        </div>
    </>
  );
}