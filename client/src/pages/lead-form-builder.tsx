import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Copy, ArrowLeft, Save, Plus, Trash2, Code2, Type, Mail, Phone as PhoneIcon, Calendar, MessageSquare, CheckSquare, List, Eye, ArrowUp, ArrowDown, Palette, Pencil, X } from "lucide-react";
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
  width?: 'full' | 'half'; // column width: full = 1 column, half = 2 columns
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
    { id: 'firstName', type: 'text' as const, label: 'First Name', placeholder: 'John', required: true, isSystem: true, width: 'full' as const },
    { id: 'email', type: 'email' as const, label: 'Email', placeholder: 'john@example.com', required: true, isSystem: true, width: 'full' as const },
  ] as CustomField[],
};

const FIELD_TYPES = [
  { type: 'text', label: 'Text Field', icon: Type },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'phone', label: 'Phone', icon: PhoneIcon },
  { type: 'date', label: 'Event Date', icon: Calendar },
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
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
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
    
    return `<!-- Lead Capture Form -->
<div class="photo-crm-form" data-form-token="${form?.publicToken}"></div>
<script src="${baseUrl}/widget/form-embed.js"></script>`;
  };

  const addField = (type: CustomField['type']) => {
    const fieldLabels = {
      text: 'Text Field',
      email: 'Email',
      phone: 'Phone Number',
      date: 'Event Date',
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
      isSystem: false,
      width: 'full'
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

  // Helper to render a field
  const renderField = (field: CustomField, disabled = false) => {
    return (
      <>
        <Label className="flex items-center gap-2">
          {field.label}
          {field.required && <span className="text-destructive">*</span>}
        </Label>
        {field.type === 'textarea' ? (
          <Textarea
            placeholder={field.placeholder}
            className="mt-2"
            disabled={disabled}
          />
        ) : field.type === 'select' ? (
          <Select disabled={disabled}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            {!disabled && (
              <SelectContent>
                {field.options?.map((opt, i) => (
                  <SelectItem key={i} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            )}
          </Select>
        ) : field.type === 'checkbox' ? (
          <div className="mt-2 space-y-2">
            {field.options?.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="checkbox" disabled={disabled} className="rounded" />
                <span className="text-sm">{opt}</span>
              </div>
            ))}
          </div>
        ) : (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            className="mt-2"
            disabled={disabled}
          />
        )}
      </>
    );
  };

  // Helper to group fields by rows based on width
  const groupFieldsIntoRows = (fields: CustomField[]) => {
    const rows: CustomField[][] = [];
    let currentRow: CustomField[] = [];

    fields.forEach(field => {
      const width = field.width || 'full';
      
      if (width === 'full') {
        if (currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
        }
        rows.push([field]);
      } else {
        // Half width field
        currentRow.push(field);
        if (currentRow.length === 2) {
          rows.push(currentRow);
          currentRow = [];
        }
      }
    });

    // Push any remaining half-width field (will be alone in its row)
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  };

  const renderCleanPreview = () => {
    const rows = groupFieldsIntoRows(config.customFields);

    return (
      <Card className="shadow-xl max-w-2xl mx-auto">
        <CardHeader style={{ backgroundColor: config.backgroundColor }} className="text-center">
          <h2 className="text-2xl font-bold" style={{ color: config.primaryColor }}>
            {config.title}
          </h2>
          {config.description && (
            <p className="text-muted-foreground mt-2">{config.description}</p>
          )}
        </CardHeader>
        <CardContent className="p-6 space-y-4" style={{ backgroundColor: config.backgroundColor }}>
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className={row.length === 2 ? "grid grid-cols-2 gap-4" : ""}>
              {row.map((field) => (
                <div key={field.id}>
                  {renderField(field, false)}
                </div>
              ))}
            </div>
          ))}

          <Button
            className="w-full mt-6"
            style={{ backgroundColor: config.primaryColor }}
            disabled
          >
            {config.buttonText}
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!form) {
    return <div className="flex items-center justify-center min-h-screen">Form not found.</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
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
              Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{form.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-preview">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Form Preview</DialogTitle>
                  <DialogDescription>
                    This is how your form will appear to visitors
                  </DialogDescription>
                </DialogHeader>
                <div className="py-6">
                  {renderCleanPreview()}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={embedModalOpen} onOpenChange={setEmbedModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-embed">
                  <Code2 className="w-4 h-4 mr-2" />
                  Embed Code
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Code2 className="w-5 h-5" />
                    Embed Code
                  </DialogTitle>
                  <DialogDescription>
                    Copy and paste this code into your website
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-md text-xs whitespace-pre-wrap break-all pr-24">
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
                </div>
              </DialogContent>
            </Dialog>

            <Button
              onClick={() => saveConfigMutation.mutate()}
              disabled={saveConfigMutation.isPending}
              data-testid="button-save-config"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveConfigMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      {/* Settings Bar */}
      <div className="bg-card border-b border-border px-6 py-4 flex-shrink-0">
        <div className="space-y-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm">Color</Label>
              <Input
                type="color"
                value={config.primaryColor}
                onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                className="w-20 h-9"
                data-testid="input-primary-color"
              />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Label className="text-sm">Title</Label>
              <Input
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                className="max-w-sm"
                data-testid="input-form-title"
              />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Label className="text-sm">Button</Label>
              <Input
                value={config.buttonText}
                onChange={(e) => setConfig({ ...config, buttonText: e.target.value })}
                className="max-w-xs"
                data-testid="input-button-text"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Description</Label>
            <Input
              value={config.description}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              placeholder="Optional form description..."
              className="flex-1"
              data-testid="input-form-description"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Redirect URL</Label>
            <Input
              value={config.redirectUrl}
              onChange={(e) => setConfig({ ...config, redirectUrl: e.target.value })}
              placeholder="https://yourwebsite.com/thank-you (optional)"
              className="flex-1"
              data-testid="input-redirect-url"
            />
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-xl">
            <CardHeader style={{ backgroundColor: config.backgroundColor }} className="text-center">
              <h2 className="text-2xl font-bold" style={{ color: config.primaryColor }}>
                {config.title}
              </h2>
              {config.description && (
                <p className="text-muted-foreground mt-2">{config.description}</p>
              )}
            </CardHeader>
            <CardContent className="p-6 space-y-3" style={{ backgroundColor: config.backgroundColor }}>
              {groupFieldsIntoRows(config.customFields).map((row, rowIndex) => {
                const isHalfWidthRow = row.some(f => (f.width || 'full') === 'half');
                return (
                  <div key={rowIndex} className={isHalfWidthRow ? "grid grid-cols-2 gap-3" : ""}>
                    {row.map((field) => {
                    const index = config.customFields.indexOf(field);
                    return (
                      <div
                        key={field.id}
                        className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4"
                      >
                        {/* Always Visible Controls */}
                        {!field.isSystem && (
                          <div className="absolute -top-3 -right-3 flex gap-1 bg-card rounded-md border border-border p-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => moveField(field.id, 'up')}
                              disabled={index === 0}
                              data-testid={`button-move-up-${field.id}`}
                            >
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => moveField(field.id, 'down')}
                              disabled={index === config.customFields.length - 1}
                              data-testid={`button-move-down-${field.id}`}
                            >
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={() => removeField(field.id)}
                              data-testid={`button-remove-${field.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}

                        {/* Editing Area */}
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
                                <div className="flex items-center justify-between mb-2">
                                  <Label className="text-xs">Options</Label>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const newOptions = [...(field.options || []), ''];
                                      updateField(field.id, { options: newOptions });
                                    }}
                                    data-testid={`button-add-option-${field.id}`}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add Option
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  {(field.options || []).map((option, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <Input
                                        value={option}
                                        onChange={(e) => {
                                          const newOptions = [...(field.options || [])];
                                          newOptions[idx] = e.target.value;
                                          updateField(field.id, { options: newOptions });
                                        }}
                                        placeholder={`Option ${idx + 1}`}
                                        data-testid={`input-option-${idx}-${field.id}`}
                                      />
                                      {(field.options?.length || 0) > 1 && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            const newOptions = (field.options || []).filter((_, i) => i !== idx);
                                            updateField(field.id, { options: newOptions });
                                          }}
                                          data-testid={`button-remove-option-${idx}-${field.id}`}
                                        >
                                          <X className="w-4 h-4 text-destructive" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
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
                            <Button
                              size="sm"
                              onClick={() => setEditingField(null)}
                              data-testid={`button-done-edit-${field.id}`}
                            >
                              Done
                            </Button>
                          </div>
                        ) : (
                          /* Display Mode */
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="flex items-center gap-2">
                                {field.label}
                                {field.required && <span className="text-destructive">*</span>}
                                {field.isSystem && <Badge variant="secondary" className="text-xs">Required</Badge>}
                              </Label>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingField(field.id)}
                                data-testid={`button-edit-${field.id}`}
                              >
                                <Pencil className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                            {field.type === 'textarea' ? (
                              <Textarea
                                placeholder={field.placeholder}
                                className="mt-2"
                                disabled
                              />
                            ) : field.type === 'select' ? (
                              <div className="mt-2 space-y-2">
                                <Label className="text-xs text-muted-foreground">Options</Label>
                                {field.options?.map((opt, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <Input
                                      value={opt}
                                      onChange={(e) => {
                                        const newOptions = [...(field.options || [])];
                                        newOptions[i] = e.target.value;
                                        updateField(field.id, { options: newOptions });
                                      }}
                                      className="flex-1"
                                      data-testid={`input-option-${field.id}-${i}`}
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const newOptions = field.options?.filter((_, idx) => idx !== i);
                                        updateField(field.id, { options: newOptions });
                                      }}
                                      data-testid={`button-remove-option-${field.id}-${i}`}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const newOptions = [...(field.options || []), ''];
                                    updateField(field.id, { options: newOptions });
                                  }}
                                  className="w-full"
                                  data-testid={`button-add-option-${field.id}`}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add Option
                                </Button>
                              </div>
                            ) : field.type === 'checkbox' ? (
                              <div className="mt-2 space-y-2">
                                <Label className="text-xs text-muted-foreground">Options</Label>
                                {field.options?.map((opt, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <Input
                                      value={opt}
                                      onChange={(e) => {
                                        const newOptions = [...(field.options || [])];
                                        newOptions[i] = e.target.value;
                                        updateField(field.id, { options: newOptions });
                                      }}
                                      className="flex-1"
                                      data-testid={`input-option-${field.id}-${i}`}
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const newOptions = field.options?.filter((_, idx) => idx !== i);
                                        updateField(field.id, { options: newOptions });
                                      }}
                                      data-testid={`button-remove-option-${field.id}-${i}`}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const newOptions = [...(field.options || []), ''];
                                    updateField(field.id, { options: newOptions });
                                  }}
                                  className="w-full"
                                  data-testid={`button-add-option-${field.id}`}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add Option
                                </Button>
                              </div>
                            ) : (
                              <Input
                                type={field.type}
                                placeholder={field.placeholder}
                                className="mt-2"
                                disabled
                              />
                            )}
                            
                            {/* Width Controls at Bottom */}
                            <div className="mt-3 pt-3 border-t border-border">
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground">Width</Label>
                                <div className="flex bg-muted rounded-md p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => updateField(field.id, { width: 'half' })}
                                    className={`px-2 py-1 text-xs rounded-sm transition-colors ${
                                      (field.width || 'full') === 'half' 
                                        ? 'bg-background shadow-sm' 
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                    data-testid={`button-width-half-${field.id}`}
                                  >
                                    Half
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateField(field.id, { width: 'full' })}
                                    className={`px-2 py-1 text-xs rounded-sm transition-colors ${
                                      (field.width || 'full') === 'full' 
                                        ? 'bg-background shadow-sm' 
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                    data-testid={`button-width-full-${field.id}`}
                                  >
                                    Full
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                );
              })}


              {/* Add Field Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full border-dashed border-2"
                    data-testid="button-add-field"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Field
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => addField(type)}
                      data-testid={`menu-add-${type}`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

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
  );
}
