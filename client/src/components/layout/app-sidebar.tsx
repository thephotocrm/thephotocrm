import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
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
  Layers,
  ChevronRight,
  Briefcase,
  Target,
  TrendingUp as BusinessIcon,
  Inbox as InboxIcon,
  Lock,
  Rocket
} from "lucide-react";
import { SiFacebook, SiGoogle } from "react-icons/si";
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
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { openMobile, setOpenMobile, isMobile } = useSidebar();

  // Fetch unread inbox count
  const { data: unreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ['/api/inbox/unread-count'],
    enabled: user?.role === 'PHOTOGRAPHER',
    refetchInterval: 30000 // Poll every 30 seconds
  });

  const unreadCount = unreadData?.unreadCount || 0;

  // Fetch photographer data for premium access check
  const { data: photographer } = useQuery<{ hasPremiumAccess: boolean }>({
    queryKey: ['/api/photographer'],
    enabled: user?.role === 'PHOTOGRAPHER'
  });

  const hasPremiumAccess = photographer?.hasPremiumAccess || false;

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Admin navigation for /admin/* routes
  const adminNavigation = [
    { name: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Photographers", href: "/admin/dashboard", icon: Users },
    { name: "Platform Analytics", href: "/admin/analytics", icon: TrendingUp },
    { name: "Billing & Payouts", href: "/admin/billing", icon: CreditCard },
    { name: "Activity Log", href: "/admin/activity", icon: ActivityIcon },
    { name: "Support Cases", href: "/admin/support", icon: Headphones }
  ];

  // Core workspace items (always visible)
  const coreNavigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Projects", href: "/projects", icon: FolderOpen },
    { name: "Contacts", href: "/contacts", icon: Users },
    { name: "Inbox", href: "/inbox", icon: InboxIcon, badge: unreadCount },
  ];

  // Grouped navigation for photographers
  const groupedNavigation = [
    {
      id: "sales",
      name: "Sales & Proposals",
      icon: Briefcase,
      items: [
        { name: "Smart Files", href: "/smart-files", icon: Layers },
        { name: "Packages", href: "/packages", icon: Package },
        { name: "Add-ons", href: "/add-ons", icon: ShoppingBag },
      ]
    },
    {
      id: "marketing",
      name: "Marketing",
      icon: Target,
      items: [
        { name: "Templates", href: "/templates", icon: MessageSquare },
        { name: "Automations", href: "/automations", icon: Zap },
        { name: "Drip Campaigns", href: "/drip-campaigns", icon: Sparkles },
        { name: "Lead Forms", href: "/lead-forms", icon: FileText },
      ]
    },
    {
      id: "business",
      name: "Business Tools",
      icon: BusinessIcon,
      items: [
        { name: "Scheduling", href: "/scheduling", icon: Calendar },
        { name: "Reports", href: "/reports", icon: BarChart3 },
        { name: "Earnings", href: "/earnings", icon: DollarSign },
      ]
    }
  ];

  // Helper to determine which group contains the current route
  const getActiveGroup = (currentLocation: string): string | null => {
    for (const group of groupedNavigation) {
      if (group.items.some(item => item.href === currentLocation)) {
        return group.id;
      }
    }
    return null;
  };

  // State for collapsible sections - default to sales open
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sales: true,
    marketing: false,
    business: false,
  });

  // Auto-close mobile sidebar when navigating to different pages
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location, isMobile, setOpenMobile]);

  // Auto-expand the group containing the active route when location changes
  useEffect(() => {
    const activeGroup = getActiveGroup(location);
    if (activeGroup) {
      setOpenSections(prev => ({
        ...prev,
        [activeGroup]: true,
      }));
    }
  }, [location]);

  // Determine which navigation to show
  const isAdminRoute = location.startsWith('/admin');
  const isAdmin = user?.role === 'ADMIN';
  const showAdminNav = isAdmin && isAdminRoute && !user?.isImpersonating;

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

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
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {showAdminNav ? (
                // Admin Navigation (flat structure)
                adminNavigation.map((item) => {
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
                })
              ) : (
                // Photographer Navigation (grouped structure)
                <>
                  {/* Core Navigation Items */}
                  {coreNavigation.map((item) => {
                    const isActive = location === item.href;
                    const Icon = item.icon;
                    const showBadge = item.badge && item.badge > 0;
                    
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
                            {showBadge && (
                              <Badge 
                                variant="destructive" 
                                className="ml-auto"
                                data-testid="inbox-unread-badge"
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}

                  {/* Grouped Navigation Items */}
                  {groupedNavigation.map((group) => {
                    const GroupIcon = group.icon;
                    const isGroupActive = group.items.some(item => location === item.href);
                    
                    return (
                      <Collapsible
                        key={group.id}
                        open={openSections[group.id]}
                        onOpenChange={() => toggleSection(group.id)}
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              className="bg-slate-800/50 text-white hover:bg-slate-700/70"
                              data-testid={`nav-group-${group.id}`}
                            >
                              <GroupIcon className="w-6 h-6" />
                              <span className="text-base">{group.name}</span>
                              <ChevronRight className={`ml-auto w-4 h-4 transition-transform ${openSections[group.id] ? 'rotate-90' : ''}`} />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {group.items.map((item) => {
                                const isActive = location === item.href;
                                const Icon = item.icon;
                                
                                return (
                                  <SidebarMenuSubItem key={item.name}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={isActive}
                                      data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                                      className="bg-slate-800/30 text-white hover:bg-slate-700/50 data-[active=true]:bg-slate-700 data-[active=true]:text-white"
                                    >
                                      <Link href={item.href}>
                                        <Icon className="w-5 h-5" />
                                        <span className="text-sm">{item.name}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  })}

                  {/* Premium "Get Leads" Section */}
                  <SidebarMenuItem className="mt-4 px-2">
                    <div className="relative">
                      {/* Border container with gradient */}
                      <div className="relative rounded-lg p-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500">
                        {/* Inner container */}
                        <div className="relative bg-slate-800 rounded-lg pt-4 pb-3 px-3">
                          {/* Title that breaks the top border */}
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-slate-800 px-3 flex items-center gap-2">
                            <Rocket className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-semibold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                              Get Leads
                            </span>
                            {!hasPremiumAccess && <Lock className="w-3 h-3 text-yellow-400" />}
                          </div>
                          
                          <div className="space-y-1 mt-1">
                            {/* Facebook Ads */}
                            {hasPremiumAccess ? (
                              <Link href="/facebook-ads" data-testid="nav-facebook-ads">
                                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all hover:bg-slate-700/50 text-white">
                                  <SiFacebook className="w-5 h-5 text-[#1877F2]" />
                                  <span className="text-sm font-medium">Facebook Ads</span>
                                </button>
                              </Link>
                            ) : (
                              <button
                                onClick={() => setShowUpgradeModal(true)}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all opacity-60 cursor-not-allowed text-white/70"
                                data-testid="nav-facebook-ads-locked"
                              >
                                <SiFacebook className="w-5 h-5 text-[#1877F2]/50" />
                                <span className="text-sm font-medium">Facebook Ads</span>
                                <Lock className="w-3 h-3 ml-auto text-yellow-400" />
                              </button>
                            )}

                            {/* Google Ads */}
                            {hasPremiumAccess ? (
                              <Link href="/google-ads" data-testid="nav-google-ads">
                                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all hover:bg-slate-700/50 text-white">
                                  <SiGoogle className="w-5 h-5 text-[#4285F4]" />
                                  <span className="text-sm font-medium">Google Ads</span>
                                </button>
                              </Link>
                            ) : (
                              <button
                                onClick={() => setShowUpgradeModal(true)}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all opacity-60 cursor-not-allowed text-white/70"
                                data-testid="nav-google-ads-locked"
                              >
                                <SiGoogle className="w-5 h-5 text-[#4285F4]/50" />
                                <span className="text-sm font-medium">Google Ads</span>
                                <Lock className="w-3 h-3 ml-auto text-yellow-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </SidebarMenuItem>
                </>
              )}
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