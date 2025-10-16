import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Images, ExternalLink, Calendar, CheckCircle, Clock, Settings } from "lucide-react";

export default function Galleries() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: projects, isLoading } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    enabled: !!user
  });

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user || user.role !== "PHOTOGRAPHER") {
    setLocation("/");
    return null;
  }

  const projectsWithGalleries = projects?.filter((project: any) => project.galleryUrl) || [];
  const projectsReadyForGallery = projects?.filter((project: any) => !project.galleryUrl) || [];

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white dark:bg-gray-950">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2 flex-1">
            <Images className="w-6 h-6 text-purple-600" />
            <h1 className="text-xl font-semibold">Client Galleries</h1>
          </div>
          <Link href="/settings">
            <Button variant="outline" size="sm" data-testid="button-gallery-settings">
              <Settings className="w-4 h-4 mr-2" />
              Gallery Settings
            </Button>
          </Link>
        </header>

        <div className="flex-1 p-6 overflow-auto">
          {/* Active Galleries */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">Active Galleries</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {projectsWithGalleries.length} {projectsWithGalleries.length === 1 ? 'gallery' : 'galleries'} created
                </p>
              </div>
            </div>

            {projectsWithGalleries.length === 0 ? (
              <Card>
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
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projectsWithGalleries.map((project: any) => (
                  <Card key={project.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1">{project.title}</CardTitle>
                          <CardDescription>
                            {project.client?.firstName} {project.client?.lastName}
                          </CardDescription>
                        </div>
                        {project.galleryReady ? (
                          <Badge className="bg-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Shared
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            Ready
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {project.galleryCreatedAt && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          Created {new Date(project.galleryCreatedAt).toLocaleDateString()}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => window.open(project.galleryUrl, '_blank')}
                          data-testid={`button-open-gallery-${project.id}`}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open Gallery
                        </Button>
                        <Link href={`/projects/${project.id}`}>
                          <Button variant="default" size="sm" data-testid={`button-view-project-${project.id}`}>
                            View Project
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Projects Ready for Gallery */}
          {projectsReadyForGallery.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Ready for Gallery</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {projectsReadyForGallery.length} {projectsReadyForGallery.length === 1 ? 'project' : 'projects'} without galleries
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {projectsReadyForGallery.slice(0, 6).map((project: any) => (
                  <Card key={project.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{project.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {project.client?.firstName} {project.client?.lastName}
                          </p>
                        </div>
                        <Link href={`/projects/${project.id}`}>
                          <Button variant="outline" size="sm" data-testid={`button-create-gallery-${project.id}`}>
                            Create Gallery
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {projectsReadyForGallery.length > 6 && (
                <div className="mt-4 text-center">
                  <Link href="/projects">
                    <Button variant="ghost">
                      View all {projectsReadyForGallery.length} projects
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
