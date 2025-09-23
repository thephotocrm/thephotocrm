import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, MessageSquare, Mail, Smartphone, Edit, Trash2 } from "lucide-react";
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
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [textBody, setTextBody] = useState("");

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
      await apiRequest("POST", "/api/templates", templateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Template created",
        description: "New template has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
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
    setHtmlBody("");
    setTextBody("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createTemplateMutation.mutate({
      name,
      channel,
      subject: channel === "EMAIL" ? subject : undefined,
      htmlBody: channel === "EMAIL" ? htmlBody : undefined,
      textBody
    });
  };

  const emailTemplates = (templates || []).filter((t: Template) => t.channel === "EMAIL");
  const smsTemplates = (templates || []).filter((t: Template) => t.channel === "SMS");

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="bg-card border-b border-border px-4 md:px-6 py-4 relative">
          <div className="flex items-center justify-between">
            <SidebarTrigger 
              className="hidden md:inline-flex" 
            />
            <div className="pr-12 md:pr-0">
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
                  <DialogTitle>Create New Template</DialogTitle>
                  <DialogDescription>
                    Create a reusable email or SMS template for your automation workflows.
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
                        placeholder="Welcome to {businessName}"
                        data-testid="input-subject"
                      />
                    </div>
                  )}
                  
                  {channel === "EMAIL" && (
                    <div className="space-y-2">
                      <Label htmlFor="htmlBody">HTML Body</Label>
                      <Textarea
                        id="htmlBody"
                        value={htmlBody}
                        onChange={(e) => setHtmlBody(e.target.value)}
                        placeholder="<h1>Welcome {firstName}!</h1><p>Thank you for your inquiry...</p>"
                        rows={6}
                        data-testid="textarea-html-body"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="textBody">
                      {channel === "EMAIL" ? "Text Body (Fallback)" : "Message"}
                    </Label>
                    <Textarea
                      id="textBody"
                      value={textBody}
                      onChange={(e) => setTextBody(e.target.value)}
                      placeholder={channel === "EMAIL" 
                        ? "Welcome {firstName}! Thank you for your inquiry..."
                        : "Hi {firstName}, thank you for your inquiry! We'll be in touch soon."
                      }
                      rows={4}
                      required
                      data-testid="textarea-text-body"
                    />
                  </div>
                  
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm font-medium mb-2">Available Variables:</p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>{'{'}firstName{'}'} - Client's first name</p>
                      <p>{'{'}lastName{'}'} - Client's last name</p>
                      <p>{'{'}fullName{'}'} - Client's full name (first + last)</p>
                      <p>{'{'}email{'}'} - Client's email address</p>
                      <p>{'{'}phone{'}'} - Client's phone number</p>
                      <p>{'{'}weddingDate{'}'} - Client's wedding date</p>
                      <p>{'{'}businessName{'}'} - Your business name</p>
                    </div>
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
                      {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="p-6 space-y-6">
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailTemplates.map((template: Template) => (
                      <TableRow key={template.id} data-testid={`email-template-${template.id}`}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>{template.subject}</TableCell>
                        <TableCell>{new Date(template.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" data-testid={`button-edit-${template.id}`}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm" data-testid={`button-delete-${template.id}`}>
                              <Trash2 className="w-3 h-3" />
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Message Preview</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {smsTemplates.map((template: Template) => (
                      <TableRow key={template.id} data-testid={`sms-template-${template.id}`}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {template.textBody}
                        </TableCell>
                        <TableCell>{new Date(template.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" data-testid={`button-edit-${template.id}`}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm" data-testid={`button-delete-${template.id}`}>
                              <Trash2 className="w-3 h-3" />
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
      </SidebarInset>
    </SidebarProvider>
  );
}
