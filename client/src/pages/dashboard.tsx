import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Mail, 
  Plus, 
  UserPlus, 
  FileText, 
  Zap,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect admins to admin dashboard
  useEffect(() => {
    if (user && user.role === 'ADMIN' && !user.photographerId) {
      setLocation('/admin/dashboard');
    }
  }, [user, setLocation]);

  // Fetch summary stats
  const { data: stats } = useQuery({
    queryKey: ["/api/reports/summary"],
    queryFn: () => fetch('/api/reports/summary').then(res => res.json()),
    enabled: !!user
  });

  // Fetch recent projects (limit 5)
  const { data: recentProjects = [] } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: () => fetch('/api/projects').then(res => res.json()),
    select: (data: any[]) => data.slice(0, 5),
    enabled: !!user
  });

  // Fetch upcoming bookings
  const { data: allBookings = [] } = useQuery({
    queryKey: ["/api/bookings"],
    queryFn: () => fetch('/api/bookings').then(res => res.json()),
    enabled: !!user
  });

  // Filter for upcoming bookings (next 3)
  const upcomingBookings = Array.isArray(allBookings) 
    ? allBookings
        .filter((booking: any) => new Date(booking.startTime) > new Date())
        .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, 3)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Active Projects",
      value: stats?.totalProjects || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20"
    },
    {
      title: "New Leads",
      value: stats?.newLeads || 0,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/20"
    },
    {
      title: "Total Revenue",
      value: `$${stats?.totalRevenue?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/20"
    },
    {
      title: "Unread Messages",
      value: stats?.unreadMessages || 0,
      icon: Mail,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/20"
    }
  ];

  const quickActions = [
    { 
      label: "New Project", 
      icon: Plus, 
      path: "/projects?create=true",
      description: "Start a new project"
    },
    { 
      label: "New Contact", 
      icon: UserPlus, 
      path: "/contacts?create=true",
      description: "Add a contact"
    },
    { 
      label: "New Smart File", 
      icon: FileText, 
      path: "/smart-files",
      description: "Create proposal or invoice"
    },
    { 
      label: "New Automation", 
      icon: Zap, 
      path: "/automations",
      description: "Set up automation"
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 md:px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger 
            data-testid="button-menu-toggle" 
            className="hidden md:inline-flex shrink-0" 
          />
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Welcome back, {user?.businessName || 'Photographer'}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 space-y-6">
          {/* Top Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat, index) => (
              <Card key={index} data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <h3 className="text-2xl font-bold mt-2">{stat.value}</h3>
                    </div>
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", stat.bgColor)}>
                      <stat.icon className={cn("w-6 h-6", stat.color)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Quick Actions */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Create</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => setLocation(action.path)}
                    data-testid={`button-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <action.icon className="w-4 h-4 mr-3 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">{action.label}</div>
                      <div className="text-xs text-muted-foreground">{action.description}</div>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Upcoming Appointments */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setLocation('/scheduling')}
                  data-testid="link-view-calendar"
                >
                  View Calendar <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {upcomingBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No upcoming appointments</p>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setLocation('/scheduling')}
                    >
                      View Calendar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingBookings.slice(0, 3).map((booking: any) => (
                      <div 
                        key={booking.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        data-testid={`booking-${booking.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{booking.project?.title || 'Appointment'}</p>
                            <p className="text-sm text-muted-foreground">
                              {booking.clientName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {format(new Date(booking.startTime), 'MMM d')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(booking.startTime), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Projects</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation('/projects')}
                data-testid="link-view-all-projects"
              >
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentProjects.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No projects yet</p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setLocation('/projects')}
                  >
                    Create your first project
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentProjects.map((project: any) => (
                    <div 
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/projects/${project.id}`)}
                      data-testid={`project-${project.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950/30 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{project.title}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {project.client?.firstName} {project.client?.lastName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
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
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity & Payments Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Activity tracking coming soon</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    View your projects for current status
                  </p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setLocation('/projects')}
                  >
                    Go to Projects
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Payments Overview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Payments</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setLocation('/earnings')}
                  data-testid="link-view-payments"
                >
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">This month's revenue</p>
                    <p className="text-2xl font-bold">${stats?.monthlyRevenue?.toLocaleString() || 0}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="text-lg font-semibold">${stats?.pendingPayments?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Overdue</p>
                      <p className="text-lg font-semibold text-orange-600">${stats?.overduePayments?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
