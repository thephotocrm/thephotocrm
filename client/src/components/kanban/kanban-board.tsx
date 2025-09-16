import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ClientCard from "./client-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  weddingDate?: string;
  stageId?: string;
  stageEnteredAt?: string;
  createdAt: string;
}

interface Stage {
  id: string;
  name: string;
  orderIndex: number;
  isDefault: boolean;
}

interface KanbanBoardProps {
  clients: Client[];
  stages: Stage[];
}

export default function KanbanBoard({ clients, stages }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const moveClientMutation = useMutation({
    mutationFn: async ({ clientId, stageId }: { clientId: string; stageId: string }) => {
      await apiRequest("PUT", `/api/clients/${clientId}/stage`, { stageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client moved",
        description: "Client has been moved to the new stage.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to move client. Please try again.",
        variant: "destructive"
      });
    }
  });

  const getClientsForStage = (stageId: string) => {
    return clients.filter(client => client.stageId === stageId);
  };

  const handleClientMove = (clientId: string, newStageId: string) => {
    moveClientMutation.mutate({ clientId, stageId: newStageId });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-x-auto min-h-[500px]">
      {stages.map((stage) => {
        const stageClients = getClientsForStage(stage.id);
        
        return (
          <div key={stage.id} className="flex flex-col">
            {/* Stage Header */}
            <div className="bg-muted rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{stage.name}</h3>
                <Badge variant="secondary" data-testid={`stage-count-${stage.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  {stageClients.length}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stage.isDefault ? "Default stage for new clients" : "Client progression stage"}
              </p>
            </div>

            {/* Client Cards */}
            <div className="space-y-3 flex-1">
              {stageClients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  onMove={(newStageId) => handleClientMove(client.id, newStageId)}
                />
              ))}
              
              {/* Add Client Button */}
              <Button
                variant="outline"
                className="w-full h-20 border-dashed text-muted-foreground hover:bg-accent"
                data-testid={`button-add-client-${stage.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                + Add client to {stage.name}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
