import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowLeft, Upload, Trash2, Share2, Save, Eye, Download, 
  Globe, Lock, Image as ImageIcon, Calendar, User, Copy, X, Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import Uppy from "@uppy/core";
import Tus from "@uppy/tus";
import Dashboard from "@uppy/dashboard";

export default function GalleryDetail() {
  const { galleryId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  // Form states for settings
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");

  // Fetch gallery with images
  const { data: gallery, isLoading } = useQuery<any>({
    queryKey: ["/api/galleries", galleryId],
    enabled: !!galleryId && !!user,
  });

  // Initialize form when gallery loads
  useState(() => {
    if (gallery) {
      setEditedTitle(gallery.title || "");
      setEditedDescription(gallery.description || "");
    }
  });

  // Cloudinary config
  const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
  const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "unsigned_preset";

  // Uppy instance for chunked/resumable uploads
  const uppyRef = useRef<Uppy | null>(null);
  const uppyDashboardRef = useRef<HTMLDivElement>(null);

  // Initialize Uppy instance  
  useEffect(() => {
    if (!galleryId || !user) return;

    const uppy = new Uppy({
      id: `gallery-${galleryId}`,
      autoProceed: false,
      restrictions: {
        maxNumberOfFiles: 100,
        allowedFileTypes: ['image/*'],
        maxFileSize: 100 * 1024 * 1024, // 100MB
      },
      meta: {
        galleryId,
        photographerId: user.photographerId
      },
    })
      .use(Tus, {
        endpoint: `/api/galleries/${galleryId}/upload/tus`,
        resume: true,
        retryDelays: [0, 1000, 3000, 5000],
        chunkSize: 10 * 1024 * 1024, // 10MB chunks
        limit: 3, // 3 parallel uploads
        // Add metadata to each upload
        onBeforeRequest: (req) => {
          req.setHeader('Authorization', `Bearer ${document.cookie.split('token=')[1]?.split(';')[0]}`);
        },
      })
      .on('file-added', (file) => {
        console.log('[Uppy] File added:', file.name);
      })
      .on('upload', (data) => {
        console.log('[Uppy] Upload started');
      })
      .on('upload-success', async (file, response) => {
        console.log('[Uppy] Upload success:', file?.name, response);
        
        // Extract upload ID from TUS response URL
        // The uploadURL is typically like: /api/galleries/:galleryId/upload/tus/:uploadId
        const uploadId = response?.uploadURL ? 
          response.uploadURL.split('/').pop() : null;
        
        if (uploadId) {
          try {
            // Finalize the upload by creating the gallery image record
            await apiRequest("POST", `/api/galleries/${galleryId}/images/finalize`, { uploadId });
            
            // Refresh gallery to show the new image
            queryClient.invalidateQueries({ queryKey: ["/api/galleries", galleryId] });
            
            toast({
              title: "Success",
              description: `${file?.name} uploaded successfully`,
            });
          } catch (error: any) {
            console.error('[Uppy] Failed to finalize upload:', error);
            toast({
              title: "Upload Failed",
              description: error.message || "Failed to save image record",
              variant: "destructive",
            });
          }
        } else {
          console.error('[Uppy] No upload ID found in response');
          toast({
            title: "Error",
            description: "Upload completed but couldn't retrieve upload ID",
            variant: "destructive",
          });
        }
      })
      .on('upload-error', (file, error) => {
        console.error('[Uppy] Upload error:', error);
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file?.name}`,
          variant: "destructive",
        });
      })
      .on('complete', (result) => {
        console.log('[Uppy] All uploads complete:', result);
        if (result.successful.length > 0) {
          toast({
            title: "Success",
            description: `${result.successful.length} images uploaded successfully`,
          });
        }
      });

    uppyRef.current = uppy;

    // Mount dashboard if element exists
    if (uppyDashboardRef.current && !uppyDashboardRef.current.querySelector('.uppy-Dashboard')) {
      uppy.use(Dashboard, {
        target: uppyDashboardRef.current,
        inline: true,
        height: 400,
        showProgressDetails: true,
        note: 'Images only, up to 100MB per file',
        proudlyDisplayPoweredByUppy: false,
      });
    }

    return () => {
      uppy.close();
    };
  }, [galleryId, user, toast]);

  // Update gallery mutation
  const updateGalleryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", `/api/galleries/${galleryId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries", galleryId] });
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      toast({
        title: "Success",
        description: "Gallery updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update gallery",
        variant: "destructive",
      });
    },
  });

  // Delete gallery mutation
  const deleteGalleryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/galleries/${galleryId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      toast({
        title: "Success",
        description: "Gallery deleted successfully",
      });
      setLocation("/galleries");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete gallery",
        variant: "destructive",
      });
    },
  });

  // Share gallery mutation
  const shareGalleryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/galleries/${galleryId}/share`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries", galleryId] });
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      toast({
        title: "Success",
        description: "Gallery marked as shared",
      });
      setShareDialogOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to share gallery",
        variant: "destructive",
      });
    },
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      return apiRequest("DELETE", `/api/galleries/${galleryId}/images/${imageId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries", galleryId] });
      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete image",
        variant: "destructive",
      });
    },
  });

  // Set cover image mutation
  const setCoverImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      return apiRequest("PATCH", `/api/galleries/${galleryId}/cover-image`, { imageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries", galleryId] });
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      toast({
        title: "Success",
        description: "Cover image updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set cover image",
        variant: "destructive",
      });
    },
  });

  // Update image caption mutation
  const updateImageMutation = useMutation({
    mutationFn: async ({ imageId, caption }: { imageId: string; caption: string }) => {
      return apiRequest("PUT", `/api/galleries/${galleryId}/images/${imageId}`, { caption });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries", galleryId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update caption",
        variant: "destructive",
      });
    },
  });


  // Save settings
  const handleSaveSettings = () => {
    updateGalleryMutation.mutate({
      title: editedTitle,
      description: editedDescription,
    });
  };

  // Copy share link
  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/client/galleries/${galleryId}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Copied!",
      description: "Gallery link copied to clipboard",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading gallery...</div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h1 className="text-2xl font-bold">Gallery not found</h1>
        <Button onClick={() => setLocation("/galleries")} data-testid="button-back-to-galleries">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Galleries
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="shrink-0 border-b px-4 sm:px-6 py-4 bg-white dark:bg-gray-950">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/galleries")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold" data-testid="text-gallery-title">
                {gallery.title}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={gallery.status === 'SHARED' ? 'default' : 'secondary'} data-testid="badge-status">
                  {gallery.status}
                </Badge>
                <Badge 
                  variant={gallery.isPublic ? "default" : "secondary"}
                  className={gallery.isPublic ? 'bg-green-600' : 'bg-gray-600'}
                  data-testid="badge-privacy"
                >
                  {gallery.isPublic ? (
                    <>
                      <Globe className="w-3 h-3 mr-1" />
                      Public
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3 mr-1" />
                      Private
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => shareGalleryMutation.mutate()}
              disabled={shareGalleryMutation.isPending || gallery.status === 'SHARED'}
              data-testid="button-share-gallery"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {gallery.status === 'SHARED' ? 'Shared' : 'Share Gallery'}
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="upload" className="h-full flex flex-col">
          <div className="border-b bg-white dark:bg-gray-950 px-4 sm:px-6">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="upload" data-testid="tab-upload">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings">
                <Globe className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="info" data-testid="tab-info">
                <Eye className="w-4 h-4 mr-2" />
                Info
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Upload Tab */}
          <TabsContent value="upload" className="flex-1 p-4 sm:p-6 mt-0">
            <div className="max-w-[1400px] mx-auto space-y-6">
              {/* Uppy Upload Dashboard - Chunked/Resumable Uploads */}
              <Card>
                <CardHeader>
                  <CardTitle>Upload Images</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Drag & drop images or click to browse • Supports up to 100 files • Resumes if interrupted
                  </p>
                </CardHeader>
                <CardContent>
                  {/* Uppy Dashboard mounts here */}
                  <div 
                    ref={uppyDashboardRef} 
                    data-testid="uppy-dashboard"
                    className="rounded-lg overflow-hidden"
                  />
                </CardContent>
              </Card>

              {/* Uploaded Images Grid */}
              {gallery.images && gallery.images.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Uploaded Images ({gallery.images.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {gallery.images.map((image: any, index: number) => (
                        <Card key={image.id} className="overflow-hidden" data-testid={`image-card-${index}`}>
                          <div className="relative aspect-video">
                            <img
                              src={image.thumbnailUrl}
                              alt={image.caption || `Image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            
                            {/* Cover Image Badge */}
                            {gallery.coverImageId === image.id && (
                              <Badge 
                                className="absolute top-2 left-2 bg-yellow-500 hover:bg-yellow-600"
                                data-testid={`badge-cover-image-${index}`}
                              >
                                <Star className="w-3 h-3 mr-1 fill-current" />
                                Cover
                              </Badge>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="absolute top-2 right-2 flex gap-2">
                              <Button
                                variant={gallery.coverImageId === image.id ? "secondary" : "default"}
                                size="icon"
                                onClick={() => setCoverImageMutation.mutate(image.id)}
                                title="Set as cover image"
                                data-testid={`button-set-cover-${index}`}
                              >
                                <Star className={`w-4 h-4 ${gallery.coverImageId === image.id ? 'fill-current' : ''}`} />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => deleteImageMutation.mutate(image.id)}
                                data-testid={`button-delete-image-${index}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <CardContent className="p-3">
                            <Input
                              placeholder="Add caption..."
                              value={image.caption || ""}
                              onChange={(e) => {
                                // Optimistic update
                                queryClient.setQueryData(
                                  ["/api/galleries", galleryId],
                                  (old: any) => ({
                                    ...old,
                                    images: old.images.map((img: any) =>
                                      img.id === image.id ? { ...img, caption: e.target.value } : img
                                    ),
                                  })
                                );
                              }}
                              onBlur={(e) => {
                                updateImageMutation.mutate({
                                  imageId: image.id,
                                  caption: e.target.value,
                                });
                              }}
                              data-testid={`input-caption-${index}`}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="flex-1 p-4 sm:p-6 mt-0">
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gallery Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Gallery Title</Label>
                    <Input
                      id="title"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      data-testid="input-edit-title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      placeholder="Add a description for your gallery"
                      rows={4}
                      data-testid="input-edit-description"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="privacy">Public Gallery</Label>
                      <p className="text-sm text-muted-foreground">
                        Show this gallery on your public portfolio
                      </p>
                    </div>
                    <Switch
                      id="privacy"
                      checked={gallery.isPublic || false}
                      onCheckedChange={(checked) => {
                        updateGalleryMutation.mutate({ isPublic: checked });
                      }}
                      data-testid="switch-public"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="watermark">Enable Watermarks</Label>
                      <p className="text-sm text-muted-foreground">
                        Add watermark to gallery images
                      </p>
                    </div>
                    <Switch
                      id="watermark"
                      checked={gallery.watermarkEnabled || false}
                      onCheckedChange={(checked) => {
                        updateGalleryMutation.mutate({ watermarkEnabled: checked });
                      }}
                      data-testid="switch-watermark"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="downloads">Allow Downloads</Label>
                      <p className="text-sm text-muted-foreground">
                        Let clients download images
                      </p>
                    </div>
                    <Switch
                      id="downloads"
                      checked={gallery.allowDownloads ?? true}
                      onCheckedChange={(checked) => {
                        updateGalleryMutation.mutate({ allowDownloads: checked });
                      }}
                      data-testid="switch-downloads"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveSettings}
                      disabled={updateGalleryMutation.isPending}
                      data-testid="button-save-settings"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-red-200 dark:border-red-900">
                <CardHeader>
                  <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Delete Gallery</p>
                      <p className="text-sm text-muted-foreground">
                        This action cannot be undone
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteConfirmOpen(true)}
                      data-testid="button-delete-gallery"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Gallery
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info" className="flex-1 p-4 sm:p-6 mt-0">
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gallery Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Images</p>
                      <p className="text-2xl font-bold" data-testid="text-image-count">
                        {gallery.imageCount || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Views</p>
                      <p className="text-2xl font-bold" data-testid="text-view-count">
                        {gallery.viewCount || 0}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        Created {format(new Date(gallery.createdAt), 'MMMM d, yyyy')}
                      </span>
                    </div>
                    {gallery.sharedAt && (
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          Shared {format(new Date(gallery.sharedAt), 'MMMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    {gallery.project?.client && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {gallery.project.client.firstName} {gallery.project.client.lastName}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {gallery.status === 'SHARED' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Share Link</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        value={`${window.location.origin}/client/galleries/${galleryId}`}
                        readOnly
                        data-testid="input-share-link"
                      />
                      <Button onClick={copyShareLink} data-testid="button-copy-link">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent data-testid="dialog-delete-confirm">
          <DialogHeader>
            <DialogTitle>Delete Gallery?</DialogTitle>
            <DialogDescription>
              This will permanently delete this gallery and all its images. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteGalleryMutation.mutate();
                setDeleteConfirmOpen(false);
              }}
              disabled={deleteGalleryMutation.isPending}
              data-testid="button-confirm-delete"
            >
              Delete Gallery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Success Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent data-testid="dialog-share-success">
          <DialogHeader>
            <DialogTitle>Gallery Shared!</DialogTitle>
            <DialogDescription>
              Your gallery is now shared. Copy the link below to send to your client.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 py-4">
            <Input
              value={`${window.location.origin}/client/galleries/${galleryId}`}
              readOnly
              data-testid="input-share-link-dialog"
            />
            <Button onClick={copyShareLink} data-testid="button-copy-link-dialog">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setShareDialogOpen(false)} data-testid="button-close-share-dialog">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
