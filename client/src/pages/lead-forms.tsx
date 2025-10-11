import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Code, Copy, ExternalLink, Settings } from "lucide-react";
import { format } from "date-fns";

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

const projectTypes = [
  { value: "WEDDING", label: "Wedding" },
  { value: "ENGAGEMENT", label: "Engagement" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "CORPORATE", label: "Corporate" },
  { value: "PORTRAIT", label: "Portrait" },
  { value: "FAMILY", label: "Family" },
  { value: "MATERNITY", label: "Maternity" },
  { value: "NEWBORN", label: "Newborn" },
  { value: "EVENT", label: "Event" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "OTHER", label: "Other" }
];

const defaultConfig = {
  title: "Get In Touch",
  description: "Let's discuss your photography needs",
  primaryColor: "#3b82f6",
  backgroundColor: "#ffffff",
  buttonText: "Send Inquiry",
  successMessage: "Thank you! We'll be in touch soon.",
  showPhone: true,
  showMessage: true,
  showEventDate: true
};

export default function LeadForms() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEmbedDialogOpen, setIsEmbedDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<LeadForm | null>(null);
  const [selectedForm, setSelectedForm] = useState<LeadForm | null>(null);
  const [formToDelete, setFormToDelete] = useState<LeadForm | null>(null);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("WEDDING");

  const { data: forms, isLoading } = useQuery<LeadForm[]>({
    queryKey: ["/api/lead-forms"],
    enabled: !!user
  });

  const createFormMutation = useMutation({
    mutationFn: async (formData: any) => {
      await apiRequest("POST", "/api/lead-forms", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lead-forms"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Form created",
        description: "New lead form has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create form. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateFormMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/lead-forms/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lead-forms"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Form updated",
        description: "Lead form has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update form. Please try again.",
        variant: "destructive"
      });
    }
  });

  const deleteFormMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/lead-forms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lead-forms"] });
      setIsDeleteDialogOpen(false);
      setFormToDelete(null);
      toast({
        title: "Form deleted",
        description: "Lead form has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete form. Please try again.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setProjectType("WEDDING");
    setEditingForm(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (form: LeadForm) => {
    setEditingForm(form);
    setName(form.name);
    setDescription(form.description || "");
    setProjectType(form.projectType);
    setIsDialogOpen(true);
  };

  const handleDelete = (form: LeadForm) => {
    setFormToDelete(form);
    setIsDeleteDialogOpen(true);
  };

  const handleConfigure = (formId: string) => {
    setLocation(`/lead-forms/${formId}/configure`);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({
        title: "Validation error",
        description: "Form name is required.",
        variant: "destructive"
      });
      return;
    }

    const formData = {
      name: name.trim(),
      description: description.trim() || null,
      projectType,
      config: defaultConfig,
      status: "ACTIVE"
    };

    if (editingForm) {
      updateFormMutation.mutate({ id: editingForm.id, data: formData });
    } else {
      createFormMutation.mutate(formData);
    }
  };

  const showEmbedCode = (form: LeadForm) => {
    setSelectedForm(form);
    setIsEmbedDialogOpen(true);
  };

  const getEmbedCode = (form: LeadForm) => {
    const baseUrl = window.location.origin;
    return `<!-- Lead Capture Form -->
<div class="photo-crm-form" data-form-token="${form.publicToken}"></div>
<script src="${baseUrl}/widget/form-embed.js"></script>`;
  };

  const getFormUrl = (form: LeadForm) => {
    return `${window.location.origin}/form/${form.publicToken}`;
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${type} has been copied to clipboard.`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Lead Forms</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Create and manage embeddable forms for your website
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-form" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create Form
        </Button>
      </div>

      {forms && forms.length > 0 ? (
        <>
          {/* Mobile Card View */}
          <div className="space-y-4 md:hidden">
            {forms.map((form) => (
              <div
                key={form.id}
                data-testid={`row-form-${form.id}`}
                className="border rounded-lg p-4 bg-white dark:bg-gray-950 space-y-4"
              >
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-base break-words" data-testid={`text-name-${form.id}`}>
                      {form.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(form.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs bg-secondary px-2 py-1 rounded" data-testid={`text-type-${form.id}`}>
                      {projectTypes.find(pt => pt.value === form.projectType)?.label || form.projectType}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        form.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                      data-testid={`status-${form.id}`}
                    >
                      {form.status}
                    </span>
                    <span className="text-xs text-muted-foreground" data-testid={`text-submissions-${form.id}`}>
                      {form.submissionCount || 0} submissions
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConfigure(form.id)}
                    data-testid={`button-configure-${form.id}`}
                    className="text-xs"
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Configure
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => showEmbedCode(form)}
                    data-testid={`button-embed-${form.id}`}
                    className="text-xs"
                  >
                    <Code className="w-3 h-3 mr-1" />
                    Embed
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(form)}
                    data-testid={`button-edit-${form.id}`}
                    className="text-xs"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(form)}
                    data-testid={`button-delete-${form.id}`}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950 border-red-200 dark:border-red-800"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="border rounded-lg hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-white dark:bg-gray-950">
                  <TableHead className="text-base">Name</TableHead>
                  <TableHead className="text-base">Project Type</TableHead>
                  <TableHead className="text-base">Status</TableHead>
                  <TableHead className="text-base">Submissions</TableHead>
                  <TableHead className="text-base">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <>
                    <TableRow key={form.id} data-testid={`row-form-${form.id}`} className="bg-white dark:bg-gray-950">
                      <TableCell className="font-medium pb-2 text-base" data-testid={`text-name-${form.id}`}>
                        {form.name}
                      </TableCell>
                      <TableCell className="pb-2 text-base" data-testid={`text-type-${form.id}`}>
                        {projectTypes.find(pt => pt.value === form.projectType)?.label || form.projectType}
                      </TableCell>
                      <TableCell className="pb-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                            form.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                          data-testid={`status-${form.id}`}
                        >
                          {form.status}
                        </span>
                      </TableCell>
                      <TableCell className="pb-2 text-base" data-testid={`text-submissions-${form.id}`}>
                        {form.submissionCount || 0}
                      </TableCell>
                      <TableCell className="pb-2 text-base" data-testid={`text-created-${form.id}`}>
                        {format(new Date(form.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                    <TableRow key={`${form.id}-actions`} className="bg-gray-100 dark:bg-gray-800">
                      <TableCell colSpan={5} className="pt-4 pb-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConfigure(form.id)}
                            data-testid={`button-configure-${form.id}`}
                            className="bg-white dark:bg-gray-800"
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Configure
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => showEmbedCode(form)}
                            data-testid={`button-embed-${form.id}`}
                            className="bg-white dark:bg-gray-800"
                          >
                            <Code className="w-4 h-4 mr-1" />
                            Embed
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(form)}
                            data-testid={`button-edit-${form.id}`}
                            className="bg-white dark:bg-gray-800"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(form)}
                            data-testid={`button-delete-${form.id}`}
                            className="bg-white dark:bg-gray-800 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950 border-red-200 dark:border-red-800"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">No forms yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first lead capture form to start collecting inquiries
          </p>
          <Button onClick={handleCreate} data-testid="button-create-first-form">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Form
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-form-editor">
          <DialogHeader>
            <DialogTitle>
              {editingForm ? "Edit Form" : "Create New Form"}
            </DialogTitle>
            <DialogDescription>
              {editingForm
                ? "Update the form details below"
                : "Create a new lead capture form for your website"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Form Name *</Label>
              <Input
                id="name"
                data-testid="input-form-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Wedding Inquiry Form"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                data-testid="input-form-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for internal reference"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="projectType">Project Type *</Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger id="projectType" data-testid="select-project-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                This project type will be assigned to new clients who submit this form
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createFormMutation.isPending || updateFormMutation.isPending}
              data-testid="button-save-form"
            >
              {editingForm ? "Update Form" : "Create Form"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog open={isEmbedDialogOpen} onOpenChange={setIsEmbedDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-embed-code">
          <DialogHeader>
            <DialogTitle>Embed Code</DialogTitle>
            <DialogDescription>
              Add this form to your website using one of the methods below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Direct Link</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => selectedForm && copyToClipboard(getFormUrl(selectedForm), "Form URL")}
                  data-testid="button-copy-url"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={selectedForm ? getFormUrl(selectedForm) : ""}
                  readOnly
                  data-testid="input-form-url"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedForm && window.open(getFormUrl(selectedForm), '_blank')}
                  data-testid="button-open-url"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Embed Code (HTML)</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => selectedForm && copyToClipboard(getEmbedCode(selectedForm), "Embed code")}
                  data-testid="button-copy-embed"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded-md text-xs whitespace-pre-wrap break-all">
                <code data-testid="text-embed-code">{selectedForm ? getEmbedCode(selectedForm) : ""}</code>
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{formToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => formToDelete && deleteFormMutation.mutate(formToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
