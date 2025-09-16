import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
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
  ExternalLink
} from "lucide-react";
import { type ClientWithStage, type Estimate, type Message } from "@shared/schema";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ClientDetail() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams();
  const clientId = params.id;

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

  const { data: client, isLoading } = useQuery<ClientWithStage>({
    queryKey: ["/api/clients", clientId],
    enabled: !!user && !!clientId
  });

  const { data: estimates } = useQuery<Estimate[]>({
    queryKey: ["/api/estimates", "client", clientId],
    enabled: !!user && !!clientId
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["/api/clients", clientId, "messages"],
    enabled: !!user && !!clientId
  });

  const [newMessage, setNewMessage] = useState("");
  const [showMessageForm, setShowMessageForm] = useState(false);

  const sendLoginLinkMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/clients/${clientId}/send-login-link`);
    },
    onSuccess: () => {
      toast({
        title: "Login link sent",
        description: "Client will receive an email with their portal access link.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send login link. Please try again.",
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
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "messages"] });
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto">
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
        </main>
      </div>
    );
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
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
                    <Button variant="outline" size="sm" className="mt-2" data-testid="button-assign-stage">
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
                    {estimates?.length || 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Total Value</span>
                  </div>
                  <span className="font-medium" data-testid="text-total-value">
                    {estimates ? formatCurrency(estimates.reduce((sum: number, est: any) => sum + (est.totalCents || 0), 0)) : "$0.00"}
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

          {/* History Section */}
          <Card>
            <CardHeader>
              <CardTitle>Client History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {estimates && estimates.length > 0 ? (
                  estimates.map((estimate: any) => (
                    <div key={estimate.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`history-estimate-${estimate.id}`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{estimate.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Created {formatDate(estimate.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant={estimate.status === 'SENT' ? 'secondary' : estimate.status === 'SIGNED' ? 'default' : 'outline'}>
                          {estimate.status}
                        </Badge>
                        <span className="font-medium">
                          {formatCurrency(estimate.totalCents)}
                        </span>
                        <Button variant="ghost" size="sm" data-testid={`button-view-estimate-${estimate.id}`}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No activity yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Proposals, messages, and other interactions will appear here
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
      </main>
    </div>
  );
}