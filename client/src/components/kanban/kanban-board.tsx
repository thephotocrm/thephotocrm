import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ClientCard from "./client-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  isLoading?: boolean;
  onAddProject?: (stageId: string, stageName: string) => void;
}

// Loading skeleton for the kanban board
function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-x-auto min-h-[500px]">
      {Array.from({ length: 4 }).map((_, stageIndex) => (
        <div key={stageIndex} className="flex flex-col">
          {/* Stage Header Skeleton */}
          <div className="bg-muted rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-8 rounded-full" />
            </div>
            <Skeleton className="h-3 w-32 mt-2" />
          </div>
          
          {/* Project Cards Skeleton */}
          <div className="space-y-3 flex-1">
            {Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map((_, cardIndex) => (
              <div key={cardIndex} className="bg-card border rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex items-center justify-between text-xs">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
            <Skeleton className="w-full h-20 border-dashed rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function KanbanBoard({ projects, stages, isLoading = false, onAddProject }: KanbanBoardProps) {
  
  if (isLoading) {
    return <KanbanSkeleton />;
  }
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
                onClick={() => onAddProject?.(stage.id, stage.name)}
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
