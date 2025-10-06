import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Construction } from "lucide-react";
import type { SmartFileWithPages } from "@shared/schema";

export default function SmartFileBuilder() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data: smartFile, isLoading } = useQuery<SmartFileWithPages>({
    queryKey: ["/api/smart-files", id],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" data-testid="loading-spinner" />
      </div>
    );
  }

  if (!smartFile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Smart File not found</h2>
          <Button onClick={() => setLocation("/smart-files")} data-testid="button-back-to-list">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Smart Files
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="bg-card border-b border-border px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SidebarTrigger 
              data-testid="button-menu-toggle" 
              className="hidden md:inline-flex" 
            />
            <div>
              <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-smart-file-name">
                {smartFile.name}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                {smartFile.projectType || "Universal"} • {smartFile.pages?.length || 0} pages
              </p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => setLocation("/smart-files")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Smart Files
          </Button>
        </div>
      </header>

      <div className="p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Construction className="w-5 h-5" />
              <span>Builder Coming Soon</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground" data-testid="text-coming-soon">
              The drag-and-drop builder is coming soon! You'll be able to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Add and arrange pages with drag-and-drop</li>
              <li>Create package selection pages</li>
              <li>Add custom text and media content</li>
              <li>Configure add-on options</li>
              <li>Set up payment processing</li>
              <li>Preview the client experience</li>
            </ul>
            <div className="pt-4">
              <Button 
                onClick={() => setLocation("/smart-files")}
                data-testid="button-back-to-list"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Smart Files
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
