import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, DollarSign, Clock, Send, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Estimate, Client } from "@shared/schema";

interface ProposalWithClient extends Estimate {
  client: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function Proposals() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch proposals
  const { data: proposals = [], isLoading: proposalsLoading } = useQuery<ProposalWithClient[]>({
    queryKey: ["/api/proposals"],
    enabled: !!user
  });

  // Send proposal mutation
  const sendProposalMutation = useMutation({
    mutationFn: (proposalId: string) => apiRequest("POST", `/api/proposals/${proposalId}/send`, {}),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Proposal sent to client successfully!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete proposal",
        variant: "destructive"
      });
    }
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  // Prevent flash of protected content
  if (!loading && !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
        {/* Header */}
        <header className="bg-card border-b border-border px-4 md:px-6 py-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SidebarTrigger 
                data-testid="button-menu-toggle" 
                className="hidden md:inline-flex" 
              />
              <div>
                <h1 className="text-xl md:text-2xl font-semibold">Proposals</h1>
                <p className="text-sm md:text-base text-muted-foreground">Create and manage client proposals</p>
              </div>
            </div>
            
            <Button 
              onClick={() => setLocation("/proposals/new")}
              data-testid="button-create-proposal"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Proposal
            </Button>
          </div>
        </header>

        <div className="p-6">
          {/* Stats Cards */}
          <div className="hidden md:grid md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{proposals.length}</div>
                <p className="text-xs text-muted-foreground">{proposals.filter(e => e.sentAt).length} sent</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${((proposals.reduce((sum, e) => sum + (e.totalCents || 0), 0)) / 100).toFixed(0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {proposals.filter(e => e.status === 'SIGNED').length} signed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {proposals.filter(e => e.sentAt && e.status === 'DRAFT').length}
                </div>
                <p className="text-xs text-muted-foreground">Awaiting client response</p>
              </CardContent>
            </Card>
          </div>

          {/* Proposals List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Proposals</CardTitle>
            </CardHeader>
            <CardContent>
              {proposalsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : proposals.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No proposals created yet.</p>
                  <Button 
                    onClick={() => setLocation("/proposals/new")}
                    data-testid="button-create-first-proposal"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Proposal
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {proposals.map((proposal) => (
                    <div 
                      key={proposal.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      data-testid={`proposal-${proposal.id}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          proposal.status === 'SIGNED' ? 'bg-green-100' :
                          proposal.sentAt ? 'bg-blue-100' :
                          'bg-gray-100'
                        }`}>
                          {proposal.status === 'SIGNED' ? (
                            <FileText className="w-5 h-5 text-green-600" />
                          ) : proposal.sentAt ? (
                            <Send className="w-5 h-5 text-blue-600" />
                          ) : (
                            <FileText className="w-5 h-5 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">{proposal.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {proposal.client.firstName} {proposal.client.lastName} • 
                            ${((proposal.totalCents || 0) / 100).toFixed(2)}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={
                              proposal.status === 'SIGNED' ? 'default' : 
                              proposal.sentAt ? 'secondary' : 'outline'
                            }>
                              {proposal.sentAt ? (
                                proposal.status === 'SIGNED' ? 'Signed' : 'Sent'
                              ) : 'Draft'}
                            </Badge>
                            {proposal.sentAt && (
                              <span className="text-xs text-muted-foreground">
                                Sent {new Date(proposal.sentAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {!proposal.sentAt && (
                          <Button 
                            size="sm" 
                            onClick={() => sendProposalMutation.mutate(proposal.id)}
                            disabled={sendProposalMutation.isPending}
                            data-testid={`send-proposal-${proposal.id}`}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {sendProposalMutation.isPending ? 'Sending...' : 'Send'}
                          </Button>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`menu-proposal-${proposal.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.open(`/public/proposals/${proposal.token}`, '_blank')}>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            {proposal.sentAt && (
                              <DropdownMenuItem onClick={() => sendProposalMutation.mutate(proposal.id)}>
                                <Send className="w-4 h-4 mr-2" />
                                Resend
                              </DropdownMenuItem>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} data-testid={`delete-proposal-${proposal.id}`}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Proposal</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{proposal.title}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel data-testid="cancel-delete-proposal">Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteProposalMutation.mutate(proposal.id)}
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
              )}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}