import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { projectTypeEnum } from "@shared/schema";
import KanbanBoard from "@/components/kanban/kanban-board";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppSidebar } from "@/components/layout/app-sidebar";
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

  const { data: clients } = useQuery({
    queryKey: ["/api/clients", activeProjectType],
    queryFn: () => fetch(`/api/clients?projectType=${activeProjectType}`).then(res => res.json()),
    enabled: !!user
  });

  const { data: stages } = useQuery({
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SidebarTrigger data-testid="button-menu-toggle" />
              <div>
                <h1 className="text-2xl font-semibold">Client Pipeline</h1>
                <p className="text-muted-foreground">Manage your {activeProjectType.toLowerCase()} photography clients through each stage</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Input 
                  placeholder="Search clients..." 
                  className="w-64 pl-10"
                  data-testid="input-search-clients"
                />
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-muted-foreground" />
              </div>
              
              {/* Add Client Button */}
              <Button onClick={() => setLocation("/clients")} data-testid="button-add-client">
                <Plus className="w-5 h-5 mr-2" />
                Add Client
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 space-y-6">
          {/* Project Type Tabs */}
          <Tabs value={activeProjectType} onValueChange={setActiveProjectType} className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList className="grid w-full grid-cols-5 max-w-3xl">
                <TabsTrigger value="WEDDING" data-testid="tab-wedding">💒 Wedding</TabsTrigger>
                <TabsTrigger value="ENGAGEMENT" data-testid="tab-engagement">💍 Engagement</TabsTrigger>
                <TabsTrigger value="PORTRAIT" data-testid="tab-portrait">🎭 Portrait</TabsTrigger>
                <TabsTrigger value="CORPORATE" data-testid="tab-corporate">🏢 Corporate</TabsTrigger>
                <TabsTrigger value="EVENT" data-testid="tab-event">🎉 Event</TabsTrigger>
              </TabsList>
            </div>

            {Object.keys(projectTypeEnum).map((projectType) => (
              <TabsContent key={projectType} value={projectType} className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-clients">
                  {stats?.totalClients || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+12%</span> from last month
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
                  {stats?.bookedThisMonth || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+25%</span> conversion rate
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
                  ${stats?.revenueYTD?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+18%</span> vs last year
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
                  ${stats?.outstandingBalance?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  14 clients pending payment
                </p>
              </CardContent>
            </Card>
          </div>

                {/* Kanban Board */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Client Pipeline</CardTitle>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">Manage Stages</Button>
                        <Button variant="outline" size="sm">Automation Rules</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <KanbanBoard clients={clients || []} stages={stages || []} />
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
