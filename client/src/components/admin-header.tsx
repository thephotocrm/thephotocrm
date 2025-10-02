import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Shield, LogOut } from 'lucide-react';

interface AdminHeaderProps {
  isImpersonating?: boolean;
  photographerName?: string;
  photographerEmail?: string;
}

export function AdminHeader({ isImpersonating, photographerName, photographerEmail }: AdminHeaderProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { refetchUser } = useAuth();

  const exitImpersonationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/exit-impersonation');
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      await refetchUser();
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
    <div className="bg-yellow-400 text-yellow-950 px-4 py-2 shadow-md border-b border-yellow-500" data-testid="header-admin">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5" />
          {isImpersonating ? (
            <div className="text-sm">
              <span className="font-semibold">Now logged in as</span>
              {photographerName && (
                <span className="ml-2">
                  {photographerName}
                  {photographerEmail && (
                    <span className="ml-1 text-yellow-800">({photographerEmail})</span>
                  )}
                </span>
              )}
            </div>
          ) : (
            <span className="font-semibold text-sm">Admin Mode</span>
          )}
        </div>
        {isImpersonating && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => exitImpersonationMutation.mutate()}
            disabled={exitImpersonationMutation.isPending}
            className="bg-yellow-950 text-yellow-50 hover:bg-yellow-900 border-yellow-950"
            data-testid="button-exit-impersonation"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Exit Impersonation
          </Button>
        )}
      </div>
    </div>
  );
}
