import { SidebarTrigger } from "@/components/ui/sidebar";

export function MobileHeader() {
  return (
    <div className="md:hidden bg-gradient-to-r from-blue-500 to-white dark:from-blue-600 dark:to-gray-800 border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center">
        <span className="font-bold text-xl text-primary">thePhotoCRM</span>
      </div>
      <SidebarTrigger 
        data-testid="button-mobile-menu"
        className="h-10 w-10 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-md"
      />
    </div>
  );
}