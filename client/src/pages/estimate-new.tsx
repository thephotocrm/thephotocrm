import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import EstimateForm from "@/components/forms/estimate-form";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { type ClientWithStage, type Package } from "@shared/schema";

export default function EstimateNew() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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

  const createEstimateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/estimates", data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Proposal created successfully!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      setLocation("/estimates");
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
    createEstimateMutation.mutate(data);
  };

  if (clientsLoading) {
    return (
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation("/estimates")}
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
          <EstimateForm
            clients={clients}
            packages={packages}
            onSubmit={handleSubmit}
            isLoading={createEstimateMutation.isPending}
            submitText="Create Proposal"
          />
        </div>
      </main>
    </div>
  );
}
