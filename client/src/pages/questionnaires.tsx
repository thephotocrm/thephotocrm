import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, ClipboardList, Users, CheckCircle, Clock, Edit, UserPlus, Trash2, GripVertical, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Question types
const QUESTION_TYPES = [
  { value: "TEXT", label: "Text Input" },
  { value: "TEXTAREA", label: "Long Text" },
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { value: "CHECKBOX", label: "Checkboxes" },
  { value: "NUMBER", label: "Number" },
  { value: "DATE", label: "Date" },
  { value: "EMAIL", label: "Email" }
];

// Form schemas
const templateFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional()
});

const questionFormSchema = z.object({
  type: z.string().min(1, "Question type is required"),
  label: z.string().min(1, "Question label is required"),
  options: z.string().optional(),
  orderIndex: z.number().min(0)
});

export default function Questionnaires() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL LOGIC - Rules of Hooks!
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["/api/questionnaire-templates"],
    enabled: !!user
  });

  // Redirect to login if not authenticated  
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [newTemplate, setNewTemplate] = useState({ title: "", description: "" });
  const [editingQuestions, setEditingQuestions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("template");
  
  const { toast } = useToast();

  // Fetch questions when editing a template
  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ["/api/questionnaire-templates", editingTemplate?.id, "questions"],
    enabled: !!editingTemplate?.id,
    onSuccess: (data) => {
      setEditingQuestions(data);
    }
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      await apiRequest("POST", "/api/questionnaire-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaire-templates"] });
      setCreateDialogOpen(false);
      setNewTemplate({ title: "", description: "" });
      toast({
        title: "Template Created",
        description: "Questionnaire template has been created successfully."
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

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title: string; description: string }) => {
      await apiRequest("PUT", `/api/questionnaire-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaire-templates"] });
      // Keep dialog open - users often want to continue editing questions
      toast({
        title: "Template Updated",
        description: "Template details have been saved successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update template. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/questionnaire-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaire-templates"] });
      toast({
        title: "Template Deleted",
        description: "Questionnaire template has been deleted successfully."
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

  // Question mutations
  const createQuestionMutation = useMutation({
    mutationFn: async (data: { templateId: string; type: string; label: string; options?: string; orderIndex: number }) => {
      await apiRequest("POST", `/api/questionnaire-templates/${data.templateId}/questions`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaire-templates", editingTemplate?.id, "questions"] });
      toast({
        title: "Question Added",
        description: "Question has been added successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add question. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async (data: { id: string; type: string; label: string; options?: string; orderIndex: number }) => {
      await apiRequest("PUT", `/api/questionnaire-questions/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaire-templates", editingTemplate?.id, "questions"] });
      toast({
        title: "Question Updated",
        description: "Question has been updated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update question. Please try again.",
        variant: "destructive"
      });
    }
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/questionnaire-questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaire-templates", editingTemplate?.id, "questions"] });
      toast({
        title: "Question Deleted", 
        description: "Question has been deleted successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete question. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleCreateSubmit = () => {
    if (!newTemplate.title.trim()) {
      toast({
        title: "Error",
        description: "Template title is required.",
        variant: "destructive"
      });
      return;
    }
    createMutation.mutate(newTemplate);
  };

  const handleUpdateSubmit = () => {
    if (!editingTemplate?.title?.trim()) {
      toast({
        title: "Error",
        description: "Template title is required.",
        variant: "destructive"
      });
      return;
    }
    updateMutation.mutate(editingTemplate);
  };

  const handleAssignTemplate = (template: any) => {
    setSelectedTemplate(template);
    setAssignDialogOpen(true);
  };

  const addNewQuestion = () => {
    const newQuestion = {
      id: `new-${Date.now()}`,
      type: "TEXT",
      label: "",
      options: "",
      orderIndex: editingQuestions.length,
      isNew: true
    };
    setEditingQuestions([...editingQuestions, newQuestion]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...editingQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setEditingQuestions(updated);
  };

  const deleteQuestion = (index: number) => {
    const question = editingQuestions[index];
    if (question.isNew) {
      // Remove from local state if it's a new question
      const updated = editingQuestions.filter((_, i) => i !== index);
      setEditingQuestions(updated);
    } else {
      // Call API to delete existing question
      deleteQuestionMutation.mutate(question.id);
    }
  };

  const saveQuestion = (question: any) => {
    if (question.isNew) {
      // Create new question
      createQuestionMutation.mutate({
        templateId: editingTemplate.id,
        type: question.type,
        label: question.label,
        options: question.options,
        orderIndex: question.orderIndex
      });
    } else {
      // Update existing question
      updateQuestionMutation.mutate(question);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <SidebarTrigger className="-ml-1" />
            <div>
              <h1 className="text-2xl font-semibold">Questionnaires</h1>
              <p className="text-muted-foreground">Create questionnaires and assign them to clients</p>
            </div>
            
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-questionnaire">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Questionnaire
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Questionnaire Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newTemplate.title}
                      onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                      placeholder="Enter template title"
                      data-testid="input-template-title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                      placeholder="Enter template description"
                      data-testid="input-template-description"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateSubmit}
                      disabled={createMutation.isPending}
                      data-testid="button-create-submit"
                    >
                      {createMutation.isPending ? "Creating..." : "Create Template"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Templates</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{templates.length}</div>
                <p className="text-xs text-muted-foreground">Active templates</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assigned</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">To clients</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">Completion rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">Awaiting response</p>
              </CardContent>
            </Card>
          </div>

          {/* Questionnaire Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Questionnaire Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No questionnaire templates yet</p>
                    <p className="text-sm">Create your first template to get started</p>
                  </div>
                ) : (
                  templates.map((template: any) => (
                    <div key={template.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h3 className="font-medium">{template.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {template.description || "No description"}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">0 questions</Badge>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setEditingTemplate({ ...template })}
                          data-testid={`button-edit-${template.id}`}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleAssignTemplate(template)}
                          data-testid={`button-assign-${template.id}`}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Assign
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteMutation.mutate(template.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${template.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Client Responses */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium">Emily & James Peterson</h4>
                    <p className="text-sm text-muted-foreground">Completed "Wedding Day Details" questionnaire</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default">Completed</Badge>
                    <Button variant="outline" size="sm" data-testid="button-view-response-emily">
                      View Response
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium">Sarah & Tom Rodriguez</h4>
                    <p className="text-sm text-muted-foreground">Completed "Photography Preferences" questionnaire</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default">Completed</Badge>
                    <Button variant="outline" size="sm" data-testid="button-view-response-sarah">
                      View Response
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium">Jennifer & Alex Moore</h4>
                    <p className="text-sm text-muted-foreground">Pending "Wedding Day Details" questionnaire</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Pending</Badge>
                    <Button variant="outline" size="sm" data-testid="button-remind-jennifer">
                      Send Reminder
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      {/* Enhanced Edit Template Dialog with Question Management */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Questionnaire Template</DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="template" data-testid="tab-template">Template Details</TabsTrigger>
              <TabsTrigger value="questions" data-testid="tab-questions">Questions ({editingQuestions.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="template" className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingTemplate?.title || ""}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                  placeholder="Enter template title"
                  data-testid="input-edit-template-title"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingTemplate?.description || ""}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  placeholder="Enter template description"
                  data-testid="input-edit-template-description"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="questions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Questions</h3>
                <Button 
                  onClick={addNewQuestion}
                  size="sm"
                  data-testid="button-add-question"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>
              
              {questionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : editingQuestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No questions yet. Add your first question to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {editingQuestions.map((question, index) => (
                    <div key={question.id || index} className="border border-border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Question {index + 1}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteQuestion(index)}
                          data-testid={`button-delete-question-${index}`}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Question Type</Label>
                          <Select 
                            value={question.type} 
                            onValueChange={(value) => updateQuestion(index, 'type', value)}
                          >
                            <SelectTrigger data-testid={`select-question-type-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {QUESTION_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Question Text</Label>
                          <Input
                            value={question.label}
                            onChange={(e) => updateQuestion(index, 'label', e.target.value)}
                            placeholder="Enter your question"
                            data-testid={`input-question-label-${index}`}
                          />
                        </div>
                      </div>
                      
                      {(question.type === 'MULTIPLE_CHOICE' || question.type === 'CHECKBOX') && (
                        <div>
                          <Label>Options (one per line)</Label>
                          <Textarea
                            value={question.options || ""}
                            onChange={(e) => updateQuestion(index, 'options', e.target.value)}
                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                            data-testid={`textarea-question-options-${index}`}
                          />
                        </div>
                      )}
                      
                      <div className="flex justify-end">
                        <Button 
                          onClick={() => saveQuestion(question)}
                          size="sm"
                          disabled={!question.label.trim() || createQuestionMutation.isPending || updateQuestionMutation.isPending}
                          data-testid={`button-save-question-${index}`}
                        >
                          {(createQuestionMutation.isPending || updateQuestionMutation.isPending) ? 
                            "Saving..." : 
                            question.isNew ? "Add Question" : "Update Question"
                          }
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-2 border-t pt-4 mt-6">
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateSubmit}
              disabled={updateMutation.isPending}
              data-testid="button-update-submit"
            >
              {updateMutation.isPending ? "Updating..." : "Update Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Template Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Questionnaire Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assign "{selectedTemplate?.title}" to a client. This feature will be available soon.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
