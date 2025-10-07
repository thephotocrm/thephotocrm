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
  ShoppingBag, 
  ClipboardList, 
  Calendar, 
  MessageSquare, 
  Zap, 
  BarChart3, 
  DollarSign,
  Settings,
  LogOut,
  Code,
  Sparkles,
  Shield,
  TrendingUp,
  CreditCard,
  FileText as ActivityIcon,
  Headphones,
  Layers
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

  // Admin navigation for /admin/* routes
  const adminNavigation = [
    { name: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Photographers", href: "/admin/dashboard", icon: Users },
    { name: "Platform Analytics", href: "/admin/analytics", icon: TrendingUp },
    { name: "Billing & Payouts", href: "/admin/billing", icon: CreditCard },
    { name: "Activity Log", href: "/admin/activity", icon: ActivityIcon },
    { name: "Support Cases", href: "/admin/support", icon: Headphones }
  ];

  // Photographer navigation
  const photographerNavigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Projects", href: "/projects", icon: FolderOpen },
    { name: "Proposals", href: "/proposals", icon: FileText },
    { name: "Smart Files", href: "/smart-files", icon: Layers },
    { name: "Packages", href: "/packages", icon: Package },
    { name: "Add-ons", href: "/add-ons", icon: ShoppingBag },
    { name: "Widget Generator", href: "/widget-generator", icon: Code },
    { name: "Questionnaires", href: "/questionnaires", icon: ClipboardList },
    { name: "Scheduling", href: "/scheduling", icon: Calendar },
    { name: "Templates", href: "/templates", icon: MessageSquare },
    { name: "Automations", href: "/automations", icon: Zap },
    { name: "Drip Campaigns", href: "/drip-campaigns", icon: Sparkles },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Earnings", href: "/earnings", icon: DollarSign }
  ];

  // Determine which navigation to show
  const isAdminRoute = location.startsWith('/admin');
  const isAdmin = user?.role === 'ADMIN';
  const navigation = (isAdmin && isAdminRoute && !user?.isImpersonating) ? adminNavigation : photographerNavigation;

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
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Camera className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">thePhotoCRM</h1>
            <p className="text-sm text-white/70">Photography CRM</p>
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
                      className="bg-slate-800/50 text-white hover:bg-slate-700/70 data-[active=true]:bg-slate-700 data-[active=true]:text-white"
                    >
                      <Link href={item.href}>
                        <Icon className="w-6 h-6" />
                        <span className="text-base">{item.name}</span>
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
                  className="bg-slate-800/50 text-white hover:bg-slate-700/70 data-[active=true]:bg-slate-700 data-[active=true]:text-white"
                >
                  <Link href="/settings">
                    <Settings className="w-6 h-6" />
                    <span className="text-base">Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center space-x-3 px-2 py-2">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-medium text-sm">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-white">{user?.email}</p>
            <p className="text-xs text-white/70 truncate">{user?.role}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mx-2 mb-2 bg-slate-800/50 text-white border-white/20 hover:bg-slate-700/70 hover:text-white"
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