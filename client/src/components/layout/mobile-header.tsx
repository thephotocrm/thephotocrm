import { SidebarTrigger } from "@/components/ui/sidebar";

export function MobileHeader() {
  return (
    <div className="md:hidden bg-gradient-to-r from-blue-500 to-white dark:from-blue-600 dark:to-gray-800 border-b border-border px-1 min-[400px]:px-2 sm:px-4 py-1.5 min-[400px]:py-2 sm:py-3 flex items-center justify-between sticky top-0 z-50 min-w-0">
      <div className="flex items-center min-w-0 flex-1 pr-1">
        <span 
          className="font-bold text-xs min-[400px]:text-sm sm:text-xl text-white truncate" 
          style={{ textShadow: '1px 1px 1px rgba(0, 0, 0, 0.5)' }}
        >
          thePhotoCRM
        </span>
      </div>
      <SidebarTrigger 
        data-testid="button-mobile-menu"
        className="h-7 w-7 min-[400px]:h-8 min-[400px]:w-8 sm:h-10 sm:w-10 bg-blue-500 hover:bg-blue-600 border border-blue-400 rounded-md text-white flex-shrink-0"
      />
    </div>
  );
}