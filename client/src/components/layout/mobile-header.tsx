import { SidebarTrigger } from "@/components/ui/sidebar";
import { Camera } from "lucide-react";

export function MobileHeader() {
  return (
    <div className="md:hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 border-b border-border px-2 py-2 flex items-center gap-2 sticky top-0 z-40">
      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
        <Camera className="w-5 h-5 text-blue-600" />
      </div>
      <span 
        className="font-bold text-2xl text-white truncate flex-1" 
        style={{ textShadow: '1px 1px 1px rgba(0, 0, 0, 0.5)' }}
      >
        thePhotoCRM
      </span>
      <SidebarTrigger 
        data-testid="button-mobile-menu"
        className="h-16 w-16 bg-white/10 hover:bg-white/20 border border-white/30 rounded-md text-white flex-shrink-0"
      />
    </div>
  );
}