import { SidebarTrigger } from "@/components/ui/sidebar";

export function MobileHeader() {
  return (
    <div className="md:hidden bg-gradient-to-r from-blue-500 to-white dark:from-blue-600 dark:to-gray-800 border-b border-border px-2 py-2 flex items-center gap-2 sticky top-0 z-50">
      <span 
        className="font-bold text-sm text-white truncate flex-1" 
        style={{ textShadow: '1px 1px 1px rgba(0, 0, 0, 0.5)' }}
      >
        thePhotoCRM
      </span>
      <SidebarTrigger 
        data-testid="button-mobile-menu"
        className="h-8 w-8 bg-blue-500 hover:bg-blue-600 border border-blue-400 rounded-md text-white flex-shrink-0"
      />
    </div>
  );
}