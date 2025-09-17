import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, DollarSign, Clock, Send, Eye, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Estimate, Client } from "@shared/schema";

interface EstimateWithClient extends Estimate {
  client: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function Estimates() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch estimates
  const { data: estimates = [], isLoading: estimatesLoading } = useQuery<EstimateWithClient[]>({
    queryKey: ["/api/estimates"],
    enabled: !!user
  });

  // Send proposal mutation
  const sendProposalMutation = useMutation({
    mutationFn: (estimateId: string) => apiRequest("POST", `/api/estimates/${estimateId}/send`, {}),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Proposal sent to client successfully!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send proposal",
        variant: "destructive"
      });
    }
  });

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

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Proposals</h1>
              <p className="text-muted-foreground">Create and manage client proposals</p>
            </div>
            
            <Button 
              onClick={() => setLocation("/estimates/new")}
              data-testid="button-create-proposal"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Proposal
            </Button>
          </div>
        </header>

        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estimates.length}</div>
                <p className="text-xs text-muted-foreground">{estimates.filter(e => e.sentAt).length} sent</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${((estimates.reduce((sum, e) => sum + (e.totalCents || 0), 0)) / 100).toFixed(0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {estimates.filter(e => e.status === 'SIGNED').length} signed
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
                  {estimates.filter(e => e.sentAt && e.status === 'DRAFT').length}
                </div>
                <p className="text-xs text-muted-foreground">Awaiting client response</p>
              </CardContent>
            </Card>
          </div>

          {/* Estimates List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Proposals</CardTitle>
            </CardHeader>
            <CardContent>
              {estimatesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : estimates.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No proposals created yet.</p>
                  <Button 
                    onClick={() => setLocation("/estimates/new")}
                    data-testid="button-create-first-proposal"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Proposal
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {estimates.map((estimate) => (
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
                            {estimate.client.firstName} {estimate.client.lastName} • 
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
                            <DropdownMenuItem onClick={() => window.open(`/estimates/${estimate.token}`, '_blank')}>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            {estimate.sentAt && (
                              <DropdownMenuItem onClick={() => sendProposalMutation.mutate(estimate.id)}>
                                <Send className="w-4 h-4 mr-2" />
                                Resend
                              </DropdownMenuItem>
                            )}
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
      </main>
    </div>
  );
}
