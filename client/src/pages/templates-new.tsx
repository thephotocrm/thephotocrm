import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, Smartphone, Edit, Trash2, ArrowLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  createdAt: string;
}

export default function TemplatesNew() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showBuilder, setShowBuilder] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("EMAIL");
  const [subject, setSubject] = useState("");
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["/api/templates"],
    enabled: !!user
  });

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

  const resetForm = () => {
    setShowBuilder(false);
    setIsEditMode(false);
    setEditingTemplateId(null);
    setName("");
    setChannel("EMAIL");
    setSubject("");
    setContentBlocks([]);
  };

  const handleEdit = (template: Template) => {
    setIsEditMode(true);
    setEditingTemplateId(template.id);
    setName(template.name);
    setChannel(template.channel);
    setSubject(template.subject || "");
    setContentBlocks(template.contentBlocks || []);
    setShowBuilder(true);
  };

  const handleDelete = (templateId: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(templateId);
    }
  };

  const handleSave = () => {
    if (!name || !channel) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (channel === "EMAIL" && contentBlocks.length === 0) {
      toast({
        title: "No content",
        description: "Please add at least one content block",
        variant: "destructive"
      });
      return;
    }

    createTemplateMutation.mutate({
      name,
      channel,
      subject: channel === "EMAIL" ? subject : undefined,
      contentBlocks: channel === "EMAIL" ? contentBlocks : undefined
    });
  };

  const emailTemplates = (templates || []).filter((t: Template) => t.channel === "EMAIL");
  const smsTemplates = (templates || []).filter((t: Template) => t.channel === "SMS");

  if (showBuilder) {
    return (
      <div className="h-screen flex flex-col">
        <header className="bg-card border-b border-border px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-semibold">
                  {isEditMode ? "Edit Template" : "Create Email Template"}
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  Build your email with visual blocks
                </p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={createTemplateMutation.isPending}
              data-testid="button-save-template"
            >
              {createTemplateMutation.isPending 
                ? (isEditMode ? "Updating..." : "Creating...") 
                : (isEditMode ? "Update Template" : "Save Template")}
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-6 p-6 h-full overflow-auto">
            {/* Left: Builder */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Template Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Welcome Email"
                      data-testid="input-template-name"
                    />
                  </div>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Email Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <EmailTemplateBuilder
                    blocks={contentBlocks}
                    onBlocksChange={setContentBlocks}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right: Preview */}
            <div className="lg:sticky lg:top-6 lg:h-fit">
              <EmailPreview
                subject={subject}
                blocks={contentBlocks}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="bg-card border-b border-border px-4 md:px-6 py-4 relative">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">Templates</h1>
            <p className="text-sm md:text-base text-muted-foreground">Create and manage email and SMS templates for automation</p>
          </div>
          
          <Button onClick={() => setShowBuilder(true)} data-testid="button-create-template">
            <Plus className="w-5 h-5 mr-2" />
            Create Template
          </Button>
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
                            {template.contentBlocks && (
                              <Badge variant="secondary" className="mt-2">
                                {template.contentBlocks.length} blocks
                              </Badge>
                            )}
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
      </div>
    </div>
  );
}
