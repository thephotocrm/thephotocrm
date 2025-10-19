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

  const { data: photographer } = useQuery<any>({
    queryKey: ["/api/photographer"],
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

  // Check if ShootProof is connected
  const isShootProofConnected = !!photographer?.shootproofAccessToken;

  // Default sample galleries for demo purposes (before ShootProof connection)
  const defaultGalleries = [
    { id: 'default-1', title: 'Summer Beach Wedding', client: { firstName: 'Sample', lastName: 'Client' }, galleryCreatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), galleryReady: true, galleryUrl: '#', imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80', height: 'tall' },
    { id: 'default-2', title: 'Mountain Engagement', client: { firstName: 'Demo', lastName: 'Couple' }, galleryCreatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), galleryReady: true, galleryUrl: '#', imageUrl: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80', height: 'short' },
    { id: 'default-3', title: 'Rustic Barn Wedding', client: { firstName: 'Example', lastName: 'Bride' }, galleryCreatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), galleryReady: false, galleryUrl: '#', imageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80', height: 'medium' },
    { id: 'default-4', title: 'City Skyline Portraits', client: { firstName: 'Test', lastName: 'User' }, galleryCreatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), galleryReady: true, galleryUrl: '#', imageUrl: 'https://images.unsplash.com/photo-1606216794079-e06c86c28c73?w=800&q=80', height: 'tall' },
    { id: 'default-5', title: 'Garden Party Wedding', client: { firstName: 'Preview', lastName: 'Client' }, galleryCreatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), galleryReady: true, galleryUrl: '#', imageUrl: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80', height: 'medium' },
    { id: 'default-6', title: 'Downtown Loft Wedding', client: { firstName: 'Sample', lastName: 'Couple' }, galleryCreatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), galleryReady: true, galleryUrl: '#', imageUrl: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=800&q=80', height: 'short' },
  ];

  // Use default galleries if not connected, actual galleries if connected
  const actualProjectsWithGalleries = (projects?.filter((project: any) => project.galleryUrl) || []).map((project: any, index: number) => ({
    ...project,
    // Assign varying heights to create mosaic effect
    height: index % 3 === 0 ? 'tall' : index % 3 === 1 ? 'short' : 'medium'
  }));
  const projectsWithGalleries = isShootProofConnected ? actualProjectsWithGalleries : defaultGalleries;
  
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
      <header className="shrink-0 border-b px-4 py-4 bg-white dark:bg-gray-950">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Images className="w-6 h-6 text-purple-600" />
            <h1 className="text-xl font-semibold">Client Galleries</h1>
            {!isShootProofConnected && (
              <Badge variant="secondary" className="ml-2">
                Default
              </Badge>
            )}
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
          <Link href="/settings">
            <Button variant="outline" size="sm" className="w-full md:w-auto" data-testid="button-gallery-settings">
              <Settings className="w-4 h-4 mr-2" />
              Gallery Settings
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 p-6 overflow-auto bg-gray-50 dark:bg-gray-900">
        {projectsWithGalleries.length === 0 ? (
          <Card className="max-w-md mx-auto mt-12">
            <CardContent className="py-12">
              <div className="text-center">
                <Images className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-lg font-semibold mb-2">
                  {isShootProofConnected ? 'No Galleries Yet' : 'Connect ShootProof to Get Started'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {isShootProofConnected 
                    ? 'Your ShootProof galleries will appear here once created'
                    : 'Connect your ShootProof account to sync your professional galleries with client print ordering'}
                </p>
                <Link href="/settings">
                  <Button variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    {isShootProofConnected ? 'Gallery Settings' : 'Connect ShootProof'}
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
                  className="break-inside-avoid hover:shadow-xl transition-all duration-300 group cursor-pointer mb-4"
                  onClick={() => setLocation(`/galleries/${project.id}`)}
                  data-testid={`gallery-tile-${project.id}`}
                >
                  <div className="relative overflow-hidden">
                    {/* Varying height based on tile size */}
                    {project.imageUrl ? (
                      <div 
                        className={`relative bg-gray-200 dark:bg-gray-800 ${
                          project.height === 'tall' ? 'h-80' : 
                          project.height === 'short' ? 'h-48' : 
                          'h-64'
                        }`}
                      >
                        <img 
                          src={project.imageUrl} 
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className={`bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center ${
                        project.height === 'tall' ? 'h-80' : 
                        project.height === 'short' ? 'h-48' : 
                        'h-64'
                      }`}>
                        <Images className="w-12 h-12 text-purple-400 opacity-50" />
                      </div>
                    )}
                    {!isShootProofConnected && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-xs bg-white/90 dark:bg-gray-800/90">
                          Demo
                        </Badge>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
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
