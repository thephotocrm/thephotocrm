import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, MessageSquare, Mail, Smartphone, Edit, Trash2, ChevronDown, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmailTemplateBuilder, type ContentBlock } from "@/components/email-template-builder";
import { EmailPreview } from "@/components/email-preview";

interface Template {
  id: string;
  name: string;
  channel: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  contentBlocks?: ContentBlock[];
  includeHeroImage?: boolean;
  heroImageUrl?: string;
  includeHeader?: boolean;
  headerStyle?: string;
  includeSignature?: boolean;
  signatureStyle?: string;
  createdAt: string;
}

export default function Templates() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isBuilderDialogOpen, setIsBuilderDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  
  // Form states
  const [selectedChannel, setSelectedChannel] = useState<"EMAIL" | "SMS" | "">("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [textBody, setTextBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Email builder states
  const [emailBlocks, setEmailBlocks] = useState<ContentBlock[]>([]);
  const [includeHeroImage, setIncludeHeroImage] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [includeHeader, setIncludeHeader] = useState(false);
  const [headerStyle, setHeaderStyle] = useState<string>("minimal");
  const [includeSignature, setIncludeSignature] = useState(true);
  const [signatureStyle, setSignatureStyle] = useState<string>("simple");

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONALS
  const { data: templates, isLoading } = useQuery({
    queryKey: ["/api/templates"],
    enabled: !!user
  });

  // Redirect to login if not authenticated  
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      if (isEditMode && editingTemplateId) {
        await apiRequest("PUT", `/api/templates/${editingTemplateId}`, templateData);
      } else {
        await apiRequest("POST", "/api/templates", templateData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setIsBuilderDialogOpen(false);
      resetForm();
      toast({
        title: isEditMode ? "Template updated" : "Template created",
        description: isEditMode ? "Template has been updated successfully." : "New template has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'create'} template. Please try again.`,
        variant: "destructive"
      });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      await apiRequest("DELETE", `/api/templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template deleted",
        description: "Template has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive"
      });
    }
  });


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const resetForm = () => {
    setName("");
    setSelectedChannel("");
    setSubject("");
    setTextBody("");
    setEmailBlocks([]);
    setIncludeHeroImage(false);
    setHeroImageUrl("");
    setIncludeHeader(false);
    setHeaderStyle("minimal");
    setIncludeSignature(true);
    setSignatureStyle("simple");
    setIsEditMode(false);
    setEditingTemplateId(null);
  };

  const handleEdit = (template: Template) => {
    setIsEditMode(true);
    setEditingTemplateId(template.id);
    setName(template.name);
    setSelectedChannel(template.channel as "EMAIL" | "SMS");
    setSubject(template.subject || "");
    setTextBody(template.textBody || "");
    
    // Load email builder data if available
    if (template.channel === "EMAIL" && template.contentBlocks) {
      setEmailBlocks(template.contentBlocks);
      setIncludeHeroImage(template.includeHeroImage || false);
      setHeroImageUrl(template.heroImageUrl || "");
      setIncludeHeader(template.includeHeader || false);
      setHeaderStyle(template.headerStyle || "minimal");
      setIncludeSignature(template.includeSignature !== false);
      setSignatureStyle(template.signatureStyle || "simple");
    }
    
    setIsBuilderDialogOpen(true);
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textBody;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    const newText = before + variable + after;
    setTextBody(newText);
    
    // Set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + variable.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleDelete = (templateId: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(templateId);
    }
  };

  const handleTypeSelect = (type: "EMAIL" | "SMS") => {
    setSelectedChannel(type);
    setIsTypeDialogOpen(false);
    setIsBuilderDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const templateData: any = {
      name,
      channel: selectedChannel,
    };
    
    if (selectedChannel === "EMAIL") {
      templateData.subject = subject;
      templateData.contentBlocks = emailBlocks;
      templateData.includeHeroImage = includeHeroImage;
      templateData.heroImageUrl = includeHeroImage ? heroImageUrl : undefined;
      templateData.includeHeader = includeHeader;
      templateData.headerStyle = includeHeader ? headerStyle : undefined;
      templateData.includeSignature = includeSignature;
      templateData.signatureStyle = includeSignature ? signatureStyle : undefined;
    } else {
      templateData.textBody = textBody;
    }
    
    createTemplateMutation.mutate(templateData);
  };

  const variables = [
    { value: '{{first_name}}', label: 'First Name' },
    { value: '{{last_name}}', label: 'Last Name' },
    { value: '{{full_name}}', label: 'Full Name' },
    { value: '{{email}}', label: 'Email Address' },
    { value: '{{phone}}', label: 'Phone Number' },
    { value: '{{project_type}}', label: 'Project Type' },
    { value: '{{event_date}}', label: 'Event Date' },
    { value: '{{business_name}}', label: 'Business Name' },
    { value: '{{photographer_name}}', label: 'Photographer Name' },
    { value: '{{scheduler_link}}', label: 'Booking Link' },
  ];

  const emailTemplates = (templates || []).filter((t: Template) => t.channel === "EMAIL");
  const smsTemplates = (templates || []).filter((t: Template) => t.channel === "SMS");

  return (
    <div>
        {/* Header */}
        <header className="bg-card border-b border-border px-4 md:px-6 py-4 relative">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold">Templates</h1>
              <p className="text-sm md:text-base text-muted-foreground">Create and manage email and SMS templates for automation</p>
            </div>
            
            {/* Type Selection Dialog */}
            <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  data-testid="button-create-template"
                  onClick={() => {
                    resetForm();
                    setIsTypeDialogOpen(true);
                  }}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Choose Template Type</DialogTitle>
                  <DialogDescription>
                    Select the type of template you want to create
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <Button
                    variant="outline"
                    className="h-auto py-6 px-6 flex items-center justify-between hover:bg-accent"
                    onClick={() => handleTypeSelect("EMAIL")}
                    data-testid="button-select-email-template"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                        <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-base">Email Template</p>
                        <p className="text-sm text-muted-foreground">Visual email builder with blocks</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto py-6 px-6 flex items-center justify-between hover:bg-accent"
                    onClick={() => handleTypeSelect("SMS")}
                    data-testid="button-select-sms-template"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                        <Smartphone className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-base">SMS Template</p>
                        <p className="text-sm text-muted-foreground">Simple text message template</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Builder Dialog */}
            <Dialog open={isBuilderDialogOpen} onOpenChange={setIsBuilderDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {isEditMode ? "Edit Template" : `Create ${selectedChannel === "EMAIL" ? "Email" : "SMS"} Template`}
                  </DialogTitle>
                  <DialogDescription>
                    {isEditMode 
                      ? `Update your ${selectedChannel === "EMAIL" ? "email" : "SMS"} template.`
                      : `Create a reusable ${selectedChannel === "EMAIL" ? "email" : "SMS"} template for your automation workflows.`
                    }
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={selectedChannel === "EMAIL" ? "Welcome Email" : "Inquiry Follow-up SMS"}
                      required
                      data-testid="input-template-name"
                    />
                  </div>
                  
                  {selectedChannel === "EMAIL" ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject Line</Label>
                        <Input
                          id="subject"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Welcome to {{business_name}}"
                          required
                          data-testid="input-subject"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Email Content</Label>
                        <EmailTemplateBuilder
                          blocks={emailBlocks}
                          onBlocksChange={setEmailBlocks}
                          includeHeader={includeHeader}
                          headerStyle={headerStyle}
                          includeSignature={includeSignature}
                          signatureStyle={signatureStyle}
                          onBrandingChange={(branding) => {
                            setIncludeHeader(branding.includeHeader);
                            setHeaderStyle(branding.headerStyle);
                            setIncludeSignature(branding.includeSignature);
                            setSignatureStyle(branding.signatureStyle);
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="textBody">Message</Label>
                      <Textarea
                        ref={textareaRef}
                        id="textBody"
                        value={textBody}
                        onChange={(e) => setTextBody(e.target.value)}
                        placeholder="Hi {{first_name}}, thank you for your inquiry! We'll be in touch soon."
                        rows={6}
                        required
                        data-testid="textarea-text-body"
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            data-testid="button-insert-variable"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Insert Variable
                            <ChevronDown className="w-4 h-4 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[200px]">
                          {variables.map((variable) => (
                            <DropdownMenuItem
                              key={variable.value}
                              onClick={() => insertVariable(variable.value)}
                              data-testid={`insert-${variable.value.replace(/[{}]/g, '')}`}
                            >
                              <span className="text-xs font-mono text-muted-foreground mr-2">
                                {variable.value}
                              </span>
                              <span className="text-sm">{variable.label}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsBuilderDialogOpen(false);
                        resetForm();
                      }}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createTemplateMutation.isPending || (selectedChannel === "EMAIL" && emailBlocks.length === 0)}
                      data-testid="button-create-template-submit"
                    >
                      {createTemplateMutation.isPending 
                        ? (isEditMode ? "Updating..." : "Creating...") 
                        : (isEditMode ? "Update Template" : "Create Template")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="p-3 sm:p-6 space-y-6">
          {/* Stats Cards */}
          <div className="hidden md:grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Email Templates</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="count-email-templates">
                  {emailTemplates.length}
                </div>
                <p className="text-xs text-muted-foreground">Ready for automation</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SMS Templates</CardTitle>
                <Smartphone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="count-sms-templates">
                  {smsTemplates.length}
                </div>
                <p className="text-xs text-muted-foreground">Ready for automation</p>
              </CardContent>
            </Card>
          </div>

          {/* Templates Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Templates</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (templates || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p>No templates yet</p>
                  <p className="text-sm">Create your first template to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead className="hidden md:table-cell">Subject/Preview</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(templates || []).map((template: Template) => (
                      <TableRow key={template.id} data-testid={`template-row-${template.id}`}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge variant={template.channel === "EMAIL" ? "default" : "secondary"}>
                            {template.channel === "EMAIL" ? (
                              <Mail className="w-3 h-3 mr-1" />
                            ) : (
                              <Smartphone className="w-3 h-3 mr-1" />
                            )}
                            {template.channel}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-md truncate">
                          {template.channel === "EMAIL" 
                            ? template.subject 
                            : template.textBody?.substring(0, 60) + (template.textBody && template.textBody.length > 60 ? "..." : "")
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(template)}
                              data-testid={`button-edit-${template.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(template.id)}
                              data-testid={`button-delete-${template.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
