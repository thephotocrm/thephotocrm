import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Shield, LogOut } from 'lucide-react';

interface ImpersonationBannerProps {
  photographerBusinessName?: string;
}

export function ImpersonationBanner({ photographerBusinessName }: ImpersonationBannerProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const exitImpersonationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/exit-impersonation');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: 'Impersonation Ended',
        description: 'You have returned to your admin account.',
      });
      setLocation('/admin/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to exit impersonation',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-3 shadow-md" data-testid="banner-impersonation">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5" />
          <div>
            <span className="font-semibold">Admin Impersonation Active</span>
            {photographerBusinessName && (
              <span className="ml-2">
                Viewing as: <span className="font-medium">{photographerBusinessName}</span>
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exitImpersonationMutation.mutate()}
          disabled={exitImpersonationMutation.isPending}
          className="bg-amber-950 text-amber-50 hover:bg-amber-900 border-amber-950"
          data-testid="button-exit-impersonation"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Exit Impersonation
        </Button>
      </div>
    </div>
  );
}
