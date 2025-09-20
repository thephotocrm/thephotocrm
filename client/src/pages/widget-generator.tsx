import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Settings, Eye, Code2, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

interface Photographer {
  id: string;
  businessName: string;
  publicToken: string;
  brandPrimary?: string;
}

export default function WidgetGenerator() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("setup");
  
  const [config, setConfig] = useState({
    title: "Get In Touch",
    description: "Let's discuss your photography needs",
    primaryColor: "#3b82f6",
    backgroundColor: "#ffffff",
    buttonText: "Send Inquiry",
    successMessage: "Thank you! We'll be in touch soon.",
    showPhone: true,
    showMessage: true,
    showEventDate: true,
    projectTypes: ["WEDDING", "ENGAGEMENT", "PORTRAIT"]
  });

  const { data: photographer, isLoading } = useQuery<Photographer>({
    queryKey: ['/api/photographer']
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Embed code copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const generateEmbedCode = () => {
    if (!photographer?.publicToken) return "";
    
    const baseUrl = window.location.origin;
    return `<!-- Photographer Widget -->
<div class="photo-crm-widget" data-photographer-token="${photographer.publicToken}"></div>
<script src="${baseUrl}/widget/embed.js"></script>`;
  };

  const renderWidgetPreview = () => (
    <div 
      className="max-w-md mx-auto p-6 rounded-lg shadow-lg border"
      style={{ 
        backgroundColor: config.backgroundColor,
        borderColor: config.primaryColor + "33"
      }}
    >
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-2" style={{ color: config.primaryColor }}>
          {config.title}
        </h3>
        <p className="text-gray-600">{config.description}</p>
      </div>
      
      <form className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name *</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-md" 
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name *</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-md" 
              placeholder="Doe"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Email *</label>
          <input 
            type="email" 
            className="w-full p-2 border rounded-md" 
            placeholder="john@example.com"
          />
        </div>
        
        {config.showPhone && (
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input 
              type="tel" 
              className="w-full p-2 border rounded-md" 
              placeholder="(555) 123-4567"
            />
          </div>
        )}
        
        {config.showEventDate && (
          <div>
            <label className="block text-sm font-medium mb-1">Event Date</label>
            <input 
              type="date" 
              className="w-full p-2 border rounded-md"
            />
          </div>
        )}
        
        {config.showMessage && (
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea 
              className="w-full p-2 border rounded-md" 
              rows={3}
              placeholder="Tell us about your photography needs..."
            />
          </div>
        )}
        
        <button 
          type="submit" 
          className="w-full py-3 px-4 text-white rounded-md font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: config.primaryColor }}
        >
          {config.buttonText}
        </button>
      </form>
    </div>
  );

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!photographer) {
    return <div className="flex items-center justify-center min-h-screen">Please log in to access the widget generator.</div>;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <h2 className="text-lg font-semibold">Widget Generator</h2>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                data-testid="tab-setup"
                onClick={() => setActiveTab("setup")} 
                isActive={activeTab === "setup"}
              >
                <Settings className="w-4 h-4" />
                Setup & Configure
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                data-testid="tab-customize"
                onClick={() => setActiveTab("customize")} 
                isActive={activeTab === "customize"}
              >
                <Eye className="w-4 h-4" />
                Customize & Preview
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                data-testid="tab-embed"
                onClick={() => setActiveTab("embed")} 
                isActive={activeTab === "embed"}
              >
                <Code2 className="w-4 h-4" />
                Get Embed Code
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <div className="flex-1 space-y-6 p-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Widget Generator</h1>
            <p className="text-muted-foreground">
              Create and customize lead capture widgets for your website.
            </p>
          </div>

          <div className="grid gap-6">
            {/* Setup Tab */}
            {activeTab === "setup" && (
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Widget Configuration</CardTitle>
                    <CardDescription>
                      Configure your widget settings and appearance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="title">Widget Title</Label>
                        <Input
                          id="title"
                          data-testid="input-title"
                          value={config.title}
                          onChange={(e) => setConfig({...config, title: e.target.value})}
                          placeholder="Get In Touch"
                        />
                      </div>
                      <div>
                        <Label htmlFor="buttonText">Button Text</Label>
                        <Input
                          id="buttonText"
                          data-testid="input-button-text"
                          value={config.buttonText}
                          onChange={(e) => setConfig({...config, buttonText: e.target.value})}
                          placeholder="Send Inquiry"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        data-testid="input-description"
                        value={config.description}
                        onChange={(e) => setConfig({...config, description: e.target.value})}
                        placeholder="Let's discuss your photography needs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="primaryColor">Primary Color</Label>
                        <Input
                          id="primaryColor"
                          data-testid="input-primary-color"
                          type="color"
                          value={config.primaryColor}
                          onChange={(e) => setConfig({...config, primaryColor: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="backgroundColor">Background Color</Label>
                        <Input
                          id="backgroundColor"
                          data-testid="input-background-color"
                          type="color"
                          value={config.backgroundColor}
                          onChange={(e) => setConfig({...config, backgroundColor: e.target.value})}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Embed Tab */}
            {activeTab === "embed" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Code2 className="w-5 h-5" />
                        <span>Embed Code</span>
                      </CardTitle>
                      <CardDescription>
                        Copy and paste this code into your website where you want the lead capture form to appear:
                      </CardDescription>
                    </div>
                    <Button
                      data-testid="button-copy-embed"
                      onClick={() => copyToClipboard(generateEmbedCode())}
                      size="sm"
                      variant="outline"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Code
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                      <code>{generateEmbedCode()}</code>
                    </pre>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md border border-blue-200 dark:border-blue-800 mt-4">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Installation Instructions:
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
                      <li>Copy the embed code above</li>
                      <li>Paste it into your website's HTML where you want the form to appear</li>
                      <li>The form will automatically load and be ready to receive inquiries</li>
                      <li>All submissions will appear in your CRM dashboard</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Preview */}
            {(activeTab === "customize" || activeTab === "preview") && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Smartphone className="w-5 h-5" />
                    <span>Live Preview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                    {renderWidgetPreview()}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}