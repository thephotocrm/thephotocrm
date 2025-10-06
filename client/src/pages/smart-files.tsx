import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Layers, Copy, Edit, Archive, ArchiveRestore, Trash2, MoreVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SmartFileWithPages } from "@shared/schema";

export default function SmartFiles() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState<string>("");

  const { data: smartFiles, isLoading } = useQuery<SmartFileWithPages[]>({
    queryKey: ["/api/smart-files"],
  });

  const createSmartFileMutation = useMutation({
    mutationFn: async (smartFileData: any) => {
      await apiRequest("POST", "/api/smart-files", smartFileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smart-files"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Smart File created",
        description: "New Smart File has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create Smart File. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateSmartFileMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/smart-files/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smart-files"] });
      toast({
        title: "Smart File updated",
        description: "Smart File status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update Smart File. Please try again.",
        variant: "destructive"
      });
    }
  });

  const deleteSmartFileMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/smart-files/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smart-files"] });
      toast({
        title: "Smart File deleted",
        description: "Smart File has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete Smart File. Please try again.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setProjectType("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createSmartFileMutation.mutate({
      name,
      description: description || undefined,
      projectType: projectType || undefined,
    });
  };

  const handleEdit = (id: string) => {
    setLocation(`/smart-files/${id}/edit`);
  };

  const handleToggleArchive = (smartFile: SmartFileWithPages) => {
    const newStatus = smartFile.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
    updateSmartFileMutation.mutate({ id: smartFile.id, status: newStatus });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this Smart File? This action cannot be undone.")) {
      deleteSmartFileMutation.mutate(id);
    }
  };

  const totalPages = smartFiles?.reduce((sum, sf) => sum + (sf.pages?.length || 0), 0) || 0;
  const timesUsed = 0;

  return (
    <div>
      <header className="bg-card border-b border-border px-4 md:px-6 py-4 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SidebarTrigger 
              data-testid="button-menu-toggle" 
              className="hidden md:inline-flex" 
            />
            <div>
              <h1 className="text-xl md:text-2xl font-semibold">Smart Files</h1>
              <p className="text-sm md:text-base text-muted-foreground">Create custom checkout experiences with packages and add-ons</p>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-smart-file">
                <Plus className="w-5 h-5 mr-2" />
                Create Smart File
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Smart File</DialogTitle>
                <DialogDescription>
                  Create a custom checkout experience with packages, add-ons, and payment options.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Wedding Package Builder"
                    required
                    data-testid="input-smart-file-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Custom checkout for wedding clients..."
                    rows={3}
                    data-testid="textarea-description"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="projectType">Project Type</Label>
                  <Select value={projectType} onValueChange={setProjectType}>
                    <SelectTrigger data-testid="select-project-type">
                      <SelectValue placeholder="Universal (all project types)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNIVERSAL">Universal (all project types)</SelectItem>
                      <SelectItem value="WEDDING">Wedding</SelectItem>
                      <SelectItem value="PORTRAIT">Portrait</SelectItem>
                      <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                      <SelectItem value="ENGAGEMENT">Engagement</SelectItem>
                      <SelectItem value="FAMILY">Family</SelectItem>
                      <SelectItem value="MATERNITY">Maternity</SelectItem>
                      <SelectItem value="EVENT">Event</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Leave empty for a universal template that works for all project types</p>
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
                    disabled={createSmartFileMutation.isPending}
                    data-testid="button-create-smart-file-submit"
                  >
                    {createSmartFileMutation.isPending ? "Creating..." : "Create Smart File"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <div className="hidden md:grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Smart Files</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="count-smart-files">
                {smartFiles?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Active and archived</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pages Created</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="count-pages">
                {totalPages}
              </div>
              <p className="text-xs text-muted-foreground">Across all Smart Files</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Times Used</CardTitle>
              <Copy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="count-times-used">
                {timesUsed}
              </div>
              <p className="text-xs text-muted-foreground">Sent to clients</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Smart Files ({smartFiles?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8" data-testid="loading-spinner">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : !smartFiles?.length ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No Smart Files created yet.</p>
                <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-smart-file">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Smart File
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Project Type</TableHead>
                    <TableHead>Page Count</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {smartFiles.map((smartFile) => (
                    <TableRow key={smartFile.id} data-testid={`smart-file-row-${smartFile.id}`}>
                      <TableCell className="font-medium">
                        <span data-testid={`text-name-${smartFile.id}`}>{smartFile.name}</span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {smartFile.description || <span className="text-muted-foreground">No description</span>}
                      </TableCell>
                      <TableCell>
                        {smartFile.projectType || <span className="text-muted-foreground">Universal</span>}
                      </TableCell>
                      <TableCell>
                        <span data-testid={`text-page-count-${smartFile.id}`}>
                          {smartFile.pages?.length || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        {smartFile.createdAt ? new Date(smartFile.createdAt).toLocaleDateString() : "N/A"}
                      </TableCell>
                      <TableCell>
                        <span className={smartFile.status === "ACTIVE" ? "text-green-600" : "text-gray-500"} data-testid={`text-status-${smartFile.id}`}>
                          {smartFile.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-actions-${smartFile.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleEdit(smartFile.id)}
                              data-testid={`button-edit-${smartFile.id}`}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleToggleArchive(smartFile)}
                              data-testid={`button-archive-${smartFile.id}`}
                            >
                              {smartFile.status === "ACTIVE" ? (
                                <>
                                  <Archive className="w-4 h-4 mr-2" />
                                  Archive
                                </>
                              ) : (
                                <>
                                  <ArchiveRestore className="w-4 h-4 mr-2" />
                                  Unarchive
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(smartFile.id)}
                              className="text-destructive"
                              data-testid={`button-delete-${smartFile.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
