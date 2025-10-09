import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, ArrowLeft, Save, Plus, Trash2, GripVertical, Code2, Type, Mail, Phone as PhoneIcon, Calendar, MessageSquare, CheckSquare, List } from "lucide-react";
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
  ] as CustomField[],
};

const FIELD_TYPES = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'phone', label: 'Phone', icon: PhoneIcon },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'textarea', label: 'Textarea', icon: MessageSquare },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'select', label: 'Dropdown', icon: List },
] as const;

export default function LeadFormBuilder() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [embedModalOpen, setEmbedModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  
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

  const generateEmbedCode = () => {
    const protocol = window.location.protocol;
    const host = window.location.host;
    const baseUrl = `${protocol}//${host}`;
    
    return `<div id="lazy-photog-form-${form?.publicToken}"></div>
<script src="${baseUrl}/form-embed.js" data-form-token="${form?.publicToken}"></script>`;
  };

  const addField = (type: CustomField['type']) => {
    const fieldLabels = {
      text: 'Text Field',
      email: 'Email',
      phone: 'Phone Number',
      date: 'Date',
      textarea: 'Message',
      checkbox: 'Checkbox',
      select: 'Dropdown'
    };

    const newField: CustomField = {
      id: `field-${Date.now()}`,
      type,
      label: fieldLabels[type],
      placeholder: '',
      required: false,
      options: type === 'select' || type === 'checkbox' ? ['Option 1', 'Option 2'] : undefined,
      isSystem: false
    };

    setConfig(prev => ({
      ...prev,
      customFields: [...prev.customFields, newField]
    }));
  };

  const updateField = (fieldId: string, updates: Partial<CustomField>) => {
    setConfig(prev => ({
      ...prev,
      customFields: prev.customFields.map(f => 
        f.id === fieldId ? { ...f, ...updates } : f
      )
    }));
  };

  const removeField = (fieldId: string) => {
    setConfig(prev => ({
      ...prev,
      customFields: prev.customFields.filter(f => f.id !== fieldId)
    }));
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const index = config.customFields.findIndex(f => f.id === fieldId);
    if (
      (direction === 'up' && index <= 0) || 
      (direction === 'down' && index >= config.customFields.length - 1)
    ) return;

    const newFields = [...config.customFields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];

    setConfig(prev => ({ ...prev, customFields: newFields }));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!form) {
    return <div className="flex items-center justify-center min-h-screen">Form not found.</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 flex-shrink-0">
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
              <p className="text-muted-foreground text-sm">Build your form visually</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={embedModalOpen} onOpenChange={setEmbedModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-embed">
                  <Code2 className="w-4 h-4 mr-2" />
                  Get Embed Code
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Code2 className="w-5 h-5" />
                    Embed Code
                  </DialogTitle>
                  <DialogDescription>
                    Copy and paste this code into your website where you want the lead capture form to appear
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                      <code>{generateEmbedCode()}</code>
                    </pre>
                    <Button
                      data-testid="button-copy-embed"
                      onClick={() => copyToClipboard(generateEmbedCode())}
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md border border-blue-200 dark:border-blue-800">
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
                </div>
              </DialogContent>
            </Dialog>

            <Button
              onClick={() => saveConfigMutation.mutate()}
              disabled={saveConfigMutation.isPending}
              data-testid="button-save-config"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveConfigMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Field Palette & Controls */}
        <div className="w-80 border-r border-border bg-muted/30 p-6 overflow-y-auto flex-shrink-0">
          {/* Styling Controls */}
          <div className="space-y-6 mb-8">
            <div>
              <h3 className="text-sm font-semibold mb-4">Form Settings</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Form Title</Label>
                  <Input
                    value={config.title}
                    onChange={(e) => setConfig({ ...config, title: e.target.value })}
                    data-testid="input-form-title"
                  />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={config.description}
                    onChange={(e) => setConfig({ ...config, description: e.target.value })}
                    rows={2}
                    data-testid="input-form-description"
                  />
                </div>
                <div>
                  <Label className="text-xs">Submit Button Text</Label>
                  <Input
                    value={config.buttonText}
                    onChange={(e) => setConfig({ ...config, buttonText: e.target.value })}
                    data-testid="input-button-text"
                  />
                </div>
                <div>
                  <Label className="text-xs">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                      className="w-16 h-10"
                      data-testid="input-primary-color"
                    />
                    <Input
                      value={config.primaryColor}
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                      placeholder="#3b82f6"
                      data-testid="input-primary-color-hex"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Redirect URL (optional)</Label>
                  <Input
                    value={config.redirectUrl || ''}
                    onChange={(e) => setConfig({ ...config, redirectUrl: e.target.value })}
                    placeholder="https://yoursite.com/thank-you"
                    data-testid="input-redirect-url"
                  />
                </div>
                <div>
                  <Label className="text-xs">Project Type</Label>
                  <Select
                    value={form.projectType}
                    onValueChange={async (value) => {
                      try {
                        await apiRequest("PATCH", `/api/lead-forms/${id}`, { projectType: value });
                        queryClient.invalidateQueries({ queryKey: ['/api/lead-forms', id] });
                        queryClient.invalidateQueries({ queryKey: ['/api/lead-forms'] });
                        toast({
                          title: "Project type updated",
                          description: "Form project type has been updated successfully.",
                        });
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to update project type",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-project-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEDDING">Wedding</SelectItem>
                      <SelectItem value="PORTRAIT">Portrait</SelectItem>
                      <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Field Palette */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Add Fields</h3>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  onClick={() => addField(type)}
                  className="justify-start gap-2"
                  data-testid={`button-add-${type}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Canvas - Live Preview */}
        <div className="flex-1 p-8 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-xl">
              <CardHeader style={{ backgroundColor: config.backgroundColor }}>
                <CardTitle className="text-2xl" style={{ color: config.primaryColor }}>
                  {config.title}
                </CardTitle>
                {config.description && (
                  <p className="text-muted-foreground mt-2">{config.description}</p>
                )}
              </CardHeader>
              <CardContent className="p-6 space-y-4" style={{ backgroundColor: config.backgroundColor }}>
                {config.customFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="group relative border-2 border-dashed border-transparent hover:border-primary/50 rounded-lg p-4 transition-all"
                    onClick={() => setEditingField(editingField === field.id ? null : field.id)}
                  >
                    {/* Field Controls */}
                    {!field.isSystem && (
                      <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveField(field.id, 'up');
                          }}
                          disabled={index === 0}
                          data-testid={`button-move-up-${field.id}`}
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveField(field.id, 'down');
                          }}
                          disabled={index === config.customFields.length - 1}
                          data-testid={`button-move-down-${field.id}`}
                        >
                          ↓
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeField(field.id);
                          }}
                          data-testid={`button-remove-${field.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {/* Editing Mode */}
                    {editingField === field.id ? (
                      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <Label className="text-xs">Label</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            data-testid={`input-edit-label-${field.id}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Placeholder</Label>
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                            data-testid={`input-edit-placeholder-${field.id}`}
                          />
                        </div>
                        {(field.type === 'select' || field.type === 'checkbox') && (
                          <div>
                            <Label className="text-xs">Options (comma-separated)</Label>
                            <Input
                              value={(field.options || []).join(', ')}
                              onChange={(e) => updateField(field.id, { 
                                options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                              })}
                              data-testid={`input-edit-options-${field.id}`}
                            />
                          </div>
                        )}
                        {!field.isSystem && (
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(field.id, { required: e.target.checked })}
                              className="rounded"
                              data-testid={`checkbox-edit-required-${field.id}`}
                            />
                            <Label className="text-xs">Required</Label>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Display Mode */
                      <div>
                        <Label className="flex items-center gap-2">
                          {field.label}
                          {field.required && <span className="text-destructive">*</span>}
                          {field.isSystem && <Badge variant="secondary" className="text-xs">Required</Badge>}
                        </Label>
                        {field.type === 'textarea' ? (
                          <Textarea
                            placeholder={field.placeholder}
                            className="mt-2"
                            disabled
                          />
                        ) : field.type === 'select' ? (
                          <Select disabled>
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder={field.placeholder || 'Select an option'} />
                            </SelectTrigger>
                          </Select>
                        ) : field.type === 'checkbox' ? (
                          <div className="mt-2 space-y-2">
                            {field.options?.map((opt, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <input type="checkbox" disabled className="rounded" />
                                <span className="text-sm">{opt}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Input
                            type={field.type}
                            placeholder={field.placeholder}
                            className="mt-2"
                            disabled
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  className="w-full mt-6"
                  style={{ backgroundColor: config.primaryColor }}
                  disabled
                  data-testid="preview-submit-button"
                >
                  {config.buttonText}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
