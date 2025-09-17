import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  User, 
  Send,
  FileText,
  DollarSign,
  MessageSquare,
  Link as LinkIcon,
  ExternalLink,
  MoreHorizontal,
  Eye,
  Plus,
  Trash2
} from "lucide-react";
import { type ClientWithStage, type Estimate, type Message, type TimelineEvent, type Stage } from "@shared/schema";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function ClientDetail() {
  // ALL HOOKS MUST BE AT THE TOP - Rules of Hooks!
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams();
  const clientId = params.id;

  const [newMessage, setNewMessage] = useState("");
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState("");

  const { data: client, isLoading } = useQuery<ClientWithStage>({
    queryKey: ["/api/clients", clientId],
    enabled: !!user && !!clientId
  });

  const { data: proposals } = useQuery<Estimate[]>({
    queryKey: ["/api/proposals", "client", clientId],
    enabled: !!user && !!clientId
  });

  const { data: clientHistory = [], refetch: refetchHistory } = useQuery<TimelineEvent[]>({
    queryKey: ["/api/clients", clientId, "history"],
    enabled: !!user && !!clientId
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["/api/clients", clientId, "messages"],
    enabled: !!user && !!clientId
  });

  const { data: stages = [] } = useQuery<Stage[]>({
    queryKey: ["/api/stages"],
    enabled: !!user
  });

  const assignStageMutation = useMutation({
    mutationFn: async ({ stageId }: { stageId: string }) => {
      return apiRequest(`/api/clients/${clientId}/stage`, {
        method: "PUT",
        body: { stageId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success",
        description: "Client stage updated successfully"
      });
      setShowStageDialog(false);
    },
    onError: (error) => {
      console.error("Assign stage error:", error);
      toast({
        title: "Error",
        description: "Failed to assign stage",
        variant: "destructive"
      });
    }
  });

  const sendLoginLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/send-login-link`);
      return response;
    },
    onSuccess: (data: any) => {
      console.log('Send login link success:', data);
      
      let title = "Login link sent";
      let description = "Client will receive an email with their portal access link.";
      
      // Handle development mode responses
      if (data?.loginUrl) {
        title = "Login link generated";
        description = data.message || "Login link created successfully.";
        
        // In development, show the actual login URL
        if (data.debugInfo) {
          description += ` \n\nDevelopment URL: ${data.loginUrl}`;
        }
      }
      
      toast({
        title,
        description,
      });
    },
    onError: async (error: any) => {
      console.error('Send login link error:', error);
      
      let title = "Error";
      let description = "Failed to send login link. Please try again.";
      
      try {
        // Try to parse backend error response
        if (error?.response) {
          const errorData = await error.response.json();
          console.log('Backend error data:', errorData);
          
          title = errorData.error ? "Email Service Error" : "Error";
          description = errorData.message || errorData.error || description;
          
          // If backend provided a login URL in error response (development mode)
          if (errorData.loginUrl) {
            description += `\n\nDevelopment URL: ${errorData.loginUrl}`;
          }
          
          if (errorData.warning) {
            description += `\n\n${errorData.warning}`;
          }
        } else if (error?.message) {
          description = error.message;
        }
      } catch (parseError) {
        console.warn('Could not parse error response:', parseError);
        
        // Fallback: try to get error text directly
        try {
          if (error?.response) {
            const errorText = await error.response.text();
            if (errorText) {
              description = errorText;
            }
          }
        } catch (textError) {
          console.warn('Could not get error text:', textError);
        }
      }
      
      toast({
        title,
        description,
        variant: "destructive"
      });
    }
  });

  // Send proposal mutation
  const sendProposalMutation = useMutation({
    mutationFn: (proposalId: string) => apiRequest("POST", `/api/proposals/${proposalId}/send`, {}),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Proposal sent to client successfully!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", "client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "history"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send proposal",
        variant: "destructive"
      });
    }
  });

  // Delete proposal mutation  
  const deleteProposalMutation = useMutation({
    mutationFn: (proposalId: string) => apiRequest("DELETE", `/api/proposals/${proposalId}`, {}),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Proposal deleted successfully!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", "client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] }); // Keep global proposals list consistent
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete proposal",
        variant: "destructive"
      });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", "/api/messages", {
        clientId,
        content,
        channel: "INTERNAL",
        sentByPhotographer: true
      });
    },
    onSuccess: () => {
      setNewMessage("");
      setShowMessageForm(false);
      refetchMessages();
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "history"] });
      toast({
        title: "Message sent",
        description: "Your message has been sent to the client."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  });

  // ALL CONDITIONAL LOGIC AFTER ALL HOOKS
  // Redirect to login if not authenticated
  if (!loading && !user) {
    setLocation("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!client) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Client not found</h2>
              <p className="text-muted-foreground mb-4">The client you're looking for doesn't exist.</p>
              <Button onClick={() => setLocation("/clients")} data-testid="button-back-to-clients">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Clients
              </Button>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false // Military time (24-hour format)
    });
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation("/clients")}
                data-testid="button-back-to-clients"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Clients
              </Button>
              <div>
                <h1 className="text-2xl font-semibold">
                  {client.firstName} {client.lastName}
                </h1>
                <p className="text-muted-foreground">Client Details & History</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => sendLoginLinkMutation.mutate()}
                disabled={sendLoginLinkMutation.isPending || !client.email}
                data-testid="button-send-login-link"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                {sendLoginLinkMutation.isPending ? "Sending..." : "Send Login Link"}
              </Button>
              <Button 
                onClick={() => setShowMessageForm(true)}
                data-testid="button-send-message"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Message Client
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Client Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-base" data-testid="text-client-name">
                    {client.firstName} {client.lastName}
                  </p>
                </div>
                
                {client.email && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <p className="text-base" data-testid="text-client-email">{client.email}</p>
                    </div>
                  </div>
                )}
                
                {client.phone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <p className="text-base" data-testid="text-client-phone">{client.phone}</p>
                    </div>
                  </div>
                )}
                
                {client.weddingDate && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Wedding Date</p>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <p className="text-base" data-testid="text-wedding-date">
                        {formatDate(client.weddingDate)}
                      </p>
                    </div>
                  </div>
                )}
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Client Since</p>
                  <p className="text-base">{formatDate(client.createdAt)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Current Stage */}
            <Card>
              <CardHeader>
                <CardTitle>Current Stage</CardTitle>
              </CardHeader>
              <CardContent>
                {client.stage?.id ? (
                  <div className="space-y-4">
                    <Badge 
                      className="text-sm px-3 py-1" 
                      style={{backgroundColor: `${client.stage.color}20`, color: client.stage.color, borderColor: client.stage.color}}
                      data-testid="badge-current-stage"
                    >
                      {client.stage.name}
                    </Badge>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">No stage assigned</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2" 
                      onClick={() => setShowStageDialog(true)}
                      data-testid="button-assign-stage"
                    >
                      Assign Stage
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Proposals</span>
                  </div>
                  <span className="font-medium" data-testid="text-proposals-count">
                    {proposals?.length || 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Total Value</span>
                  </div>
                  <span className="font-medium" data-testid="text-total-value">
                    {proposals ? formatCurrency(proposals.reduce((sum: number, est: any) => sum + (est.totalCents || 0), 0)) : "$0.00"}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Messages</span>
                  </div>
                  <span className="font-medium" data-testid="text-messages-count">
                    {messages.length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assign Stage Dialog */}
          <Dialog open={showStageDialog} onOpenChange={setShowStageDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Stage to {client?.firstName} {client?.lastName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger data-testid="select-stage">
                    <SelectValue placeholder="Select a stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id} data-testid={`option-stage-${stage.id}`}>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: stage.color }}
                          />
                          <span>{stage.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowStageDialog(false)}
                    data-testid="button-cancel-stage"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => selectedStage && assignStageMutation.mutate({ stageId: selectedStage })}
                    disabled={!selectedStage || assignStageMutation.isPending}
                    data-testid="button-confirm-stage"
                  >
                    {assignStageMutation.isPending ? 'Assigning...' : 'Assign Stage'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Proposals Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Proposals</CardTitle>
                <Button 
                  onClick={() => setLocation(`/proposals/new?clientId=${clientId}`)}
                  size="sm"
                  data-testid="button-create-proposal"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Proposal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {proposals && proposals.length > 0 ? (
                <div className="space-y-4">
                  {proposals.map((estimate) => (
                    <div 
                      key={estimate.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      data-testid={`proposal-${estimate.id}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          estimate.status === 'SIGNED' ? 'bg-green-100' :
                          estimate.sentAt ? 'bg-blue-100' :
                          'bg-gray-100'
                        }`}>
                          {estimate.status === 'SIGNED' ? (
                            <FileText className="w-5 h-5 text-green-600" />
                          ) : estimate.sentAt ? (
                            <Send className="w-5 h-5 text-blue-600" />
                          ) : (
                            <FileText className="w-5 h-5 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">{estimate.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            ${((estimate.totalCents || 0) / 100).toFixed(2)}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={
                              estimate.status === 'SIGNED' ? 'default' : 
                              estimate.sentAt ? 'secondary' : 'outline'
                            }>
                              {estimate.sentAt ? (
                                estimate.status === 'SIGNED' ? 'Signed' : 'Sent'
                              ) : 'Draft'}
                            </Badge>
                            {estimate.sentAt && (
                              <span className="text-xs text-muted-foreground">
                                Sent {new Date(estimate.sentAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {!estimate.sentAt && (
                          <Button 
                            size="sm" 
                            onClick={() => sendProposalMutation.mutate(estimate.id)}
                            disabled={sendProposalMutation.isPending}
                            data-testid={`send-proposal-${estimate.id}`}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {sendProposalMutation.isPending ? 'Sending...' : 'Send'}
                          </Button>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`menu-proposal-${estimate.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.open(`/public/proposals/${estimate.token}`, '_blank')}>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            {estimate.sentAt && (
                              <DropdownMenuItem onClick={() => sendProposalMutation.mutate(estimate.id)}>
                                <Send className="w-4 h-4 mr-2" />
                                Resend
                              </DropdownMenuItem>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} data-testid={`delete-proposal-${estimate.id}`}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Proposal</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{estimate.title}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel data-testid="cancel-delete-proposal">Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteProposalMutation.mutate(estimate.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    data-testid="confirm-delete-proposal"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No proposals created yet</p>
                  <Button 
                    onClick={() => setLocation(`/proposals/new?clientId=${clientId}`)}
                    data-testid="button-create-first-proposal"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Proposal
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* History Section */}
          <Card>
            <CardHeader>
              <CardTitle>Client History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clientHistory && clientHistory.length > 0 ? (
                  clientHistory.map((event: TimelineEvent) => (
                    <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`history-${event.type}-${event.id}`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          event.type === 'message' ? 'bg-green-100' : 
                          event.type === 'email' ? 'bg-blue-100' :
                          event.type === 'sms' ? 'bg-purple-100' :
                          event.type === 'proposal' ? 'bg-orange-100' :
                          event.type === 'payment' ? 'bg-emerald-100' :
                          'bg-gray-100'
                        }`}>
                          {event.type === 'message' ? <MessageSquare className={`w-4 h-4 ${event.type === 'message' ? 'text-green-600' : 'text-gray-600'}`} /> :
                           event.type === 'email' ? <Mail className="w-4 h-4 text-blue-600" /> :
                           event.type === 'sms' ? <Phone className="w-4 h-4 text-purple-600" /> :
                           event.type === 'proposal' ? <FileText className="w-4 h-4 text-orange-600" /> :
                           event.type === 'payment' ? <DollarSign className="w-4 h-4 text-emerald-600" /> :
                           <FileText className="w-4 h-4 text-gray-600" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.description}
                          </p>
                          
                          {/* Enhanced information for email and SMS */}
                          {(event.type === 'email' || event.type === 'sms') && (
                            <div className="mt-2 space-y-1">
                              {event.type === 'email' && event.templateSubject && (
                                <p className="text-xs font-medium text-blue-600" data-testid="email-subject">
                                  📧 Subject: {event.templateSubject}
                                </p>
                              )}
                              {event.templatePreview && (
                                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border" data-testid="message-preview">
                                  {event.templatePreview}
                                </p>
                              )}
                              {event.automationName && (
                                <p className="text-xs text-purple-600" data-testid="automation-name">
                                  🔄 Automation: {event.automationName}
                                </p>
                              )}
                            </div>
                          )}
                          
                          <p className="text-xs text-muted-foreground mt-2">
                            {event.createdAt ? formatDate(event.createdAt) : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {'status' in event && (
                          <Badge variant={event.status === 'SENT' ? 'secondary' : event.status === 'SIGNED' ? 'default' : 'outline'}>
                            {event.status}
                          </Badge>
                        )}
                        {'totalCents' in event && (
                          <span className="font-medium">
                            ${((event.totalCents || 0) / 100).toFixed(2)}
                          </span>
                        )}
                        {'amountCents' in event && (
                          <span className="font-medium">
                            ${((event.amountCents || 0) / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No activity yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Messages, proposals, and other interactions will appear here
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Messaging Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Messages</CardTitle>
                {!showMessageForm && messages.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowMessageForm(true)}
                    data-testid="button-new-message"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    New Message
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {messages.length === 0 && !showMessageForm ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No messages yet</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setShowMessageForm(true)}
                    data-testid="button-start-conversation"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Start Conversation
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Message List */}
                  {messages.length > 0 && (
                    <ScrollArea className="h-64 pr-4">
                      <div className="space-y-3">
                        {messages.map((message) => (
                          <div 
                            key={message.id} 
                            className={`flex ${message.sentByPhotographer ? 'justify-end' : 'justify-start'}`}
                            data-testid={`message-${message.id}`}
                          >
                            <div 
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.sentByPhotographer 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <p className="text-xs mt-1 opacity-70">
                                {message.createdAt ? formatDate(message.createdAt) : 'Unknown'}
                                {message.sentByPhotographer && (
                                  <span className="ml-1">(You)</span>
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  
                  {/* Message Form */}
                  {showMessageForm && (
                    <div className="border-t pt-4 mt-4">
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="min-h-[100px]"
                          data-testid="textarea-message-content"
                        />
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setShowMessageForm(false);
                              setNewMessage("");
                            }}
                            data-testid="button-cancel-message"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={() => sendMessageMutation.mutate(newMessage)}
                            disabled={!newMessage.trim() || sendMessageMutation.isPending}
                            data-testid="button-submit-message"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}