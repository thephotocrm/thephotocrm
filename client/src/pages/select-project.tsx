import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  ArrowRight,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

interface Project {
  id: string;
  title: string;
  projectType: string;
  status: string;
  eventDate?: string;
  role: 'PRIMARY' | 'PARTICIPANT';
  stage?: {
    name: string;
  };
  primaryClient: {
    firstName: string;
    lastName: string;
  };
}

interface ProjectsResponse {
  projects: Project[];
}

export default function SelectProject() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch client's projects
  const { data, isLoading } = useQuery<ProjectsResponse>({
    queryKey: ["/api/client-portal/projects"],
    enabled: !!user
  });

  if (!loading && !user) {
    setLocation("/login");
    return null;
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" data-testid="loader-projects" />
      </div>
    );
  }

  const projects = data?.projects || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="heading-select-project">
            Select a Project
          </h1>
          <p className="text-gray-600">
            Choose which project you'd like to view
          </p>
        </div>

        {projects.length === 0 ? (
          <Card data-testid="card-no-projects">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">You don't have any active projects yet.</p>
                <p className="text-sm text-gray-500">
                  Your photographer will create a project for you soon.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2" data-testid="grid-projects">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => setLocation(`/client-portal/projects/${project.id}`)}
                data-testid={`card-project-${project.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2 group-hover:text-blue-600 transition-colors">
                        {project.title}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {project.projectType}
                        </Badge>
                        {project.stage && (
                          <Badge variant="secondary" className="text-xs">
                            {project.stage.name}
                          </Badge>
                        )}
                        {project.role === 'PARTICIPANT' && (
                          <Badge variant="outline" className="text-xs bg-purple-50">
                            Participant
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {project.eventDate && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        {format(new Date(project.eventDate), 'MMMM d, yyyy')}
                      </div>
                    )}
                    {project.role === 'PARTICIPANT' && (
                      <div className="text-sm text-gray-600">
                        Primary: {project.primaryClient.firstName} {project.primaryClient.lastName}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => setLocation("/client-portal")}
            data-testid="button-back-to-portal"
          >
            Back to Portal Home
          </Button>
        </div>
      </div>
    </div>
  );
}
