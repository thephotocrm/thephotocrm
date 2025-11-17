import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useDomain } from "@/hooks/use-domain";
import { useQuery } from "@tanstack/react-query";
import { 
  Camera,
  LayoutDashboard, 
  Activity,
  CheckSquare,
  FileText, 
  CreditCard,
  StickyNote,
  Settings,
  LogOut,
  ChevronDown,
  Loader2
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ClientProject {
  id: string;
  title: string;
  projectType: string;
  eventDate?: string;
  status: string;
  role: 'PRIMARY' | 'PARTICIPANT';
  photographer: {
    businessName: string;
    logoUrl?: string;
  };
  galleries?: Array<{
    id: string;
    title: string;
    imageCount: number;
    isPublic: boolean;
    createdAt: string;
  }>;
}

interface ClientPortalSidebarProps {
  currentProjectId?: string;
}

function ClientPortalSidebar({ currentProjectId }: ClientPortalSidebarProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { domain } = useDomain();
  const { openMobile, setOpenMobile, isMobile } = useSidebar();

  // Fetch all projects for dropdown
  const { data: projects = [], isLoading: projectsLoading } = useQuery<ClientProject[]>({
    queryKey: ["/api/client-portal/projects"],
    enabled: !!user
  });

  // Auto-close mobile sidebar when navigating
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location, isMobile, setOpenMobile]);

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  // Find current project
  const currentProject = currentProjectId 
    ? projects.find(p => p.id === currentProjectId)
    : projects[0];

  // Get photographer info from project or domain (fallback for when no project exists)
  const photographer = currentProject?.photographer || domain?.photographer;

  // Check if galleries exist for conditional styling
  const hasGalleries = currentProject?.galleries && currentProject.galleries.length > 0;

  // Navigation items
  const navItems = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: LayoutDashboard,
      href: currentProjectId ? `/client-portal/projects/${currentProjectId}` : '/client-portal',
      disabled: false
    },
    { 
      id: 'activity', 
      label: 'Activity', 
      icon: Activity,
      href: currentProjectId ? `/client-portal/projects/${currentProjectId}?tab=activity` : '/client-portal',
      disabled: false
    },
    { 
      id: 'tasks', 
      label: 'Tasks', 
      icon: CheckSquare,
      href: currentProjectId ? `/client-portal/projects/${currentProjectId}?tab=tasks` : '/client-portal',
      disabled: false
    },
    { 
      id: 'files', 
      label: 'Files', 
      icon: FileText,
      href: currentProjectId ? `/client-portal/projects/${currentProjectId}?tab=files` : '/client-portal',
      disabled: false
    },
    { 
      id: 'galleries', 
      label: 'Galleries', 
      icon: Camera,
      href: currentProjectId ? `/client-portal/projects/${currentProjectId}?tab=galleries` : '/client-portal',
      disabled: !hasGalleries
    },
    { 
      id: 'payments', 
      label: 'Payments', 
      icon: CreditCard,
      href: currentProjectId ? `/client-portal/projects/${currentProjectId}?tab=payments` : '/client-portal',
      disabled: false
    },
    { 
      id: 'notes', 
      label: 'Notes', 
      icon: StickyNote,
      href: currentProjectId ? `/client-portal/projects/${currentProjectId}?tab=notes` : '/client-portal',
      disabled: false
    },
  ];

  const isActive = (href: string) => {
    // Compare both pathname and query params for accurate tab highlighting
    const currentUrl = location;
    const itemUrl = href;
    
    // Extract pathname and query params for both current URL and item URL
    const [currentPath, currentQuery] = currentUrl.split('?');
    const [itemPath, itemQuery] = itemUrl.split('?');
    
    // Paths must match first
    if (currentPath !== itemPath) {
      return false;
    }
    
    // Parse query params
    const currentParams = new URLSearchParams(currentQuery || '');
    const itemParams = new URLSearchParams(itemQuery || '');
    
    const currentTab = currentParams.get('tab');
    const itemTab = itemParams.get('tab');
    
    // Special case: Overview is active when tab is null/undefined OR explicitly "overview"
    if (itemTab === null) {
      return currentTab === null || currentTab === 'overview';
    }
    
    // For all other tabs, match exactly
    return currentTab === itemTab;
  };

  return (
    <Sidebar portal="client">
      <SidebarHeader className="border-b border-gray-200 p-4">
        {/* Photographer branding */}
        <div className="flex items-center gap-3 mb-4">
          {photographer?.logoUrl ? (
            <img 
              src={photographer.logoUrl} 
              alt={photographer.businessName}
              className="w-8 h-8 rounded object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">
              {photographer?.businessName || 'Your Photographer'}
            </h2>
            <p className="text-xs text-muted-foreground">Client Portal</p>
          </div>
        </div>

        {/* Project Selector */}
        {projects.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between"
                data-testid="dropdown-project-selector"
              >
                <span className="truncate">
                  {currentProject?.title || 'Select Project'}
                </span>
                <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[240px]" align="start">
              {projects.map((project) => (
                <DropdownMenuItem 
                  key={project.id}
                  onClick={() => setLocation(`/client-portal/projects/${project.id}`)}
                  data-testid={`project-option-${project.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{project.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {project.projectType}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      asChild={!item.disabled}
                      isActive={active}
                      disabled={item.disabled}
                      className={cn(
                        item.disabled 
                          ? "text-gray-400 cursor-not-allowed opacity-50 hover:bg-transparent"
                          : active 
                            ? "bg-[#C9909B]/15 text-[#8B4565] hover:bg-[#C9909B]/25 hover:text-[#8B4565] data-[state=active]:opacity-100" 
                            : "text-gray-700 hover:bg-gray-100 data-[state=open]:text-gray-700 data-[state=open]:bg-gray-100",
                        "opacity-100"
                      )}
                      data-testid={`nav-${item.id}`}
                    >
                      {item.disabled ? (
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                      ) : (
                        <Link to={item.href}>
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className="text-gray-700 hover:bg-gray-100 opacity-100"
              data-testid="nav-settings"
            >
              <Link to="/client-portal/settings">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              className="text-gray-700 hover:bg-gray-100 opacity-100"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

interface ClientPortalLayoutProps {
  children: React.ReactNode;
  currentProjectId?: string;
}

export function ClientPortalLayout({ children, currentProjectId }: ClientPortalLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ClientPortalSidebar currentProjectId={currentProjectId} />
        <SidebarInset className="flex-1">
          {/* Mobile header with hamburger */}
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:hidden">
            <SidebarTrigger data-testid="button-menu-toggle" />
            <h1 className="text-lg font-semibold">Client Portal</h1>
          </header>
          
          {/* Main content */}
          <main className="flex-1">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
