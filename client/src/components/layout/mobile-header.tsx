import { SidebarTrigger } from "@/components/ui/sidebar";

export function MobileHeader() {
  return (
    <div className="md:hidden bg-gradient-to-r from-blue-500 to-white dark:from-blue-600 dark:to-gray-800 border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center">
        <span 
          className="font-bold text-xl text-white" 
          style={{ textShadow: '1px 1px 1px rgba(0, 0, 0, 0.5)' }}
        >
          thePhotoCRM
        </span>
      </div>
      <SidebarTrigger 
        data-testid="button-mobile-menu"
        className="h-10 w-10 bg-blue-500 hover:bg-blue-600 border border-blue-400 rounded-md text-white"
      />
    </div>
  );
}