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
import { SiFacebook, SiGoogle, SiInstagram, SiPinterest, SiTiktok } from "react-icons/si";
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
import { UpgradeModal } from "@/components/upgrade-modal";

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

  // Flatten all items for mobile grid
  const allMobileItems = [
    ...coreNavigation,
    ...(showAdminNav ? adminNavigation : groupedNavigation.flatMap(g => g.items)),
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  // Premium items for mobile grid
  const premiumItems = [
    { name: "Lead Hub", href: "/lead-hub", icon: TrendingUp, iconColor: "text-purple-400", locked: !hasPremiumAccess },
  ];

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
        {isMobile ? (
          // Mobile Grid Layout
          <div className="p-4 overflow-y-auto">
            {/* Main Navigation Grid */}
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3 px-1">
                {showAdminNav ? "Admin" : "Workspace"}
              </h2>
              <div className="grid grid-cols-4 gap-3">
                {allMobileItems.map((item) => {
                  const isActive = location === item.href;
                  const Icon = item.icon;
                  const showBadge = 'badge' in item && item.badge && item.badge > 0;
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div
                        className={`
                          relative aspect-square rounded-xl flex flex-col items-center justify-center p-3
                          transition-all duration-200
                          ${isActive 
                            ? 'bg-white/20 shadow-lg scale-105' 
                            : 'bg-white/10 hover:bg-white/15 hover:scale-105'
                          }
                        `}
                      >
                        <div className="relative">
                          <Icon className="w-8 h-8 text-white mb-2" />
                          {'badge' in item && item.badge > 0 && (
                            <div 
                              className="absolute -top-2 -right-2 h-[23px] w-[23px] rounded-full flex items-center justify-center text-xs font-bold bg-green-500 text-white"
                              data-testid="inbox-unread-badge"
                            >
                              {item.badge}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-white text-center leading-tight">
                          {item.name}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Premium Section - Only for photographers */}
            {!showAdminNav && (
              <div className="mb-6">
                <h2 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-purple-400" />
                  Get Leads
                </h2>
                <div className="grid grid-cols-4 gap-3">
                  {hasPremiumAccess ? (
                    <Link
                      href="/lead-hub"
                      data-testid="nav-lead-hub"
                    >
                      <div
                        className={`
                          relative aspect-square rounded-xl flex flex-col items-center justify-center p-3
                          transition-all duration-200 border border-gray-400
                          ${location === '/lead-hub'
                            ? 'bg-white/20 shadow-lg scale-105' 
                            : 'bg-white/10 hover:bg-white/15 hover:scale-105'
                          }
                        `}
                      >
                        <TrendingUp className="w-8 h-8 text-purple-400 mb-2" />
                        <span className="text-[10px] font-medium text-white text-center leading-tight">
                          Lead Hub
                        </span>
                      </div>
                    </Link>
                  ) : (
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="relative aspect-square rounded-xl flex flex-col items-center justify-center p-3 bg-white/5 opacity-60 cursor-not-allowed border border-gray-400"
                      data-testid="nav-lead-hub-locked"
                    >
                      <TrendingUp className="w-8 h-8 text-purple-400/50 mb-2" />
                      <span className="text-[10px] font-medium text-white/70 text-center leading-tight">
                        Lead Hub
                      </span>
                      <Lock className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400" />
                    </button>
                  )}
                </div>
                {!hasPremiumAccess && (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="w-full mt-3 py-2 text-center text-sm font-medium text-white/90 hover:text-white transition-colors"
                    data-testid="upgrade-cta"
                  >
                    Upgrade to unlock Lead Hub
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          // Desktop Vertical Layout (unchanged)
          <>
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
                          <Link href={item.href} className="relative">
                            <div className="relative inline-block">
                              <Icon className="w-6 h-6" />
                              {'badge' in item && item.badge > 0 && (
                                <div 
                                  className="absolute -top-2 -right-2 h-[23px] w-[23px] rounded-full flex items-center justify-center text-xs font-bold bg-green-500 text-white"
                                  data-testid="inbox-unread-badge"
                                >
                                  {item.badge}
                                </div>
                              )}
                            </div>
                            <span className="text-base">{item.name}</span>
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
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 rounded-md p-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500">
                            <div className="bg-slate-800 rounded-md px-4 py-1 flex items-center gap-2 whitespace-nowrap">
                              <Rocket className="w-4 h-4 text-purple-400" />
                              <span className="text-sm font-semibold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                                Get Leads
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-1 mt-4">
                            {/* Lead Hub */}
                            {hasPremiumAccess ? (
                              <Link href="/lead-hub" data-testid="nav-lead-hub">
                                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all hover:bg-slate-700/50 text-white bg-black/20 border border-gray-400">
                                  <TrendingUp className="w-5 h-5 text-purple-400" />
                                  <span className="text-sm font-medium">Lead Hub</span>
                                </button>
                              </Link>
                            ) : (
                              <button
                                onClick={() => setShowUpgradeModal(true)}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all opacity-60 cursor-not-allowed text-white/70 bg-black/20 border border-gray-400"
                                data-testid="nav-lead-hub-locked"
                              >
                                <TrendingUp className="w-5 h-5 text-purple-400/50" />
                                <span className="text-sm font-medium">Lead Hub</span>
                                <Lock className="w-3 h-3 ml-auto text-yellow-400" />
                              </button>
                            )}
                          </div>
                          
                          {/* Upgrade CTA */}
                          {!hasPremiumAccess && (
                            <div className="mt-3 pt-3 border-t border-slate-700">
                              <button
                                onClick={() => setShowUpgradeModal(true)}
                                className="w-full text-center py-2 text-white hover:text-white/90 transition-colors"
                                data-testid="upgrade-cta"
                              >
                                <p className="text-sm font-medium">
                                  Upgrade to unlock Lead Hub
                                </p>
                              </button>
                            </div>
                          )}
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
        </>
        )}
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

      {/* Upgrade Modal */}
      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal} 
      />
    </Sidebar>
  );
}