import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, Mail, Key } from 'lucide-react';

export default function AdminSetup() {
  const [, setLocation] = useLocation();
  const [setupToken, setSetupToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const setupMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/auth/admin-setup', {
        setupToken,
        email,
        password
      });
    },
    onSuccess: () => {
      setLocation('/admin/dashboard');
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to create admin user');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!setupToken || !email || !password) {
      setError('All fields are required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setupMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-bold">Admin Setup</CardTitle>
          </div>
          <CardDescription>
            Create the initial administrator account for this platform.
            This page is only accessible once with a valid setup token.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="setupToken" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Setup Token
              </Label>
              <Input
                id="setupToken"
                type="password"
                placeholder="Enter setup token from environment"
                value={setupToken}
                onChange={(e) => setSetupToken(e.target.value)}
                disabled={setupMutation.isPending}
                data-testid="input-setup-token"
                required
              />
              <p className="text-xs text-muted-foreground">
                This token is set in your ADMIN_SETUP_TOKEN environment variable
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Admin Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={setupMutation.isPending}
                data-testid="input-admin-email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={setupMutation.isPending}
                data-testid="input-admin-password"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={setupMutation.isPending}
              data-testid="button-create-admin"
            >
              {setupMutation.isPending ? 'Creating Admin...' : 'Create Admin Account'}
            </Button>

            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                🔒 Security Notice
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                After creating your admin account, remove the ADMIN_SETUP_TOKEN from your environment variables to permanently disable this setup page.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
