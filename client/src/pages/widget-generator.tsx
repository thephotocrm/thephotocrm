import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { projectTypeEnum } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Checkbox } from "@/components/ui/checkbox";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Code, Copy, Eye, Palette, Settings, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WidgetConfig {
  title: string;
  description: string;
  projectTypes: string[];
  showPhone: boolean;
  showMessage: boolean;
  showEventDate: boolean;
  primaryColor: string;
  backgroundColor: string;
  buttonText: string;
  successMessage: string;
  redirectUrl: string;
}

export default function WidgetGenerator() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<WidgetConfig>({
    title: "Get In Touch",
    description: "Let's discuss your photography needs",
    projectTypes: ["WEDDING", "ENGAGEMENT", "PORTRAIT"],
    showPhone: true,
    showMessage: true,
    showEventDate: true,
    primaryColor: "#3b82f6",
    backgroundColor: "#ffffff",
    buttonText: "Send Inquiry",
    successMessage: "Thank you! We'll be in touch soon.",
    redirectUrl: ""
  });

  const [activeTab, setActiveTab] = useState<"customize" | "preview" | "code">("customize");

  // Get photographer data for public token
  const { data: photographer } = useQuery({
    queryKey: ["/api/photographer"],
    enabled: !!user
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  // Prevent flash of protected content
  if (!loading && !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const updateConfig = (key: keyof WidgetConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleProjectType = (projectType: string) => {
    setConfig(prev => ({
      ...prev,
      projectTypes: prev.projectTypes.includes(projectType)
        ? prev.projectTypes.filter(pt => pt !== projectType)
        : [...prev.projectTypes, projectType]
    }));
  };

  const generateEmbedCode = () => {
    if (!photographer?.publicToken) {
      toast({
        title: "Error",
        description: "Public token not available. Please contact support.",
        variant: "destructive"
      });
      return "";
    }

    // Create lightweight embed code that uses hosted widget JavaScript
    const configJson = JSON.stringify(config).replace(/"/g, '&quot;');
    const baseUrl = window.location.origin; // Use current domain (works in dev and production)
    
    return `<!-- Photo CRM Lead Capture Widget -->
<div class="photo-crm-widget"></div>
<script 
  src="${baseUrl}/widget/embed.js" 
  data-photographer-token="${photographer.publicToken}"
  data-config="${configJson}"
  defer>
</script>`;
  };

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
        
        <div>
          <label className="block text-sm font-medium mb-1">Project Type *</label>
          <select className="w-full p-2 border rounded-md">
            {config.projectTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        
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

        {/* Communication Preferences */}
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <div className="flex items-start space-x-2">
            <input 
              type="checkbox" 
              defaultChecked 
              className="mt-1" 
              id="preview-communication"
            />
            <label htmlFor="preview-communication" className="text-sm text-gray-600 leading-tight">
              I agree to the privacy policy and agree to receive text, calls, or emails about my project
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2 leading-tight">
            Your contact information will only be used for photography services and communications. 
            We will never share your information with third parties. You can opt out at any time.
          </p>
        </div>
        
        <button 
          type="submit" 
          className="w-full py-3 px-4 rounded-md text-white font-semibold"
          style={{ backgroundColor: config.primaryColor }}
        >
          {config.buttonText}
        </button>
      </form>
    </div>
  );

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SidebarTrigger data-testid="button-menu-toggle" />
              <div>
                <h1 className="text-2xl font-semibold">Widget Generator</h1>
                <p className="text-muted-foreground">Create an embeddable lead capture form for your website</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-6 max-w-7xl mx-auto">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 p-1 bg-muted rounded-lg max-w-md">
            <button
              onClick={() => setActiveTab("customize")}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "customize" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-customize"
            >
              <Settings className="w-4 h-4" />
              <span>Customize</span>
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "preview" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-preview"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "code" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-code"
            >
              <Code className="w-4 h-4" />
              <span>Code</span>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "customize" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Configuration Panel */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Settings</CardTitle>
                    <CardDescription>
                      Customize the appearance and content of your widget
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">Widget Title</Label>
                      <Input
                        id="title"
                        value={config.title}
                        onChange={(e) => updateConfig("title", e.target.value)}
                        placeholder="Get In Touch"
                        data-testid="input-title"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={config.description}
                        onChange={(e) => updateConfig("description", e.target.value)}
                        placeholder="Let's discuss your photography needs"
                        data-testid="input-description"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="buttonText">Button Text</Label>
                      <Input
                        id="buttonText"
                        value={config.buttonText}
                        onChange={(e) => updateConfig("buttonText", e.target.value)}
                        placeholder="Send Inquiry"
                        data-testid="input-button-text"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="successMessage">Success Message</Label>
                      <Input
                        id="successMessage"
                        value={config.successMessage}
                        onChange={(e) => updateConfig("successMessage", e.target.value)}
                        placeholder="Thank you! We'll be in touch soon."
                        data-testid="input-success-message"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="redirectUrl">Redirect URL (Optional)</Label>
                      <Input
                        id="redirectUrl"
                        value={config.redirectUrl || ""}
                        onChange={(e) => updateConfig("redirectUrl", e.target.value)}
                        placeholder="https://yoursite.com/thank-you"
                        data-testid="input-redirect-url"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Colors</CardTitle>
                    <CardDescription>
                      Customize the color scheme to match your brand
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <Input
                        id="primaryColor"
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) => updateConfig("primaryColor", e.target.value)}
                        data-testid="input-primary-color"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="backgroundColor">Background Color</Label>
                      <Input
                        id="backgroundColor"
                        type="color"
                        value={config.backgroundColor}
                        onChange={(e) => updateConfig("backgroundColor", e.target.value)}
                        data-testid="input-background-color"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Form Fields</CardTitle>
                    <CardDescription>
                      Choose which fields to show in your form
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="showPhone"
                        checked={config.showPhone}
                        onChange={(e) => updateConfig("showPhone", e.target.checked)}
                        data-testid="checkbox-show-phone"
                      />
                      <Label htmlFor="showPhone">Show Phone Field</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="showEventDate"
                        checked={config.showEventDate}
                        onChange={(e) => updateConfig("showEventDate", e.target.checked)}
                        data-testid="checkbox-show-event-date"
                      />
                      <Label htmlFor="showEventDate">Show Event Date Field</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="showMessage"
                        checked={config.showMessage}
                        onChange={(e) => updateConfig("showMessage", e.target.checked)}
                        data-testid="checkbox-show-message"
                      />
                      <Label htmlFor="showMessage">Show Message Field</Label>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Project Types</CardTitle>
                    <CardDescription>
                      Select which project types to offer in your form
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {availableProjectTypes.map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`projectType-${type}`}
                            checked={config.projectTypes.includes(type)}
                            onChange={() => toggleProjectType(type)}
                            data-testid={`checkbox-project-type-${type.toLowerCase()}`}
                          />
                          <Label htmlFor={`projectType-${type}`}>
                            {type.charAt(0) + type.slice(1).toLowerCase()}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Preview Panel */}
              <div className="lg:sticky lg:top-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Preview</CardTitle>
                    <CardDescription>
                      See how your widget will look on your website
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderWidgetPreview()}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "preview" && (
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Widget Preview</CardTitle>
                  <CardDescription>
                    This is how your widget will appear on your website
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderWidgetPreview()}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "code" && (
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <div className="flex items-center space-x-2">
                          <Code className="w-5 h-5" />
                          <span>Embed Code</span>
                        </div>
                        <Button
                          onClick={() => copyToClipboard(generateEmbedCode())}
                          size="sm"
                          data-testid="button-copy-code"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Code
                        </Button>
                      </CardTitle>
                    </div>
                  </div>
                  <CardDescription>
                    Copy and paste this code into your website where you want the lead capture form to appear:
                  </CardDescription>
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
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
    var containers = document.querySelectorAll('.photo-crm-widget');
    containers.forEach(function(container, i) {
      if (container.getAttribute('data-photo-crm-initialized')) return;
      container.setAttribute('data-photo-crm-initialized', 'true');
      
      // Create widget container with validated colors
      var widget = document.createElement('div');
      widget.style.cssText = 'max-width: 400px; padding: 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
      widget.style.backgroundColor = validateColor(config.backgroundColor) || '#ffffff';
      widget.style.borderColor = validateColor(config.primaryColor) || '#3b82f6';
      widget.style.borderWidth = '1px';
      widget.style.borderStyle = 'solid';
      
      // Create header
      var header = document.createElement('div');
      header.style.cssText = 'text-align: center; margin-bottom: 24px;';
      
      var title = document.createElement('h3');
      title.style.cssText = 'font-size: 20px; font-weight: 600; margin-bottom: 8px;';
      title.style.color = validateColor(config.primaryColor) || '#3b82f6';
      title.textContent = config.title;
      
      var description = document.createElement('p');
      description.style.cssText = 'color: #666; margin: 0;';
      description.textContent = config.description;
      
      header.appendChild(title);
      header.appendChild(description);
      
      // Create form
      var form = document.createElement('form');
      form.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';
      form.id = 'photo-crm-form-' + i;
      
      // Create form HTML with escaped content
      var formHtml = 
        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">' +
          '<div>' +
            '<label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">First Name *</label>' +
            '<input type="text" name="firstName" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" />' +
          '</div>' +
          '<div>' +
            '<label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">Last Name *</label>' +
            '<input type="text" name="lastName" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" />' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">Email *</label>' +
          '<input type="email" name="email" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" />' +
        '</div>' +
        (config.showPhone ? '<div><label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">Phone</label><input type="tel" name="phone" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" /></div>' : '') +
        '<div>' +
          '<label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">Project Type *</label>' +
          '<select name="projectType" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">' +
            config.projectTypes.map(function(type) { return '<option value="' + escapeHtml(type) + '">' + escapeHtml(type.charAt(0) + type.slice(1).toLowerCase()) + '</option>'; }).join('') +
          '</select>' +
        '</div>' +
        (config.showEventDate ? '<div><label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">Event Date</label><input type="date" name="eventDate" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" /></div>' : '') +
        (config.showMessage ? '<div><label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">Message</label><textarea name="message" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; resize: vertical;" placeholder="Tell us about your photography needs..."></textarea></div>' : '') +
        '<div style="background-color: #f8f9fa; padding: 16px; border-radius: 4px; margin: 16px 0; border: 1px solid #e9ecef;">' +
          '<div style="margin-bottom: 12px;">' +
            '<label style="display: flex; align-items: center; cursor: pointer;">' +
              '<input type="checkbox" name="communicationOptIn" checked style="margin-right: 8px;" />' +
              '<span style="font-size: 13px; color: #555;">' +
                'I agree to the privacy policy and agree to receive text, calls, or emails about my project' +
              '</span>' +
            '</label>' +
          '</div>' +
          '<p style="margin: 8px 0 0 0; font-size: 11px; color: #6c757d; line-height: 1.3;">' +
            'Your contact information will only be used for photography services and communications. ' +
            'We will never share your information with third parties. You can opt out at any time.' +
          '</p>' +
        '</div>' +
        '<button type="submit" style="width: 100%; padding: 12px; border: none; border-radius: 4px; color: white; font-size: 16px; font-weight: 600; cursor: pointer;">' + escapeHtml(config.buttonText) + '</button>';
      
      form.innerHTML = formHtml;
      
      // Apply validated colors to button after creation
      var submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.style.backgroundColor = validateColor(config.primaryColor) || '#3b82f6';
      }
      
      // Assemble widget
      widget.appendChild(header);
      widget.appendChild(form);
      container.appendChild(widget);
      
      // Add form submission handler
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        var formData = new FormData(form);
        var data = {
          firstName: formData.get('firstName'),
          lastName: formData.get('lastName'),
          email: formData.get('email'),
          phone: formData.get('phone') || '',
          message: formData.get('message') || '',
          projectType: formData.get('projectType'),
          eventDate: formData.get('eventDate') || '',
          emailOptIn: formData.get('communicationOptIn') === 'on',
          smsOptIn: formData.get('communicationOptIn') === 'on',
          redirectUrl: config.redirectUrl || ''
        };
        
        // Validate redirect URL on client side for additional security
        if (data.redirectUrl && !(data.redirectUrl.match(/^https?:\\/\\//) || data.redirectUrl.match(/^\\//))) {
          data.redirectUrl = '';
        }
        if (data.redirectUrl && data.redirectUrl.match(/^(javascript:|data:|intent:|vbscript:|mailto:|tel:|ftp:)/i)) {
          data.redirectUrl = '';
        }
        
        // Show loading state
        var submitBtn = form.querySelector('button[type="submit"]');
        var originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
        
        // Submit form
        fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        })
        .then(function(response) {
          return response.json();
        })
        .then(function(result) {
          if (result.success) {
            // Create success UI safely without innerHTML injection
            var successContainer = document.createElement('div');
            successContainer.style.cssText = 'text-align: center; padding: 24px; border-radius: 8px; border: 1px solid #4ade80;';
            successContainer.style.backgroundColor = validateColor(config.backgroundColor) || '#ffffff';
            
            var successIcon = document.createElement('div');
            successIcon.style.cssText = 'color: #16a34a; font-weight: 600; margin-bottom: 8px;';
            successIcon.textContent = '✓ ' + config.successMessage;
            
            successContainer.appendChild(successIcon);
            
            // Handle successful submission
            if (result.redirectUrl && result.redirectUrl.trim() !== '') {
              var redirectText = document.createElement('div');
              redirectText.style.cssText = 'color: #666; font-size: 14px;';
              redirectText.textContent = 'Redirecting...';
              successContainer.appendChild(redirectText);
              
              container.innerHTML = '';
              container.appendChild(successContainer);
              
              setTimeout(function() {
                // Final validation before redirect for defense-in-depth
                if (result.redirectUrl && 
                    (result.redirectUrl.match(/^https?:\\/\\//) || result.redirectUrl.match(/^\\//)) &&
                    !result.redirectUrl.match(/^(javascript:|data:|intent:|vbscript:|mailto:|tel:|ftp:)/i)) {
                  window.location.href = result.redirectUrl;
                } else {
                  console.warn('Invalid redirect URL blocked:', result.redirectUrl);
                }
              }, 2000);
            } else {
              container.innerHTML = '';
              container.appendChild(successContainer);
            }
          } else {
            throw new Error(result.message || 'Submission failed');
          }
        })
        .catch(function(error) {
          console.error('Form submission error:', error);
          
          // Reset form and show error
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
          
          var errorDiv = document.createElement('div');
          errorDiv.style.cssText = 'background-color: #fef2f2; border: 1px solid #fca5a5; color: #dc2626; padding: 12px; border-radius: 4px; margin-top: 16px; font-size: 14px;';
          errorDiv.textContent = 'Sorry, there was an error submitting your request. Please try again.';
          
          // Remove any existing error messages
          var existingError = form.querySelector('.error-message');
          if (existingError) existingError.remove();
          
          errorDiv.className = 'error-message';
          form.appendChild(errorDiv);
        });
      });
    });
  }
  
  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
</script>`;
  };

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
        
        <div>
          <label className="block text-sm font-medium mb-1">Project Type *</label>
          <select className="w-full p-2 border rounded-md">
            {config.projectTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        
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

        {/* Communication Preferences */}
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <div className="flex items-start space-x-2">
            <input 
              type="checkbox" 
              defaultChecked 
              className="mt-1" 
              id="preview-communication"
            />
            <label htmlFor="preview-communication" className="text-sm text-gray-600 leading-tight">
              I agree to the privacy policy and agree to receive text, calls, or emails about my project
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2 leading-tight">
            Your contact information will only be used for photography services and communications. 
            We will never share your information with third parties. You can opt out at any time.
          </p>
        </div>
        
        <button 
          type="submit" 
          className="w-full py-3 px-4 rounded-md text-white font-semibold"
          style={{ backgroundColor: config.primaryColor }}
        >
          {config.buttonText}
        </button>
      </form>
    </div>
  );

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SidebarTrigger data-testid="button-menu-toggle" />
              <div>
                <h1 className="text-2xl font-semibold">Widget Generator</h1>
                <p className="text-muted-foreground">Create an embeddable lead capture form for your website</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-6 max-w-7xl mx-auto">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 p-1 bg-muted rounded-lg max-w-md">
            <button
              onClick={() => setActiveTab("customize")}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "customize" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-customize"
            >
              <Settings className="w-4 h-4" />
              <span>Customize</span>
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "preview" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-preview"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "code" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-code"
            >
              <Code className="w-4 h-4" />
              <span>Get Code</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Configuration or Code */}
            <div>
              {activeTab === "customize" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Palette className="w-5 h-5" />
                      <span>Widget Configuration</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Basic Settings */}
                    <div className="space-y-4">
                      <h3 className="font-semibold">Basic Settings</h3>
                      <div>
                        <Label htmlFor="title">Widget Title</Label>
                        <Input
                          id="title"
                          value={config.title}
                          onChange={(e) => updateConfig("title", e.target.value)}
                          data-testid="input-widget-title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={config.description}
                          onChange={(e) => updateConfig("description", e.target.value)}
                          data-testid="textarea-widget-description"
                        />
                      </div>
                      <div>
                        <Label htmlFor="buttonText">Button Text</Label>
                        <Input
                          id="buttonText"
                          value={config.buttonText}
                          onChange={(e) => updateConfig("buttonText", e.target.value)}
                          data-testid="input-button-text"
                        />
                      </div>
                      <div>
                        <Label htmlFor="successMessage">Success Message</Label>
                        <Input
                          id="successMessage"
                          value={config.successMessage}
                          onChange={(e) => updateConfig("successMessage", e.target.value)}
                          data-testid="input-success-message"
                        />
                      </div>
                      <div>
                        <Label htmlFor="redirectUrl">Success Redirect URL (Optional)</Label>
                        <Input
                          id="redirectUrl"
                          type="url"
                          value={config.redirectUrl}
                          onChange={(e) => updateConfig("redirectUrl", e.target.value)}
                          placeholder="https://example.com/thank-you"
                          data-testid="input-redirect-url"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Leave empty to show success message only. If provided, users will be redirected after successful submission.
                        </p>
                      </div>
                    </div>

                    {/* Project Types */}
                    <div className="space-y-4">
                      <h3 className="font-semibold">Available Project Types</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.keys(projectTypeEnum).map(type => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox
                              id={`project-${type}`}
                              checked={config.projectTypes.includes(type)}
                              onCheckedChange={() => toggleProjectType(type)}
                              data-testid={`checkbox-project-${type.toLowerCase()}`}
                            />
                            <Label htmlFor={`project-${type}`} className="text-sm">
                              {type.charAt(0) + type.slice(1).toLowerCase()}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                      <h3 className="font-semibold">Form Fields</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="showPhone">Show Phone Field</Label>
                          <Switch
                            id="showPhone"
                            checked={config.showPhone}
                            onCheckedChange={(checked) => updateConfig("showPhone", checked)}
                            data-testid="switch-show-phone"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="showMessage">Show Message Field</Label>
                          <Switch
                            id="showMessage"
                            checked={config.showMessage}
                            onCheckedChange={(checked) => updateConfig("showMessage", checked)}
                            data-testid="switch-show-message"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="showEventDate">Show Event Date Field</Label>
                          <Switch
                            id="showEventDate"
                            checked={config.showEventDate}
                            onCheckedChange={(checked) => updateConfig("showEventDate", checked)}
                            data-testid="switch-show-event-date"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Styling */}
                    <div className="space-y-4">
                      <h3 className="font-semibold">Styling</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="primaryColor">Primary Color</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="primaryColor"
                              type="color"
                              value={config.primaryColor}
                              onChange={(e) => updateConfig("primaryColor", e.target.value)}
                              className="w-12 h-10"
                              data-testid="input-primary-color"
                            />
                            <Input
                              value={config.primaryColor}
                              onChange={(e) => updateConfig("primaryColor", e.target.value)}
                              placeholder="#3b82f6"
                              data-testid="input-primary-color-hex"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="backgroundColor">Background Color</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="backgroundColor"
                              type="color"
                              value={config.backgroundColor}
                              onChange={(e) => updateConfig("backgroundColor", e.target.value)}
                              className="w-12 h-10"
                              data-testid="input-bg-color"
                            />
                            <Input
                              value={config.backgroundColor}
                              onChange={(e) => updateConfig("backgroundColor", e.target.value)}
                              placeholder="#ffffff"
                              data-testid="input-bg-color-hex"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "code" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Code className="w-5 h-5" />
                        <span>Embed Code</span>
                      </div>
                      <Button
                        onClick={() => copyToClipboard(generateEmbedCode())}
                        size="sm"
                        data-testid="button-copy-code"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Code
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Copy and paste this code into your website where you want the lead capture form to appear:
                      </p>
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                          <code>{generateEmbedCode()}</code>
                        </pre>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                          Installation Instructions:
                        </h4>
                        <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                          <li>Copy the embed code above</li>
                          <li>Paste it into your website's HTML where you want the form to appear</li>
                          <li>The widget will automatically load and display your customized form</li>
                          <li>Submissions will appear as new leads in your dashboard</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Preview */}
            {(activeTab === "customize" || activeTab === "preview") && (
              <div>
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
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}