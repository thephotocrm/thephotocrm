import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Calendar, ChevronRight, MoreVertical, Settings } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type ProjectWithClientAndStage, type Contact } from "@shared/schema";

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
  const [isManageStagesOpen, setIsManageStagesOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState("");
  const [clientId, setClientId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [noDateYet, setNoDateYet] = useState(false);
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [activeProjectType, setActiveProjectType] = useState<string>("WEDDING");

  // Handle clientId query parameter to pre-select client
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const clientIdParam = urlParams.get('clientId');
    if (clientIdParam) {
      setClientId(clientIdParam);
      setIsDialogOpen(true);
    }
  }, []);

  // Fetch projects with auto-refresh
  const { data: projects, isLoading: projectsLoading } = useQuery<ProjectWithClientAndStage[]>({
    queryKey: ["/api/projects", activeProjectType],
    queryFn: () => fetch(`/api/projects?projectType=${activeProjectType}`).then(res => res.json()),
    enabled: !!user,
    refetchInterval: 30000
  });

  // Fetch stages
  const { data: stages, isLoading: stagesLoading } = useQuery({
    queryKey: ["/api/stages", activeProjectType],
    queryFn: () => fetch(`/api/stages?projectType=${activeProjectType}`).then(res => res.json()),
    enabled: !!user
  });

  // Fetch clients for the dropdown
  const { data: clients, isLoading: clientsLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    enabled: !!user
  });

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      await apiRequest("POST", "/api/projects", projectData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
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
    setNoDateYet(false);
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

  // Filter projects by stage and search
  const filteredProjects = projects?.filter((project: ProjectWithClientAndStage) => {
    const matchesStage = selectedStage === "ALL" || project.stageId === selectedStage;
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${project.client?.firstName} ${project.client?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStage && matchesSearch;
  }) || [];

  // Calculate stage counts
  const getStageCounts = () => {
    const counts: Record<string, number> = { ALL: projects?.length ?? 0 };
    
    stages?.forEach((stage: any) => {
      counts[stage.id] = (projects?.filter((p: any) => p.stageId === stage.id)?.length) ?? 0;
    });
    
    return counts;
  };

  const stageCounts = getStageCounts();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getProjectTypeLabel = (type: string) => {
    return PROJECT_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="h-full flex flex-col w-full">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 md:px-6 py-4 shrink-0 min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <SidebarTrigger 
              data-testid="button-menu-toggle" 
              className="hidden md:inline-flex shrink-0" 
            />
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-semibold">Projects</h1>
            </div>
          </div>
          
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsManageStagesOpen(true)}
              data-testid="button-customize-pipeline"
            >
              <Settings className="w-4 h-4 mr-2" />
              Customize Pipeline
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-new" className="bg-black hover:bg-black/90 text-white">
                  CREATE NEW
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
                    <Label htmlFor="clientId">Contact *</Label>
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
                      onChange={(e) => {
                        setEventDate(e.target.value);
                        if (e.target.value) {
                          setNoDateYet(false);
                        }
                      }}
                      disabled={noDateYet}
                      data-testid="input-event-date"
                    />
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="checkbox"
                        id="noDateYet"
                        checked={noDateYet}
                        onChange={(e) => {
                          setNoDateYet(e.target.checked);
                          if (e.target.checked) {
                            setEventDate("");
                          }
                        }}
                        data-testid="checkbox-no-date-yet"
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="noDateYet" className="text-sm font-normal cursor-pointer">
                        I don't have a date yet
                      </Label>
                    </div>
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

      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="p-4 md:p-6 space-y-4 min-w-0">
          {/* Project Type Filter */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">View:</span>
            <Select value={activeProjectType} onValueChange={setActiveProjectType}>
              <SelectTrigger className="w-48" data-testid="select-project-type-filter">
                <SelectValue />
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

          {/* Horizontal Stage Slider */}
          <div className="relative -mx-4 md:-mx-6 max-w-full">
            <div className="flex gap-2 px-4 md:px-6 overflow-x-auto pb-2 max-w-full">
              <Button
                variant={selectedStage === "ALL" ? "default" : "outline"}
                className={cn(
                  "shrink-0 rounded-lg transition-all px-4 py-3 h-auto",
                  selectedStage === "ALL" ? "bg-black text-white hover:bg-black/90" : ""
                )}
                onClick={() => setSelectedStage("ALL")}
                data-testid="button-stage-all"
              >
                <div className="flex flex-col items-center gap-1 w-full">
                  <span className="text-2xl font-semibold leading-tight">{stageCounts.ALL || 0}</span>
                  <span className="text-xs whitespace-nowrap">All</span>
                </div>
              </Button>
              
              {stages?.map((stage: any) => (
                <Button
                  key={stage.id}
                  variant={selectedStage === stage.id ? "default" : "outline"}
                  className={cn(
                    "shrink-0 rounded-lg transition-all min-w-[100px] max-w-[160px] px-4 py-3 h-auto",
                    selectedStage === stage.id ? "bg-black text-white hover:bg-black/90" : ""
                  )}
                  onClick={() => setSelectedStage(stage.id)}
                  data-testid={`button-stage-${stage.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex flex-col items-center gap-1 w-full overflow-hidden">
                    <span className="text-2xl font-semibold leading-tight">{stageCounts[stage.id] || 0}</span>
                    <span className="text-xs text-center leading-tight break-words w-full px-1">{stage.name}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects or clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-projects"
            />
          </div>

          {/* Projects List */}
          {projectsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card className="p-8">
              <div className="text-center">
                <p className="text-muted-foreground">No projects found.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchTerm || selectedStage !== "ALL" 
                    ? "Try adjusting your search or filter criteria." 
                    : "Create your first project to get started."
                  }
                </p>
              </div>
            </Card>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="space-y-3 md:hidden">
                {filteredProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setLocation(`/projects/${project.id}`)}
                    data-testid={`row-project-${project.id}`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold break-words" data-testid={`text-project-title-${project.id}`}>
                            {project.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {project.client?.firstName} {project.client?.lastName}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="shrink-0" data-testid={`button-actions-${project.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/projects/${project.id}`);
                            }}>
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {getProjectTypeLabel(project.projectType)}
                        </Badge>
                        {project.stage && (
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
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{project.eventDate ? formatDate(project.eventDate) : 'TBD'}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <Card className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PROJECT NAME</TableHead>
                      <TableHead>CONTACT</TableHead>
                      <TableHead>TYPE</TableHead>
                      <TableHead>DATE</TableHead>
                      <TableHead>STAGE</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow 
                        key={project.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setLocation(`/projects/${project.id}`)}
                        data-testid={`row-project-${project.id}`}
                      >
                        <TableCell className="font-medium" data-testid={`text-project-title-${project.id}`}>
                          {project.title}
                        </TableCell>
                        <TableCell>{project.client?.firstName} {project.client?.lastName}</TableCell>
                        <TableCell>{getProjectTypeLabel(project.projectType)}</TableCell>
                        <TableCell>
                          {project.eventDate ? formatDate(project.eventDate) : 'TBD'}
                        </TableCell>
                        <TableCell>
                          {project.stage && (
                            <Badge 
                              variant="outline"
                              style={{
                                borderColor: project.stage.color,
                                color: project.stage.color,
                                backgroundColor: `${project.stage.color}10`
                              }}
                            >
                              {project.stage.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" data-testid={`button-actions-${project.id}`}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/projects/${project.id}`);
                              }}>
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Manage Stages Dialog */}
      <Dialog open={isManageStagesOpen} onOpenChange={setIsManageStagesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customize Pipeline</DialogTitle>
            <DialogDescription>
              Manage your project stages and pipeline configuration
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Stage management interface coming soon. For now, stages can be managed from the Dashboard.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
