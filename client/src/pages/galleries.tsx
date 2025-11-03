import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Images, Plus, Search, Eye, Calendar, Globe, Lock, Trash2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function Galleries() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [galleryTitle, setGalleryTitle] = useState("");
  const [activeTab, setActiveTab] = useState<string>("active");
  const { toast } = useToast();

  // Fetch active galleries
  const { data: galleries = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/galleries"],
    enabled: !!user && activeTab === "active"
  });

  // Fetch deleted galleries (trash)
  const { data: deletedGalleries = [], isLoading: isLoadingTrash } = useQuery<any[]>({
    queryKey: ["/api/galleries-trash"],
    enabled: !!user && activeTab === "trash"
  });

  // Fetch projects for gallery creation
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    enabled: createModalOpen && !!user
  });

  // Create gallery mutation
  const createGalleryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/galleries", data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      toast({
        title: "Success",
        description: "Gallery created successfully",
      });
      setCreateModalOpen(false);
      setSelectedProjectId("");
      setGalleryTitle("");
      // Navigate to gallery detail for upload
      setLocation(`/galleries/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create gallery",
        variant: "destructive",
      });
    },
  });

  // Toggle public/private
  const togglePrivacyMutation = useMutation({
    mutationFn: async ({ galleryId, isPublic }: { galleryId: string; isPublic: boolean }) => {
      return apiRequest("PUT", `/api/galleries/${galleryId}`, { isPublic });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      toast({
        title: "Success",
        description: "Privacy setting updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update privacy",
        variant: "destructive",
      });
    },
  });

  // Restore deleted gallery
  const restoreGalleryMutation = useMutation({
    mutationFn: async (galleryId: string) => {
      return apiRequest("POST", `/api/galleries/${galleryId}/restore`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/galleries-trash"] });
      toast({
        title: "Success",
        description: "Gallery restored successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore gallery",
        variant: "destructive",
      });
    },
  });

  // When project is selected, auto-fill gallery title
  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setGalleryTitle(project.title || `${project.client?.firstName} ${project.client?.lastName} Gallery`);
    }
  };

  // Create gallery handler
  const handleCreateGallery = () => {
    if (!selectedProjectId || !galleryTitle) {
      toast({
        title: "Error",
        description: "Please select a project and enter a gallery title",
        variant: "destructive",
      });
      return;
    }

    createGalleryMutation.mutate({
      projectId: selectedProjectId,
      photographerId: user!.photographerId!,
      title: galleryTitle,
      status: "DRAFT",
      isPublic: false,
    });
  };

  // Filter galleries
  const filteredGalleries = galleries.filter((gallery: any) => {
    const matchesSearch = !searchQuery || 
      gallery.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gallery.project?.client?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gallery.project?.client?.lastName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || gallery.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading galleries...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="shrink-0 border-b px-4 sm:px-6 py-4 bg-white dark:bg-gray-950">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Images className="w-6 h-6 text-purple-600" />
              <h1 className="text-xl sm:text-2xl font-semibold">Galleries</h1>
            </div>
            <Button 
              onClick={() => setCreateModalOpen(true)}
              data-testid="button-create-gallery"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Gallery
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search galleries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-gallery-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="READY">Ready</SelectItem>
                <SelectItem value="SHARED">Shared</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Gallery Grid */}
      <div className="flex-1 p-4 sm:p-6 overflow-auto">
        <div className="max-w-[1400px] mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="active" data-testid="tab-active-galleries">
                <Images className="w-4 h-4 mr-2" />
                Active Galleries
              </TabsTrigger>
              <TabsTrigger value="trash" data-testid="tab-trash-galleries">
                <Trash2 className="w-4 h-4 mr-2" />
                Trash
              </TabsTrigger>
            </TabsList>

            {/* Active Galleries Tab */}
            <TabsContent value="active">
              {isLoading ? (
                <div className="text-center py-12">Loading galleries...</div>
              ) : filteredGalleries.length === 0 ? (
            <Card className="max-w-md mx-auto mt-12">
              <CardContent className="py-12">
                <div className="text-center">
                  <Images className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery || statusFilter !== "ALL" ? "No galleries found" : "No galleries yet"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchQuery || statusFilter !== "ALL" 
                      ? "Try adjusting your search or filters" 
                      : "Create your first gallery to get started"}
                  </p>
                  {!searchQuery && statusFilter === "ALL" && (
                    <Button 
                      onClick={() => setCreateModalOpen(true)}
                      data-testid="button-create-first-gallery"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Gallery
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                {filteredGalleries.length} {filteredGalleries.length === 1 ? 'gallery' : 'galleries'}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredGalleries.map((gallery: any) => (
                  <Card 
                    key={gallery.id}
                    className="hover:shadow-lg transition-all duration-300 group cursor-pointer"
                    onClick={() => setLocation(`/galleries/${gallery.id}`)}
                    data-testid={`gallery-card-${gallery.id}`}
                  >
                    {/* Cover Image */}
                    <div className="relative h-48 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 overflow-hidden">
                      {gallery.coverImage?.thumbnailUrl ? (
                        <img 
                          src={gallery.coverImage.thumbnailUrl}
                          alt={gallery.title}
                          className="w-full h-full object-cover"
                        />
                      ) : gallery.images && gallery.images[0]?.thumbnailUrl ? (
                        <img 
                          src={gallery.images[0].thumbnailUrl}
                          alt={gallery.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Images className="w-12 h-12 text-purple-400 opacity-50" />
                        </div>
                      )}
                      
                      {/* Status Badge - Top Right */}
                      <div className="absolute top-2 right-2">
                        <Badge 
                          variant={gallery.status === 'SHARED' ? 'default' : 'secondary'}
                          data-testid={`badge-status-${gallery.id}`}
                        >
                          {gallery.status}
                        </Badge>
                      </div>

                      {/* Privacy Toggle - Top Left */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePrivacyMutation.mutate({
                            galleryId: gallery.id,
                            isPublic: !gallery.isPublic
                          });
                        }}
                        className="absolute top-2 left-2 transition-all hover:scale-105"
                        data-testid={`toggle-privacy-${gallery.id}`}
                      >
                        <Badge 
                          variant={gallery.isPublic ? "default" : "secondary"}
                          className={`flex items-center gap-1.5 ${
                            gallery.isPublic 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'bg-gray-600 hover:bg-gray-700 text-white'
                          }`}
                        >
                          {gallery.isPublic ? (
                            <>
                              <Globe className="w-3 h-3" />
                              Public
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" />
                              Private
                            </>
                          )}
                        </Badge>
                      </button>
                    </div>

                    {/* Gallery Info */}
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-1 truncate" data-testid={`text-gallery-title-${gallery.id}`}>
                        {gallery.title}
                      </h3>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {gallery.project?.client?.firstName} {gallery.project?.client?.lastName}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Images className="w-3 h-3" />
                          <span data-testid={`text-image-count-${gallery.id}`}>
                            {gallery.imageCount || 0} images
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span data-testid={`text-view-count-${gallery.id}`}>
                            {gallery.viewCount || 0} views
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Calendar className="w-3 h-3" />
                        <span data-testid={`text-created-date-${gallery.id}`}>
                          {format(new Date(gallery.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
            </TabsContent>

            {/* Trash Tab */}
            <TabsContent value="trash">
              {isLoadingTrash ? (
                <div className="text-center py-12">Loading deleted galleries...</div>
              ) : deletedGalleries.length === 0 ? (
                <Card className="max-w-md mx-auto mt-12">
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Trash2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <h3 className="text-lg font-semibold mb-2">Trash is empty</h3>
                      <p className="text-sm text-muted-foreground">
                        Deleted galleries will appear here with a 30-day recovery window
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="mb-4 text-sm text-muted-foreground">
                    {deletedGalleries.length} {deletedGalleries.length === 1 ? 'gallery' : 'galleries'} in trash
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {deletedGalleries.map((gallery: any) => (
                      <Card 
                        key={gallery.id}
                        className="hover:shadow-lg transition-all duration-300 opacity-75"
                        data-testid={`deleted-gallery-card-${gallery.id}`}
                      >
                        {/* Cover Image */}
                        <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
                          {gallery.coverImage?.thumbnailUrl ? (
                            <img 
                              src={gallery.coverImage.thumbnailUrl}
                              alt={gallery.title}
                              className="w-full h-full object-cover opacity-60"
                            />
                          ) : gallery.images && gallery.images[0]?.thumbnailUrl ? (
                            <img 
                              src={gallery.images[0].thumbnailUrl}
                              alt={gallery.title}
                              className="w-full h-full object-cover opacity-60"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Images className="w-12 h-12 text-gray-400 opacity-50" />
                            </div>
                          )}
                          
                          {/* Deleted Badge */}
                          <div className="absolute top-2 right-2">
                            <Badge variant="destructive">
                              <Trash2 className="w-3 h-3 mr-1" />
                              Deleted
                            </Badge>
                          </div>
                        </div>

                        {/* Gallery Info */}
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-lg mb-1 truncate" data-testid={`text-deleted-gallery-title-${gallery.id}`}>
                            {gallery.title}
                          </h3>
                          
                          <p className="text-sm text-muted-foreground mb-3">
                            {gallery.project?.client?.firstName} {gallery.project?.client?.lastName}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                            <div className="flex items-center gap-1">
                              <Images className="w-3 h-3" />
                              <span>
                                {gallery.imageCount || 0} images
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Trash2 className="w-3 h-3" />
                              <span>
                                {format(new Date(gallery.deletedAt), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </div>

                          {/* Restore Button */}
                          <Button
                            onClick={() => restoreGalleryMutation.mutate(gallery.id)}
                            disabled={restoreGalleryMutation.isPending}
                            className="w-full"
                            variant="outline"
                            data-testid={`button-restore-gallery-${gallery.id}`}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            {restoreGalleryMutation.isPending ? "Restoring..." : "Restore Gallery"}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Create Gallery Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-create-gallery">
          <DialogHeader>
            <DialogTitle>Create New Gallery</DialogTitle>
            <DialogDescription>
              Select a project and create a gallery to upload photos for your client.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select 
                value={selectedProjectId} 
                onValueChange={handleProjectChange}
              >
                <SelectTrigger id="project" data-testid="select-project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project: any) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title} - {project.client?.firstName} {project.client?.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Gallery Title</Label>
              <Input
                id="title"
                value={galleryTitle}
                onChange={(e) => setGalleryTitle(e.target.value)}
                placeholder="Enter gallery title"
                data-testid="input-gallery-title"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCreateModalOpen(false)}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateGallery}
              disabled={createGalleryMutation.isPending || !selectedProjectId || !galleryTitle}
              data-testid="button-submit-create"
            >
              {createGalleryMutation.isPending ? "Creating..." : "Create Gallery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
