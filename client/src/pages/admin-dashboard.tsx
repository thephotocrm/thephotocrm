import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, LogIn, Shield } from 'lucide-react';

interface PhotographerWithStats {
  id: string;
  businessName: string;
  email: string | null;
  clientCount: number;
  createdAt: Date | null;
  timezone: string | null;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: photographers, isLoading } = useQuery<PhotographerWithStats[]>({
    queryKey: ['/api/admin/photographers'],
  });

  const impersonateMutation = useMutation({
    mutationFn: async (photographerId: string) => {
      return await apiRequest('POST', `/api/admin/impersonate/${photographerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: 'Impersonation Started',
        description: 'You are now viewing as the selected photographer.',
      });
      setLocation('/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: 'Impersonation Failed',
        description: error.message || 'Failed to impersonate photographer',
        variant: 'destructive',
      });
    },
  });

  const filteredPhotographers = photographers?.filter((photographer) => {
    const query = searchQuery.toLowerCase();
    return (
      photographer.businessName.toLowerCase().includes(query) ||
      photographer.email?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading photographers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage photographer accounts and provide support
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Photographers</CardTitle>
          <CardDescription>
            View and manage all photographer accounts in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by business name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
              data-testid="input-search-photographers"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Clients</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPhotographers && filteredPhotographers.length > 0 ? (
                  filteredPhotographers.map((photographer) => (
                    <TableRow key={photographer.id} data-testid={`row-photographer-${photographer.id}`}>
                      <TableCell className="font-medium">
                        {photographer.businessName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {photographer.email || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                          {photographer.clientCount} clients
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {photographer.timezone || 'N/A'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {photographer.createdAt
                          ? new Date(photographer.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => impersonateMutation.mutate(photographer.id)}
                          disabled={impersonateMutation.isPending}
                          data-testid={`button-impersonate-${photographer.id}`}
                        >
                          <LogIn className="h-4 w-4 mr-2" />
                          Login As
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchQuery
                        ? 'No photographers found matching your search.'
                        : 'No photographers in the system yet.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {filteredPhotographers && (
            <div className="text-sm text-muted-foreground">
              Showing {filteredPhotographers.length} of {photographers?.length || 0} photographers
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
