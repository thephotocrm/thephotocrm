import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { projectTypeEnum, insertProjectSchema, insertStageSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import KanbanBoard from "@/components/kanban/kanban-board";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, CheckCircle, DollarSign, Clock, Search, Plus, Edit2, Trash2, GripVertical, Save, X } from "lucide-react";

type InsertProject = z.infer<typeof insertProjectSchema>;
type InsertStage = z.infer<typeof insertStageSchema>;

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeProjectType, setActiveProjectType] = useState<string>('WEDDING');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isManageStagesOpen, setIsManageStagesOpen] = useState(false);
  const [isStageFormOpen, setIsStageFormOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect admins to admin dashboard
  useEffect(() => {
    if (user && user.role === 'ADMIN' && !user.photographerId) {
      setLocation('/admin/dashboard');
    }
  }, [user, setLocation]);

  // Form setup with proper schema validation
  const form = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      title: '',
      projectType: 'WEDDING',
      clientId: '',
      eventDate: undefined,
      leadSource: undefined,
      smsOptIn: true,
      emailOptIn: true,
      notes: ''
    }
  });

  // Stage form setup
  const stageForm = useForm<InsertStage>({
    resolver: zodResolver(insertStageSchema),
    defaultValues: {
      name: '',
      projectType: 'WEDDING',
      orderIndex: 0,
      color: '#64748b',
      isDefault: false
    }
  });

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL LOGIC
  const { data: stats } = useQuery({
    queryKey: ["/api/reports/summary"],
    enabled: !!user
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects", activeProjectType],
    queryFn: () => fetch(`/api/projects?projectType=${activeProjectType}`).then(res => res.json()),
    enabled: !!user,
    refetchInterval: 30000 // Auto-refresh every 30 seconds to catch automation changes
  });

  const { data: stages, isLoading: stagesLoading } = useQuery({
    queryKey: ["/api/stages", activeProjectType], 
    queryFn: () => fetch(`/api/stages?projectType=${activeProjectType}`).then(res => res.json()),
    enabled: !!user
  });

  // Fetch clients for project creation
  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    enabled: !!user
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: InsertProject) => {
      return await apiRequest("POST", "/api/projects", projectData);
    },
    onSuccess: () => {
      // Invalidate both projects and stages to refresh the dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stages", activeProjectType] });
      setIsCreateProjectOpen(false);
      form.reset();
      toast({
        title: "Project created",
        description: "New project has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to create project. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Stage mutations
  const createStageMutation = useMutation({
    mutationFn: async (stageData: InsertStage) => {
      return await apiRequest("POST", "/api/stages", stageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stages", activeProjectType] });
      setIsStageFormOpen(false);
      stageForm.reset();
      toast({
        title: "Stage created",
        description: "New stage has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to create stage. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateStageMutation = useMutation({
    mutationFn: async (data: { id: string; stageData: Partial<InsertStage> }) => {
      return await apiRequest("PUT", `/api/stages/${data.id}`, data.stageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stages", activeProjectType] });
      setIsStageFormOpen(false);
      setEditingStage(null);
      stageForm.reset();
      toast({
        title: "Stage updated",
        description: "Stage has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update stage. Please try again.",
        variant: "destructive"
      });
    }
  });

  const deleteStageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      return await apiRequest("DELETE", `/api/stages/${stageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stages", activeProjectType] });
      toast({
        title: "Stage deleted",
        description: "Stage has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to delete stage. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Utility functions
  const openCreateProjectModal = (projectType?: string, stageId?: string) => {
    form.setValue('projectType', projectType || activeProjectType);
    setIsCreateProjectOpen(true);
  };

  const handleCreateProject = (data: InsertProject) => {
    createProjectMutation.mutate(data);
  };

  // Stage management handlers
  const openStageManagement = () => {
    setIsManageStagesOpen(true);
  };

  const openStageForm = (stage?: any) => {
    if (stage) {
      setEditingStage(stage);
      stageForm.setValue('name', stage.name);
      stageForm.setValue('projectType', stage.projectType);
      stageForm.setValue('orderIndex', stage.orderIndex);
      stageForm.setValue('color', stage.color);
      stageForm.setValue('isDefault', stage.isDefault);
    } else {
      setEditingStage(null);
      stageForm.reset();
      stageForm.setValue('projectType', activeProjectType);
      // Set orderIndex to be next in sequence
      const currentStages = Array.isArray(stages) ? stages : [];
      const maxOrder = currentStages.length > 0 ? Math.max(...currentStages.map((s: any) => s.orderIndex)) : -1;
      stageForm.setValue('orderIndex', maxOrder + 1);
    }
    setIsStageFormOpen(true);
  };

  const handleStageSubmit = (data: InsertStage) => {
    if (editingStage) {
      updateStageMutation.mutate({ id: editingStage.id, stageData: data });
    } else {
      createStageMutation.mutate(data);
    }
  };

  const handleDeleteStage = (stageId: string) => {
    if (confirm('Are you sure you want to delete this stage? This action cannot be undone.')) {
      deleteStageMutation.mutate(stageId);
    }
  };

  // Filter projects based on search query
  const filteredProjects = (Array.isArray(projects) ? projects : []).filter((project: any) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const title = project.title?.toLowerCase() || '';
    const clientName = `${project.client?.firstName || ''} ${project.client?.lastName || ''}`.toLowerCase();
    const email = project.client?.email?.toLowerCase() || '';
    
    return title.includes(query) || clientName.includes(query) || email.includes(query);
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
          {/* Hamburger menu positioned absolutely at top-right */}
          <SidebarTrigger 
            data-testid="button-menu-toggle" 
            className="hidden md:inline-flex" 
          />
          
          {/* Desktop layout - horizontal */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="md:ml-0">
                <h1 className="text-2xl font-semibold">Project Pipeline</h1>
                <p className="text-muted-foreground">Manage your {activeProjectType.toLowerCase()} photography projects through each stage</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Input 
                  placeholder="Search projects..." 
                  className="w-64 pl-10"
                  data-testid="input-search-projects"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-muted-foreground" />
              </div>
              
              {/* Add Project Button */}
              <Button onClick={() => openCreateProjectModal()} data-testid="button-add-project">
                <Plus className="w-5 h-5 mr-2" />
                Add Project
              </Button>
            </div>
          </div>
          
          {/* Mobile layout - column */}
          <div className="md:hidden space-y-4">
            {/* Title */}
            <div>
              <h1 className="text-xl font-semibold">Project Pipeline</h1>
              <p className="text-sm text-muted-foreground">Manage your {activeProjectType.toLowerCase()} photography projects</p>
            </div>
            
            {/* Search and Add Project stacked */}
            <div className="space-y-3">
              <div className="relative">
                <Input 
                  placeholder="Search projects..." 
                  className="w-full pl-10"
                  data-testid="input-search-projects"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-muted-foreground" />
              </div>
              
              <Button 
                onClick={() => openCreateProjectModal()} 
                data-testid="button-add-project"
                className="w-full"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Project
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-3 sm:p-6 space-y-6">
          {/* Project Type Selection */}
          <Tabs value={activeProjectType} onValueChange={setActiveProjectType} className="w-full">
            <div className="flex items-center justify-between mb-6">
              {/* Desktop tabs - showing first 5 most common types */}
              <div className="hidden md:flex flex-wrap gap-2 max-w-5xl">
                {(Object.keys(projectTypeEnum) as Array<keyof typeof projectTypeEnum>).map((value) => (
                  <Button
                    key={value}
                    variant={activeProjectType === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveProjectType(value)}
                    data-testid={`tab-${value.toLowerCase()}`}
                    className="flex items-center gap-2"
                  >
                    {value === "WEDDING" && "💒 Wedding"}
                    {value === "ENGAGEMENT" && "💍 Engagement"}
                    {value === "PROPOSAL" && "💍 Proposal"}
                    {value === "PORTRAIT" && "🎭 Portrait"}
                    {value === "CORPORATE" && "🏢 Corporate"}
                    {value === "FAMILY" && "👨‍👩‍👧‍👦 Family"}
                    {value === "MATERNITY" && "🤱 Maternity"}
                    {value === "NEWBORN" && "👶 Newborn"}
                    {value === "EVENT" && "🎉 Event"}
                    {value === "COMMERCIAL" && "📸 Commercial"}
                    {value === "OTHER" && "📁 Other"}
                  </Button>
                ))}
              </div>
              
              {/* Mobile dropdown */}
              <div className="md:hidden w-full max-w-xs">
                <Select value={activeProjectType} onValueChange={setActiveProjectType}>
                  <SelectTrigger data-testid="select-project-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEDDING">💒 Wedding</SelectItem>
                    <SelectItem value="ENGAGEMENT">💍 Engagement</SelectItem>
                    <SelectItem value="PROPOSAL">💍 Proposal</SelectItem>
                    <SelectItem value="PORTRAIT">🎭 Portrait</SelectItem>
                    <SelectItem value="CORPORATE">🏢 Corporate</SelectItem>
                    <SelectItem value="FAMILY">👨‍👩‍👧‍👦 Family</SelectItem>
                    <SelectItem value="MATERNITY">🤱 Maternity</SelectItem>
                    <SelectItem value="NEWBORN">👶 Newborn</SelectItem>
                    <SelectItem value="EVENT">🎉 Event</SelectItem>
                    <SelectItem value="COMMERCIAL">📸 Commercial</SelectItem>
                    <SelectItem value="OTHER">📁 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(Object.keys(projectTypeEnum) as Array<keyof typeof projectTypeEnum>).map((projectType) => (
              <TabsContent key={projectType} value={projectType} className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-active-projects">
                  {(stats as any)?.totalProjects || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active projects across all types
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Booked This Month</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-booked-month">
                  {(stats as any)?.bookedThisMonth || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Projects created this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue (YTD)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-revenue-ytd">
                  ${(stats as any)?.revenueYTD?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Revenue from completed projects
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-outstanding-balance">
                  ${(stats as any)?.outstandingBalance?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  From signed proposals awaiting payment
                </p>
              </CardContent>
            </Card>
          </div>

                {/* Kanban Board */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Project Pipeline</CardTitle>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={openStageManagement} data-testid="button-manage-stages">Manage Stages</Button>
                        <Button variant="outline" size="sm" onClick={() => setLocation("/automations")} data-testid="button-automation-rules">Automation Rules</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <KanbanBoard 
                      projects={filteredProjects} 
                      stages={stages || []} 
                      isLoading={projectsLoading || stagesLoading}
                      onAddProject={(stageId, stageName) => openCreateProjectModal(activeProjectType, stageId)}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Create Project Modal */}
        <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Add a new project to your pipeline. All fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateProject)} className="space-y-4">
                {/* Project Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Johnson Wedding Photography"
                          data-testid="input-project-title"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Project Type */}
                <FormField
                  control={form.control}
                  name="projectType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-project-type">
                            <SelectValue placeholder="Select project type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="WEDDING">💒 Wedding</SelectItem>
                          <SelectItem value="ENGAGEMENT">💍 Engagement</SelectItem>
                          <SelectItem value="PROPOSAL">💍 Proposal</SelectItem>
                          <SelectItem value="PORTRAIT">🎭 Portrait</SelectItem>
                          <SelectItem value="CORPORATE">🏢 Corporate</SelectItem>
                          <SelectItem value="FAMILY">👨‍👩‍👧‍👦 Family</SelectItem>
                          <SelectItem value="MATERNITY">🤱 Maternity</SelectItem>
                          <SelectItem value="NEWBORN">👶 Newborn</SelectItem>
                          <SelectItem value="EVENT">🎉 Event</SelectItem>
                          <SelectItem value="COMMERCIAL">📸 Commercial</SelectItem>
                          <SelectItem value="OTHER">📁 Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Client Selection */}
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-client">
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients?.map((client: any) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.firstName} {client.lastName} ({client.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Need to add a new client? Go to the <button 
                          type="button" 
                          className="text-blue-600 hover:text-blue-800 underline"
                          onClick={() => {
                            setIsCreateProjectOpen(false);
                            setLocation("/clients");
                          }}
                        >
                          Clients page
                        </button> first.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Event Date */}
                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          data-testid="input-event-date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional project notes..."
                          data-testid="textarea-notes"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setIsCreateProjectOpen(false)}
                    data-testid="button-cancel-project"
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
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Manage Stages Modal */}
        <Dialog open={isManageStagesOpen} onOpenChange={setIsManageStagesOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Manage Stages - {activeProjectType} Projects</DialogTitle>
              <DialogDescription>
                Create, edit, and organize the stages in your project pipeline.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Current Stages</h4>
                <Button size="sm" onClick={() => openStageForm()} data-testid="button-add-stage">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stage
                </Button>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {(Array.isArray(stages) ? stages : [])
                  .filter((stage: any) => stage.projectType === activeProjectType)
                  .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
                  .map((stage: any) => (
                    <div key={stage.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-4 h-4 rounded-full border" 
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="font-medium">{stage.name}</span>
                          {stage.isDefault && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openStageForm(stage)}
                          data-testid={`button-edit-stage-${stage.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteStage(stage.id)}
                          disabled={deleteStageMutation.isPending}
                          data-testid={`button-delete-stage-${stage.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsManageStagesOpen(false)}
                data-testid="button-close-manage-stages"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stage Form Modal */}
        <Dialog open={isStageFormOpen} onOpenChange={setIsStageFormOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingStage ? 'Edit Stage' : 'Create New Stage'}</DialogTitle>
              <DialogDescription>
                {editingStage ? 'Update the stage details.' : 'Add a new stage to your project pipeline.'}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...stageForm}>
              <form onSubmit={stageForm.handleSubmit(handleStageSubmit)} className="space-y-4">
                {/* Stage Name */}
                <FormField
                  control={stageForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stage Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Inquiry, Booked, Delivered"
                          data-testid="input-stage-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Project Type */}
                <FormField
                  control={stageForm.control}
                  name="projectType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-stage-project-type">
                            <SelectValue placeholder="Select project type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="WEDDING">💒 Wedding</SelectItem>
                          <SelectItem value="ENGAGEMENT">💍 Engagement</SelectItem>
                          <SelectItem value="PROPOSAL">💍 Proposal</SelectItem>
                          <SelectItem value="PORTRAIT">🎭 Portrait</SelectItem>
                          <SelectItem value="CORPORATE">🏢 Corporate</SelectItem>
                          <SelectItem value="FAMILY">👨‍👩‍👧‍👦 Family</SelectItem>
                          <SelectItem value="MATERNITY">🤱 Maternity</SelectItem>
                          <SelectItem value="NEWBORN">👶 Newborn</SelectItem>
                          <SelectItem value="EVENT">🎉 Event</SelectItem>
                          <SelectItem value="COMMERCIAL">📸 Commercial</SelectItem>
                          <SelectItem value="OTHER">📁 Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Order Index */}
                <FormField
                  control={stageForm.control}
                  name="orderIndex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Position</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          data-testid="input-stage-order"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Lower numbers appear first in the pipeline
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Color */}
                <FormField
                  control={stageForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stage Color</FormLabel>
                      <FormControl>
                        <Input
                          type="color"
                          data-testid="input-stage-color"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Is Default */}
                <FormField
                  control={stageForm.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Default Stage</FormLabel>
                        <FormDescription>
                          New projects will be automatically placed in this stage
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Input
                          type="checkbox"
                          className="w-4 h-4"
                          data-testid="checkbox-stage-default"
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => {
                      setIsStageFormOpen(false);
                      setEditingStage(null);
                    }}
                    data-testid="button-cancel-stage"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createStageMutation.isPending || updateStageMutation.isPending}
                    data-testid="button-save-stage"
                  >
                    {(createStageMutation.isPending || updateStageMutation.isPending) ? (
                      editingStage ? "Updating..." : "Creating..."
                    ) : (
                      editingStage ? "Update Stage" : "Create Stage"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
    </div>
  );
}
