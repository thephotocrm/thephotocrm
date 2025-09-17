import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ProposalForm from "@/components/forms/proposal-form";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { type ClientWithStage, type Package } from "@shared/schema";

export default function ProposalNew() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL LOGIC - Rules of Hooks!
  // Fetch clients for the form
  const { data: clients = [], isLoading: clientsLoading } = useQuery<ClientWithStage[]>({
    queryKey: ["/api/clients"],
    enabled: !!user
  });

  // Fetch packages for the form
  const { data: packages = [] } = useQuery<Package[]>({
    queryKey: ["/api/packages"],
    enabled: !!user
  });

  // Redirect to login if not authenticated  
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const createProposalMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/proposals", data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Proposal created successfully!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      setLocation("/proposals");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create proposal",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (data: any) => {
    createProposalMutation.mutate(data);
  };

  if (clientsLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-1" />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation("/proposals")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">Create New Proposal</h1>
              <p className="text-muted-foreground">Create a proposal for your client</p>
            </div>
          </div>
        </header>

        <div className="p-6">
          <ProposalForm
            clients={clients}
            packages={packages}
            onSubmit={handleSubmit}
            isLoading={createProposalMutation.isPending}
            submitText="Create Proposal"
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}