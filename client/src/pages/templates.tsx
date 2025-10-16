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
import { Plus, MessageSquare, Mail, Smartphone, Edit, Trash2, ChevronDown } from "lucide-react";
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

interface Template {
  id: string;
  name: string;
  channel: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  createdAt: string;
}

export default function Templates() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("");
  const [subject, setSubject] = useState("");
  const [textBody, setTextBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
      setIsDialogOpen(false);
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
    setChannel("");
    setSubject("");
    setTextBody("");
    setIsEditMode(false);
    setEditingTemplateId(null);
  };

  const handleEdit = (template: Template) => {
    setIsEditMode(true);
    setEditingTemplateId(template.id);
    setName(template.name);
    setChannel(template.channel);
    setSubject(template.subject || "");
    setTextBody(template.textBody || "");
    setIsDialogOpen(true);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createTemplateMutation.mutate({
      name,
      channel,
      subject: channel === "EMAIL" ? subject : undefined,
      textBody
    });
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
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-template">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{isEditMode ? "Edit Template" : "Create New Template"}</DialogTitle>
                  <DialogDescription>
                    {isEditMode ? "Update your email or SMS template." : "Create a reusable email or SMS template for your automation workflows."}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Template Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Welcome Email"
                        required
                        data-testid="input-template-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="channel">Channel</Label>
                      <Select value={channel} onValueChange={setChannel} required>
                        <SelectTrigger data-testid="select-channel">
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMAIL">Email</SelectItem>
                          <SelectItem value="SMS">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {channel === "EMAIL" && (
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject Line</Label>
                      <Input
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Welcome to {{business_name}}"
                        data-testid="input-subject"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="textBody">Message</Label>
                    <Textarea
                      ref={textareaRef}
                      id="textBody"
                      value={textBody}
                      onChange={(e) => setTextBody(e.target.value)}
                      placeholder={channel === "EMAIL" 
                        ? "Hi {{first_name}}, thank you for reaching out! I'd love to learn more about your {{project_type}}..."
                        : "Hi {{first_name}}, thank you for your inquiry! We'll be in touch soon."
                      }
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
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createTemplateMutation.isPending}
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

          {/* Email Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Email Templates ({emailTemplates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : emailTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No email templates created yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {emailTemplates.map((template: Template) => (
                    <Card key={template.id} className="border border-border/50 hover:border-border transition-colors" data-testid={`email-template-${template.id}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-base truncate">{template.name}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{template.subject}</p>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <Button variant="outline" size="sm" onClick={() => handleEdit(template)} data-testid={`button-edit-${template.id}`}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete(template.id)} disabled={deleteTemplateMutation.isPending} data-testid={`button-delete-${template.id}`}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Mail className="w-3 h-3 mr-1" />
                            Created {new Date(template.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SMS Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Smartphone className="w-5 h-5 mr-2" />
                SMS Templates ({smsTemplates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : smsTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No SMS templates created yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {smsTemplates.map((template: Template) => (
                    <Card key={template.id} className="border border-border/50 hover:border-border transition-colors" data-testid={`sms-template-${template.id}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-base truncate">{template.name}</h3>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {template.textBody}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <Button variant="outline" size="sm" onClick={() => handleEdit(template)} data-testid={`button-edit-${template.id}`}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete(template.id)} disabled={deleteTemplateMutation.isPending} data-testid={`button-delete-${template.id}`}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Smartphone className="w-3 h-3 mr-1" />
                            Created {new Date(template.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
