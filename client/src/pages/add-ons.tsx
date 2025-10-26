import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, ShoppingBag, DollarSign, Edit, Trash2, Copy } from "lucide-react";
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

interface AddOn {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  priceCents: number;
  createdAt: string;
}

export default function AddOns() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddOn, setEditingAddOn] = useState<AddOn | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("");

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL LOGIC
  const { data: addOns, isLoading } = useQuery({
    queryKey: ["/api/add-ons"],
    enabled: !!user
  });

  const createAddOnMutation = useMutation({
    mutationFn: async (addOnData: any) => {
      await apiRequest("POST", "/api/add-ons", addOnData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/add-ons"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Add-on created",
        description: "New add-on has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create add-on. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateAddOnMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/add-ons/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/add-ons"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Add-on updated",
        description: "Add-on has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update add-on. Please try again.",
        variant: "destructive"
      });
    }
  });

  const deleteAddOnMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/add-ons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/add-ons"] });
      toast({
        title: "Add-on deleted",
        description: "Add-on has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete add-on. Please try again.",
        variant: "destructive"
      });
    }
  });

  const copyAddOnMutation = useMutation({
    mutationFn: async (addOnData: any) => {
      await apiRequest("POST", "/api/add-ons", {
        ...addOnData,
        name: `${addOnData.name} (Copy)`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/add-ons"] });
      toast({
        title: "Add-on copied",
        description: "Add-on has been duplicated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to copy add-on. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  // Prevent flash of protected content
  if (!loading && !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const resetForm = () => {
    setName("");
    setDescription("");
    setImageUrl("");
    setPrice("");
    setEditingAddOn(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const addOnData = {
      name,
      description: description || undefined,
      imageUrl: imageUrl || undefined,
      priceCents: Math.round(parseFloat(price) * 100)
    };

    if (editingAddOn) {
      updateAddOnMutation.mutate({ id: editingAddOn.id, data: addOnData });
    } else {
      createAddOnMutation.mutate(addOnData);
    }
  };

  const handleEdit = (addOn: AddOn) => {
    setEditingAddOn(addOn);
    setName(addOn.name);
    setDescription(addOn.description || "");
    setImageUrl(addOn.imageUrl || "");
    setPrice((addOn.priceCents / 100).toString());
    setIsDialogOpen(true);
  };

  const handleCopy = (addOn: AddOn) => {
    copyAddOnMutation.mutate({
      name: addOn.name,
      description: addOn.description,
      imageUrl: addOn.imageUrl,
      priceCents: addOn.priceCents
    });
  };

  const handleDelete = (addOn: AddOn) => {
    if (confirm(`Are you sure you want to delete "${addOn.name}"? This action cannot be undone.`)) {
      deleteAddOnMutation.mutate(addOn.id);
    }
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  };

  return (
    <div>
        {/* Header */}
        <header className="bg-card border-b border-border px-4 md:px-6 py-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SidebarTrigger 
                data-testid="button-menu-toggle" 
                className="hidden md:inline-flex" 
              />
              <div>
                <h1 className="text-xl md:text-2xl font-semibold">Add-ons</h1>
                <p className="text-sm md:text-base text-muted-foreground">Create add-on services to offer in Smart Files</p>
              </div>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-addon">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Add-on
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingAddOn ? "Edit Add-on" : "Create New Add-on"}</DialogTitle>
                  <DialogDescription>
                    {editingAddOn 
                      ? "Update the add-on details below."
                      : "Create an add-on service that can be selected in Smart Files."
                    }
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Add-on Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Extra Hour of Coverage"
                      required
                      data-testid="input-addon-name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add an extra hour of photography coverage..."
                      rows={3}
                      data-testid="textarea-description"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Add-on Image URL (optional)</Label>
                    <Input
                      id="imageUrl"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/addon-image.jpg"
                      type="url"
                      data-testid="input-image-url"
                    />
                    <p className="text-xs text-muted-foreground">Add an image to showcase this add-on</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="250.00"
                      required
                      data-testid="input-price"
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
                      disabled={createAddOnMutation.isPending || updateAddOnMutation.isPending}
                      data-testid="button-create-addon-submit"
                    >
                      {editingAddOn
                        ? updateAddOnMutation.isPending ? "Updating..." : "Update Add-on"
                        : createAddOnMutation.isPending ? "Creating..." : "Create Add-on"
                      }
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="max-w-[1140px] mx-auto p-6 space-y-6">
          {/* Stats Cards */}
          <div className="hidden md:grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Add-ons</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="count-addons">
                  {addOns?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Ready to use</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Price</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {addOns?.length ? 
                    formatPrice(addOns.reduce((sum: number, addon: AddOn) => sum + addon.priceCents, 0) / addOns.length) :
                    "$0"
                  }
                </div>
                <p className="text-xs text-muted-foreground">Across all add-ons</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Times Used</CardTitle>
                <Copy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">In Smart Files</p>
              </CardContent>
            </Card>
          </div>

          {/* Add-ons List */}
          <Card>
            <CardHeader>
              <CardTitle>All Add-ons ({addOns?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : !addOns?.length ? (
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No add-ons created yet.</p>
                  <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-addon">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Add-on
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Add-on Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addOns.map((addon: AddOn) => (
                      <TableRow key={addon.id} data-testid={`addon-row-${addon.id}`}>
                        <TableCell className="font-medium">{addon.name}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {addon.description || <span className="text-muted-foreground">No description</span>}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatPrice(addon.priceCents)}
                        </TableCell>
                        <TableCell>
                          {new Date(addon.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEdit(addon)}
                              data-testid={`button-edit-${addon.id}`}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleCopy(addon)}
                              disabled={copyAddOnMutation.isPending}
                              data-testid={`button-copy-${addon.id}`}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDelete(addon)}
                              disabled={deleteAddOnMutation.isPending}
                              data-testid={`button-delete-${addon.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
