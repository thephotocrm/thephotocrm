import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Images, ExternalLink, Search, Settings, Calendar } from "lucide-react";

export default function Galleries() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: projects, isLoading } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    enabled: !!user
  });

  // Handle unauthorized access in useEffect to avoid render-time state updates
  useEffect(() => {
    if (!loading && (!user || user.role !== "PHOTOGRAPHER")) {
      setLocation("/");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user || user.role !== "PHOTOGRAPHER") {
    return null;
  }

  const projectsWithGalleries = projects?.filter((project: any) => project.galleryUrl) || [];
  
  // Filter galleries by search query
  const filteredGalleries = projectsWithGalleries.filter((project: any) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      project.title?.toLowerCase().includes(search) ||
      project.client?.firstName?.toLowerCase().includes(search) ||
      project.client?.lastName?.toLowerCase().includes(search) ||
      project.client?.email?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="h-full flex flex-col">
      <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4 bg-white dark:bg-gray-950">
        <div className="flex items-center gap-2">
          <Images className="w-6 h-6 text-purple-600" />
          <h1 className="text-xl font-semibold">Client Galleries</h1>
        </div>
        <div className="flex-1 max-w-md">
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
        <Link href="/settings">
          <Button variant="outline" size="sm" data-testid="button-gallery-settings">
            <Settings className="w-4 h-4 mr-2" />
            Gallery Settings
          </Button>
        </Link>
      </header>

      <div className="flex-1 p-6 overflow-auto bg-gray-50 dark:bg-gray-900">
        {projectsWithGalleries.length === 0 ? (
          <Card className="max-w-md mx-auto mt-12">
            <CardContent className="py-12">
              <div className="text-center">
                <Images className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-lg font-semibold mb-2">No Active Galleries</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Galleries are automatically created when clients pay their deposit
                </p>
                <Link href="/settings">
                  <Button variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure Gallery Platform
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : filteredGalleries.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-2">No galleries found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search query
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-4 text-sm text-muted-foreground">
              {filteredGalleries.length} {filteredGalleries.length === 1 ? 'gallery' : 'galleries'} found
            </div>
            
            {/* Masonry/Mosaic Grid Layout */}
            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
              {filteredGalleries.map((project: any) => (
                <Card 
                  key={project.id} 
                  className="break-inside-avoid hover:shadow-xl transition-all duration-300 group cursor-pointer"
                  onClick={() => window.open(project.galleryUrl, '_blank')}
                  data-testid={`gallery-tile-${project.id}`}
                >
                  <div className="relative overflow-hidden">
                    {/* Placeholder image - in real app would show gallery cover photo */}
                    <div className="aspect-[4/3] bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center">
                      <Images className="w-12 h-12 text-purple-400 opacity-50" />
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ExternalLink className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-purple-600 transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {project.client?.firstName} {project.client?.lastName}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      {project.galleryCreatedAt && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(project.galleryCreatedAt).toLocaleDateString()}
                        </div>
                      )}
                      {project.galleryReady && (
                        <Badge variant="secondary" className="text-xs">
                          Shared
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
