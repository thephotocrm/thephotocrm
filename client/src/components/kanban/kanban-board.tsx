import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ClientCard from "./client-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  title: string;
  projectType: string;
  clientId: string;
  client?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  eventDate?: string;
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
  projects: Project[];
  stages: Stage[];
}

export default function KanbanBoard({ projects, stages }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const moveProjectMutation = useMutation({
    mutationFn: async ({ projectId, stageId }: { projectId: string; stageId: string }) => {
      await apiRequest("PUT", `/api/projects/${projectId}/stage`, { stageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project moved",
        description: "Project has been moved to the new stage.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to move project. Please try again.",
        variant: "destructive"
      });
    }
  });

  const getProjectsForStage = (stageId: string) => {
    return projects.filter(project => project.stageId === stageId);
  };

  const handleProjectMove = (projectId: string, newStageId: string) => {
    moveProjectMutation.mutate({ projectId, stageId: newStageId });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-x-auto min-h-[500px]">
      {Array.isArray(stages) ? stages.map((stage) => {
        const stageProjects = getProjectsForStage(stage.id);
        
        return (
          <div key={stage.id} className="flex flex-col">
            {/* Stage Header */}
            <div className="bg-muted rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{stage.name}</h3>
                <Badge variant="secondary" data-testid={`stage-count-${stage.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  {stageProjects.length}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stage.isDefault ? "Default stage for new projects" : "Project progression stage"}
              </p>
            </div>

            {/* Project Cards */}
            <div className="space-y-3 flex-1">
              {stageProjects.map((project) => (
                <ClientCard
                  key={project.id}
                  client={project}
                  onMove={(newStageId) => handleProjectMove(project.id, newStageId)}
                />
              ))}
              
              {/* Add Project Button */}
              <Button
                variant="outline"
                className="w-full h-20 border-dashed text-muted-foreground hover:bg-accent"
                data-testid={`button-add-project-${stage.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                + Add project to {stage.name}
              </Button>
            </div>
          </div>
        );
      }) : <div className="col-span-4 text-center text-muted-foreground py-8">
        Failed to load stages. Please refresh the page.
      </div>}
    </div>
  );
}
