import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Copy, Settings, Eye, Code2, Smartphone, ArrowLeft, Save, Plus, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type LeadForm = {
  id: string;
  photographerId: string;
  name: string;
  description: string | null;
  publicToken: string;
  projectType: string;
  config: any;
  status: string;
  submissionCount: number;
  createdAt: Date;
  updatedAt: Date;
};

type CustomField = {
  id: string;
  type: 'text' | 'textarea' | 'phone' | 'date' | 'email' | 'checkbox' | 'select';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select/checkbox
  isSystem?: boolean; // true for firstName, email (cannot be removed)
};

const defaultConfig = {
  title: "Get In Touch",
  description: "Let's discuss your photography needs",
  primaryColor: "#3b82f6",
  backgroundColor: "#ffffff",
  buttonText: "Send Inquiry",
  successMessage: "Thank you! We'll be in touch soon.",
  redirectUrl: "",
  customFields: [
    { id: 'firstName', type: 'text' as const, label: 'First Name', placeholder: 'John', required: true, isSystem: true },
    { id: 'email', type: 'email' as const, label: 'Email', placeholder: 'john@example.com', required: true, isSystem: true },
    { id: 'phone', type: 'phone' as const, label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: false, isSystem: false },
    { id: 'eventDate', type: 'date' as const, label: 'Event Date', required: false, isSystem: false },
    { id: 'message', type: 'textarea' as const, label: 'Message', placeholder: 'Tell us about your photography needs...', required: false, isSystem: false }
  ] as CustomField[],
  showPhone: true,
  showMessage: true,
  showEventDate: true
};

export default function LeadFormBuilder() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("setup");
  const [noDateYet, setNoDateYet] = useState(false);
  const [eventDate, setEventDate] = useState("");
  
  const [config, setConfig] = useState(defaultConfig);

  const { data: form, isLoading } = useQuery<LeadForm>({
    queryKey: ['/api/lead-forms', id],
    queryFn: async () => {
      const response = await fetch(`/api/lead-forms/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch form');
      return response.json();
    },
    enabled: !!id
  });

  // Load config from form data when form is loaded
  useEffect(() => {
    if (form && form.config) {
      setConfig({ ...defaultConfig, ...form.config });
    }
  }, [form]);

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/lead-forms/${id}`, { config });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lead-forms', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/lead-forms'] });
      toast({
        title: "Configuration saved",
        description: "Form configuration has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive"
      });
    }
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

  const addCustomField = () => {
    const newField: CustomField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      placeholder: '',
      required: false,
      isSystem: false
    };
    setConfig({
      ...config,
      customFields: [...(config.customFields || []), newField]
    });
  };

  const removeCustomField = (fieldId: string) => {
    setConfig({
      ...config,
      customFields: (config.customFields || []).filter((f: CustomField) => f.id !== fieldId)
    });
  };

  const updateCustomField = (fieldId: string, updates: Partial<CustomField>) => {
    setConfig({
      ...config,
      customFields: (config.customFields || []).map((f: CustomField) => 
        f.id === fieldId ? { ...f, ...updates } : f
      )
    });
  };

  const generateEmbedCode = () => {
    if (!form?.publicToken) return "";
    
    const baseUrl = window.location.origin;
    return `<!-- Lead Capture Form -->
<div class="photo-crm-form" data-form-token="${form.publicToken}"></div>
<script src="${baseUrl}/widget/form-embed.js"></script>`;
  };

  const getFormUrl = () => {
    if (!form?.publicToken) return "";
    return `${window.location.origin}/form/${form.publicToken}`;
  };

  const renderFieldPreview = (field: CustomField) => {
    const isRequired = field.required ? ' *' : '';
    
    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium mb-1">{field.label}{isRequired}</label>
            <textarea 
              className="w-full p-2 border rounded-md" 
              rows={3}
              placeholder={field.placeholder || ''}
            />
          </div>
        );
      
      case 'select':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium mb-1">{field.label}{isRequired}</label>
            <select className="w-full p-2 border rounded-md">
              <option value="">Select an option</option>
              {(field.options || []).map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        );
      
      case 'checkbox':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium mb-2">{field.label}{isRequired}</label>
            <div className="space-y-2">
              {(field.options || []).map((opt, i) => (
                <label key={i} className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        );
      
      default:
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium mb-1">{field.label}{isRequired}</label>
            <input 
              type={field.type === 'phone' ? 'tel' : field.type}
              className="w-full p-2 border rounded-md" 
              placeholder={field.placeholder || ''}
            />
          </div>
        );
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
          {(config.customFields || []).map((field: CustomField) => renderFieldPreview(field))}
        
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

  if (!form) {
    return <div className="flex items-center justify-center min-h-screen">Form not found.</div>;
  }

  return (
    <div>
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/lead-forms')}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Forms
              </Button>
              <div>
                <h1 className="text-2xl font-semibold">{form.name}</h1>
                <p className="text-muted-foreground">Configure your form's appearance and behavior</p>
              </div>
            </div>
            <Button
              onClick={() => saveConfigMutation.mutate()}
              disabled={saveConfigMutation.isPending}
              data-testid="button-save-config"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </Button>
            </div>
        </header>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex flex-col md:grid md:grid-cols-3 w-full gap-1 md:gap-0 h-auto md:h-10">
              <TabsTrigger value="setup" data-testid="tab-setup" className="flex items-center gap-2 justify-start w-full md:justify-center">
                <Settings className="w-4 h-4" />
                Setup & Configure
              </TabsTrigger>
              <TabsTrigger value="customize" data-testid="tab-customize" className="flex items-center gap-2 justify-start w-full md:justify-center">
                <Eye className="w-4 h-4" />
                Customize & Preview
              </TabsTrigger>
              <TabsTrigger value="embed" data-testid="tab-embed" className="flex items-center gap-2 justify-start w-full md:justify-center">
                <Code2 className="w-4 h-4" />
                Get Embed Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-6">
              {/* Setup Tab */}
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

                    <div>
                      <Label htmlFor="redirectUrl">Redirect URL (Optional)</Label>
                      <Input
                        id="redirectUrl"
                        data-testid="input-redirect-url"
                        type="url"
                        value={config.redirectUrl || ''}
                        onChange={(e) => setConfig({...config, redirectUrl: e.target.value})}
                        placeholder="https://yoursite.com/thank-you"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        After form submission, redirect to this URL. Leave blank to show success message.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Form Fields Management */}
                <Card>
                  <CardHeader>
                    <CardTitle>Form Fields</CardTitle>
                    <CardDescription>
                      Customize which fields appear in your form. First Name and Email are required and cannot be removed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(config.customFields || []).map((field: CustomField) => (
                      <div key={field.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <GripVertical className="w-5 h-5 text-muted-foreground mt-2" />
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Input
                                  value={field.label}
                                  onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                                  placeholder="Field Label"
                                  className="w-48"
                                  disabled={field.isSystem}
                                  data-testid={`input-field-label-${field.id}`}
                                />
                                {field.isSystem && (
                                  <Badge variant="secondary" className="text-xs">Required</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {!field.isSystem && (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs">Required</Label>
                                      <Switch
                                        checked={field.required}
                                        onCheckedChange={(checked) => updateCustomField(field.id, { required: checked })}
                                        data-testid={`switch-required-${field.id}`}
                                      />
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeCustomField(field.id)}
                                      data-testid={`button-remove-field-${field.id}`}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Field Type</Label>
                                <Select
                                  value={field.type}
                                  onValueChange={(value) => updateCustomField(field.id, { type: value as CustomField['type'] })}
                                  disabled={field.isSystem}
                                >
                                  <SelectTrigger data-testid={`select-field-type-${field.id}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="phone">Phone</SelectItem>
                                    <SelectItem value="textarea">Textarea</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="select">Dropdown</SelectItem>
                                    <SelectItem value="checkbox">Checkbox</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Placeholder</Label>
                                <Input
                                  value={field.placeholder || ''}
                                  onChange={(e) => updateCustomField(field.id, { placeholder: e.target.value })}
                                  placeholder="Enter placeholder text..."
                                  className="text-sm"
                                  data-testid={`input-field-placeholder-${field.id}`}
                                />
                              </div>
                            </div>

                            {(field.type === 'select' || field.type === 'checkbox') && (
                              <div>
                                <Label className="text-xs">Options (comma-separated)</Label>
                                <Input
                                  value={(field.options || []).join(', ')}
                                  onChange={(e) => updateCustomField(field.id, { 
                                    options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                                  })}
                                  placeholder="Option 1, Option 2, Option 3"
                                  className="text-sm"
                                  data-testid={`input-field-options-${field.id}`}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <Button
                      variant="outline"
                      onClick={addCustomField}
                      className="w-full"
                      data-testid="button-add-field"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Custom Field
                    </Button>
                  </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="embed" className="space-y-6">
              {/* Embed Tab */}
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
            </TabsContent>

            <TabsContent value="customize" className="space-y-6">
              {/* Preview */}
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
            </TabsContent>
          </Tabs>
        </div>
    </div>
  );
}