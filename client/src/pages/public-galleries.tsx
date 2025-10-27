import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Images, ExternalLink, Search, Calendar } from "lucide-react";

export default function PublicGalleries() {
  const [, params] = useRoute("/public/galleries/:photographerPublicToken");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery<{
    photographer: { businessName: string };
    galleries: Array<{
      id: string;
      title: string;
      projectType: string;
      galleryUrl: string;
      galleryId: string;
      galleryCreatedAt: string;
      galleryReady: boolean;
      client: {
        firstName: string;
        lastName: string;
      } | null;
    }>;
  }>({
    queryKey: ["/api/public/galleries", params?.photographerPublicToken],
    enabled: !!params?.photographerPublicToken,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-lg" data-testid="loading-state">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Images className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold mb-2" data-testid="error-message">Photographer not found</h3>
          <p className="text-sm text-muted-foreground">
            The gallery link you followed may be invalid or expired
          </p>
        </div>
      </div>
    );
  }

  const { photographer, galleries } = data;

  // Assign varying heights to create mosaic effect
  const galleriesWithHeights = galleries.map((gallery, index) => ({
    ...gallery,
    height: index % 3 === 0 ? 'tall' : index % 3 === 1 ? 'short' : 'medium'
  }));

  // Filter galleries by search query
  const filteredGalleries = galleriesWithHeights.filter((gallery) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      gallery.title?.toLowerCase().includes(search) ||
      gallery.client?.firstName?.toLowerCase().includes(search) ||
      gallery.client?.lastName?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="border-b px-4 py-6 bg-white dark:bg-gray-950 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1140px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-2">
              <Images className="w-6 h-6 text-purple-600" />
              <h1 className="text-xl md:text-2xl font-semibold" data-testid="photographer-name">
                {photographer.businessName}
              </h1>
            </div>
            <div className="flex-1 md:max-w-md">
              <div className="relative">
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
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="max-w-[1140px] mx-auto">
          {galleries.length === 0 ? (
            <Card className="max-w-md mx-auto mt-12">
              <CardContent className="py-12">
                <div className="text-center">
                  <Images className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-lg font-semibold mb-2" data-testid="empty-state-title">
                    No Public Galleries Yet
                  </h3>
                  <p className="text-sm text-muted-foreground" data-testid="empty-state-description">
                    Check back soon for beautiful gallery showcases
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : filteredGalleries.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold mb-2" data-testid="no-results-title">No galleries found</h3>
              <p className="text-sm text-muted-foreground" data-testid="no-results-description">
                Try adjusting your search query
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-4 text-sm text-muted-foreground" data-testid="gallery-count">
                {filteredGalleries.length} {filteredGalleries.length === 1 ? 'gallery' : 'galleries'} found
              </div>
              
              {/* Masonry/Mosaic Grid Layout */}
              <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                {filteredGalleries.map((gallery) => {
                  const GalleryCard = (
                    <Card className={`hover:shadow-xl transition-all duration-300 group ${gallery.galleryUrl ? 'cursor-pointer' : ''}`}>
                      <div className="relative overflow-hidden">
                        {/* Varying height based on tile size */}
                        <div 
                          className={`relative bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center ${
                            gallery.height === 'tall' ? 'h-80' : 
                            gallery.height === 'short' ? 'h-48' : 
                            'h-64'
                          }`}
                        >
                          <Images className="w-12 h-12 text-purple-400 opacity-50" />
                        </div>
                        {gallery.galleryUrl && (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <ExternalLink className="w-8 h-8 text-white" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 
                          className={`font-semibold text-lg mb-1 transition-colors ${gallery.galleryUrl ? 'group-hover:text-purple-600' : ''}`}
                          data-testid={`gallery-title-${gallery.id}`}
                        >
                          {gallery.title}
                        </h3>
                        {gallery.client && (
                          <p 
                            className="text-sm text-muted-foreground mb-3" 
                            data-testid={`gallery-client-${gallery.id}`}
                          >
                            {gallery.client.firstName} {gallery.client.lastName}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          {gallery.galleryCreatedAt && (
                            <div 
                              className="flex items-center gap-1 text-xs text-muted-foreground"
                              data-testid={`gallery-date-${gallery.id}`}
                            >
                              <Calendar className="w-3 h-3" />
                              {new Date(gallery.galleryCreatedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );

                  return gallery.galleryUrl ? (
                    <a
                      key={gallery.id}
                      href={gallery.galleryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block break-inside-avoid mb-4"
                      data-testid={`gallery-card-${gallery.id}`}
                    >
                      {GalleryCard}
                    </a>
                  ) : (
                    <div
                      key={gallery.id}
                      className="block break-inside-avoid mb-4"
                      data-testid={`gallery-card-${gallery.id}`}
                    >
                      {GalleryCard}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
