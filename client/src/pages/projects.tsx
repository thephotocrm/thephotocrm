import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Calendar, User, FolderOpen, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Badge,
} from "@/components/ui/badge";

import { type ProjectWithClientAndStage, type Client } from "@shared/schema";

const PROJECT_TYPES = [
  { value: "WEDDING", label: "Wedding" },
  { value: "ENGAGEMENT", label: "Engagement" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "CORPORATE", label: "Corporate" },
  { value: "PORTRAIT", label: "Portrait" },
  { value: "FAMILY", label: "Family" },
  { value: "MATERNITY", label: "Maternity" },
  { value: "NEWBORN", label: "Newborn" },
  { value: "EVENT", label: "Event" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "OTHER", label: "Other" }
];

export default function Projects() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState("");
  const [clientId, setClientId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery<ProjectWithClientAndStage[]>({
    queryKey: ["/api/projects"],
    enabled: !!user
  });

  // Fetch clients for the dropdown
  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: !!user
  });

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      await apiRequest("POST", "/api/projects", projectData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Project created",
        description: "New project has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setTitle("");
    setProjectType("");
    setClientId("");
    setEventDate("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !projectType || !clientId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    createProjectMutation.mutate({
      title,
      projectType,
      clientId,
      eventDate: eventDate ? new Date(eventDate) : undefined,
      notes: notes || undefined
    });
  };

  // Filter and search projects
  const filteredProjects = projects?.filter((project: ProjectWithClientAndStage) => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${project.client?.firstName} ${project.client?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === "ALL" || project.projectType === filterType;
    
    return matchesSearch && matchesFilter;
  }) || [];

  // Group projects by type
  const groupedProjects = filteredProjects.reduce((groups: Record<string, ProjectWithClientAndStage[]>, project: ProjectWithClientAndStage) => {
    const type = project.projectType;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(project);
    return groups;
  }, {} as Record<string, ProjectWithClientAndStage[]>);

  const getProjectTypeLabel = (type: string) => {
    return PROJECT_TYPES.find(t => t.value === type)?.label || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div>
        {/* Header */}
        <header className="bg-card border-b border-border px-4 md:px-6 py-4 relative">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <SidebarTrigger 
                data-testid="button-menu-toggle" 
                className="hidden md:inline-flex shrink-0" 
              />
              <div className="min-w-0 pr-12 md:pr-0">
                <h1 className="text-xl md:text-2xl font-semibold truncate">Projects</h1>
                <p className="text-sm md:text-base text-muted-foreground hidden sm:block">Manage your photography projects</p>
              </div>
            </div>
            
            <div className="shrink-0 w-full sm:w-auto">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-project" className="w-full sm:w-auto">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Project</DialogTitle>
                    <DialogDescription>
                      Create a new photography project and assign it to a client.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Project Title *</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter project title"
                        required
                        data-testid="input-project-title"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="projectType">Project Type *</Label>
                      <Select value={projectType} onValueChange={setProjectType}>
                        <SelectTrigger data-testid="select-project-type">
                          <SelectValue placeholder="Select project type" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clientId">Client *</Label>
                      <Select value={clientId} onValueChange={setClientId}>
                        <SelectTrigger data-testid="select-client">
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients?.map((client: any) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.firstName} {client.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="eventDate">Event Date</Label>
                      <Input
                        id="eventDate"
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        data-testid="input-event-date"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional project notes..."
                        rows={3}
                        data-testid="textarea-project-notes"
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createProjectMutation.isPending}
                        data-testid="button-create-project"
                      >
                        {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Search and Filter */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects or clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-projects"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48" data-testid="select-filter-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {PROJECT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Projects by Type */}
          {projectsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No projects found.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchTerm || filterType !== "ALL" 
                      ? "Try adjusting your search or filter criteria." 
                      : "Create your first project to get started."
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedProjects).map(([type, typeProjects]) => (
                <Card key={type}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-sm bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                        {getProjectTypeLabel(type)}
                      </Badge>
                      <span className="text-muted-foreground text-sm font-normal">
                        ({(typeProjects as any[]).length} {(typeProjects as any[]).length === 1 ? 'project' : 'projects'})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {(typeProjects as any[]).map((project) => (
                        <Card key={project.id} className="border border-border/50 hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-200 hover:shadow-md bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-900 dark:to-purple-950/20">
                          <CardContent className="p-4 relative">
                            {/* Purple accent corner */}
                            <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-purple-100 to-transparent dark:from-purple-900/50 dark:to-transparent rounded-bl-lg rounded-tr-lg"></div>
                            <div className="space-y-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 rounded-full bg-purple-400 dark:bg-purple-500"></div>
                                  <h3 className="font-medium text-sm truncate" data-testid={`text-project-title-${project.id}`}>
                                    {project.title}
                                  </h3>
                                </div>
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <User className="w-3 h-3 mr-1 text-purple-500 dark:text-purple-400" />
                                  {project.client?.firstName} {project.client?.lastName}
                                </div>
                              </div>

                              {project.eventDate && (
                                <div className="flex items-center text-xs text-muted-foreground bg-purple-50 dark:bg-purple-950/30 px-2 py-1 rounded-md">
                                  <Calendar className="w-3 h-3 mr-1 text-purple-500 dark:text-purple-400" />
                                  {formatDate(project.eventDate)}
                                </div>
                              )}

                              {project.stage && (
                                <div>
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs"
                                    style={{
                                      borderColor: project.stage.color,
                                      color: project.stage.color,
                                      backgroundColor: `${project.stage.color}10`
                                    }}
                                  >
                                    {project.stage.name}
                                  </Badge>
                                </div>
                              )}

                              <div className="pt-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full text-xs border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/50 dark:hover:border-purple-700"
                                  onClick={() => setLocation(`/projects/${project.id}`)}
                                  data-testid={`button-view-project-${project.id}`}
                                >
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}