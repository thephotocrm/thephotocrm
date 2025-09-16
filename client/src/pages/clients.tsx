import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Mail, Phone, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { type ClientWithStage } from "@shared/schema";

export default function Clients() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Redirect to login if not authenticated
  if (!loading && !user) {
    setLocation("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const { data: clients, isLoading } = useQuery({
    queryKey: ["/api/clients"],
    enabled: !!user
  });

  const createClientMutation = useMutation({
    mutationFn: async (clientData: any) => {
      await apiRequest("POST", "/api/clients", clientData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Client created",
        description: "New client has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create client. Please try again.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setWeddingDate("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createClientMutation.mutate({
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      weddingDate: weddingDate ? new Date(weddingDate) : undefined
    });
  };

  const filteredClients = clients?.filter((client: Client) =>
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Clients</h1>
              <p className="text-muted-foreground">Manage your wedding photography clients</p>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-client">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Client</DialogTitle>
                  <DialogDescription>
                    Create a new client profile for your wedding photography services.
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        data-testid="input-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-email"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      data-testid="input-phone"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="weddingDate">Wedding Date</Label>
                    <Input
                      id="weddingDate"
                      type="date"
                      value={weddingDate}
                      onChange={(e) => setWeddingDate(e.target.value)}
                      data-testid="input-wedding-date"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createClientMutation.isPending}
                      data-testid="button-create-client"
                    >
                      {createClientMutation.isPending ? "Creating..." : "Create Client"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="p-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-clients"
              />
            </div>
          </div>

          {/* Clients Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Clients ({filteredClients.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No clients found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Wedding Date</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client: Client) => (
                      <TableRow key={client.id} data-testid={`client-row-${client.id}`}>
                        <TableCell className="font-medium">
                          {client.firstName} {client.lastName}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {client.email && (
                              <div className="flex items-center text-sm">
                                <Mail className="w-3 h-3 mr-1" />
                                {client.email}
                              </div>
                            )}
                            {client.phone && (
                              <div className="flex items-center text-sm">
                                <Phone className="w-3 h-3 mr-1" />
                                {client.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {client.stage?.id ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor: `${client.stage.color}20`, color: client.stage.color}}>
                              {client.stage.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">No stage</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {client.weddingDate ? (
                            <div className="flex items-center text-sm">
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(client.weddingDate).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(client.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" data-testid={`button-view-client-${client.id}`}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
