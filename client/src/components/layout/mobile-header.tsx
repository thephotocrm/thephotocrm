import { SidebarTrigger } from "@/components/ui/sidebar";
import { Camera, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

export function MobileHeader() {
  const { toggleSidebar } = useSidebar();
  
  return (
    <div className="md:hidden relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 border-b border-border px-2 py-2 flex items-center gap-2 sticky top-0 z-40">
      {/* Black opacity overlay */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      
      {/* Content */}
      <div className="relative w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
        <Camera className="w-5 h-5 text-blue-600" />
      </div>
      <span 
        className="relative font-bold text-2xl text-white truncate flex-1" 
        style={{ textShadow: '1px 1px 1px rgba(0, 0, 0, 0.5)' }}
      >
        thePhotoCRM
      </span>
      <Button
        onClick={toggleSidebar}
        data-testid="button-mobile-menu"
        className="relative h-10 px-4 bg-black hover:bg-gray-900 border border-white/30 rounded-md text-white flex-shrink-0 gap-2"
        variant="ghost"
      >
        <Menu className="w-4 h-4" />
        <span className="font-medium">Menu</span>
      </Button>
    </div>
  );
}