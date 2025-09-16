import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Camera, 
  LayoutDashboard, 
  Users, 
  FileText, 
  Package, 
  ClipboardList, 
  Calendar, 
  MessageSquare, 
  Zap, 
  BarChart3, 
  Settings,
  LogOut
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Estimates", href: "/estimates", icon: FileText },
    { name: "Packages", href: "/packages", icon: Package },
    { name: "Questionnaires", href: "/questionnaires", icon: ClipboardList },
    { name: "Scheduling", href: "/scheduling", icon: Calendar },
    { name: "Templates", href: "/templates", icon: MessageSquare },
    { name: "Automations", href: "/automations", icon: Zap },
    { name: "Reports", href: "/reports", icon: BarChart3 }
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Camera className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Lazy Photog</h1>
            <p className="text-sm text-muted-foreground">Wedding CRM</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className="w-full justify-start"
                  data-testid={`nav-${item.name.toLowerCase()}`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Settings at bottom */}
        <div className="mt-8 pt-8 border-t border-border">
          <Link href="/settings">
            <Button
              variant={location === "/settings" ? "default" : "ghost"}
              className="w-full justify-start"
              data-testid="nav-settings"
            >
              <Settings className="w-5 h-5 mr-3" />
              Settings
            </Button>
          </Link>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-medium">
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
          className="w-full"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
