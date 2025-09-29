import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Camera, 
  LayoutDashboard, 
  Users, 
  FolderOpen,
  FileText, 
  Package, 
  ClipboardList, 
  Calendar, 
  MessageSquare, 
  Zap, 
  BarChart3, 
  DollarSign,
  Settings,
  LogOut,
  Code,
  Sparkles
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
  SidebarMenuSub,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { openMobile, setOpenMobile, isMobile } = useSidebar();

  // Auto-close mobile sidebar when navigating to different pages
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location, isMobile, setOpenMobile]);

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, color: "bg-slate-50 dark:bg-slate-900/50" },
    { name: "Clients", href: "/clients", icon: Users, color: "bg-emerald-50 dark:bg-emerald-900/20" },
    { name: "Projects", href: "/projects", icon: FolderOpen, color: "bg-blue-50 dark:bg-blue-900/20" },
    { name: "Proposals", href: "/proposals", icon: FileText, color: "bg-amber-50 dark:bg-amber-900/20" },
    { name: "Packages", href: "/packages", icon: Package, color: "bg-purple-50 dark:bg-purple-900/20" },
    { name: "Widget Generator", href: "/widget-generator", icon: Code, color: "bg-cyan-50 dark:bg-cyan-900/20" },
    { name: "Questionnaires", href: "/questionnaires", icon: ClipboardList, color: "bg-pink-50 dark:bg-pink-900/20" },
    { name: "Scheduling", href: "/scheduling", icon: Calendar, color: "bg-violet-50 dark:bg-violet-900/20" },
    { name: "Templates", href: "/templates", icon: MessageSquare, color: "bg-orange-50 dark:bg-orange-900/20" },
    { name: "Automations", href: "/automations", icon: Zap, color: "bg-yellow-50 dark:bg-yellow-900/20" },
    { name: "Drip Campaigns", href: "/drip-campaigns", icon: Sparkles, color: "bg-indigo-50 dark:bg-indigo-900/20" },
    { name: "Reports", href: "/reports", icon: BarChart3, color: "bg-teal-50 dark:bg-teal-900/20" },
    { name: "Earnings", href: "/earnings", icon: DollarSign, color: "bg-green-50 dark:bg-green-900/20" }
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <div className="flex items-center space-x-3 px-2 py-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Camera className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Lazy Photog</h1>
            <p className="text-sm text-muted-foreground">Photography CRM</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.name.toLowerCase()}`}
                      className={`${item.color} transition-colors duration-200 hover:opacity-80`}
                    >
                      <Link href={item.href}>
                        <Icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/settings"}
                  data-testid="nav-settings"
                  className="bg-gray-50 dark:bg-gray-900/20 transition-colors duration-200 hover:opacity-80"
                >
                  <Link href="/settings">
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center space-x-3 px-2 py-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-medium text-sm">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mx-2 mb-2"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}