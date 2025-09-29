import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { projectTypeEnum } from "@shared/schema";
import KanbanBoard from "@/components/kanban/kanban-board";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, CheckCircle, DollarSign, Clock, Search, Plus } from "lucide-react";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeProjectType, setActiveProjectType] = useState<string>('WEDDING');

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL LOGIC
  const { data: stats } = useQuery({
    queryKey: ["/api/reports/summary"],
    enabled: !!user
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects", activeProjectType],
    queryFn: () => fetch(`/api/projects?projectType=${activeProjectType}`).then(res => res.json()),
    enabled: !!user
  });

  const { data: stages, isLoading: stagesLoading } = useQuery({
    queryKey: ["/api/stages", activeProjectType], 
    queryFn: () => fetch(`/api/stages?projectType=${activeProjectType}`).then(res => res.json()),
    enabled: !!user
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
                />
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-muted-foreground" />
              </div>
              
              {/* Add Project Button */}
              <Button onClick={() => setLocation("/projects")} data-testid="button-add-project">
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
                />
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-muted-foreground" />
              </div>
              
              <Button 
                onClick={() => setLocation("/projects")} 
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
              {/* Desktop tabs */}
              <TabsList className="hidden md:grid w-full grid-cols-5 max-w-3xl">
                <TabsTrigger value="WEDDING" data-testid="tab-wedding">💒 Wedding</TabsTrigger>
                <TabsTrigger value="ENGAGEMENT" data-testid="tab-engagement">💍 Engagement</TabsTrigger>
                <TabsTrigger value="PORTRAIT" data-testid="tab-portrait">🎭 Portrait</TabsTrigger>
                <TabsTrigger value="CORPORATE" data-testid="tab-corporate">🏢 Corporate</TabsTrigger>
                <TabsTrigger value="EVENT" data-testid="tab-event">🎉 Event</TabsTrigger>
              </TabsList>
              
              {/* Mobile dropdown */}
              <div className="md:hidden w-full max-w-xs">
                <Select value={activeProjectType} onValueChange={setActiveProjectType}>
                  <SelectTrigger data-testid="select-project-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEDDING">💒 Wedding</SelectItem>
                    <SelectItem value="ENGAGEMENT">💍 Engagement</SelectItem>
                    <SelectItem value="PORTRAIT">🎭 Portrait</SelectItem>
                    <SelectItem value="CORPORATE">🏢 Corporate</SelectItem>
                    <SelectItem value="EVENT">🎉 Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {Object.keys(projectTypeEnum).map((projectType) => (
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
                        <Button variant="outline" size="sm" disabled>Manage Stages (Coming Soon)</Button>
                        <Button variant="outline" size="sm" onClick={() => setLocation("/automations")} data-testid="button-automation-rules">Automation Rules</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <KanbanBoard 
                      projects={projects || []} 
                      stages={stages || []} 
                      isLoading={projectsLoading || stagesLoading}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
    </div>
  );
}
