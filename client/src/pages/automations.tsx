import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Zap, Clock, Mail, Smartphone, Settings, Edit2, ArrowRight, Calendar } from "lucide-react";
import { insertAutomationSchema, projectTypeEnum, automationTypeEnum, triggerTypeEnum } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Create form schema based on insertAutomationSchema but without photographerId (auto-added by backend)
const createAutomationFormSchema = insertAutomationSchema.omit({ photographerId: true });
type CreateAutomationFormData = z.infer<typeof createAutomationFormSchema>;

// AutomationStepManager Component
function AutomationStepManager({ automation, onDelete }: { automation: any, onDelete: (id: string) => void }) {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: automation.name,
    stageId: automation.stageId || 'global',
    channel: automation.channel,
    enabled: automation.enabled
  });

  const { data: steps = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/automations", automation.id, "steps"],
    enabled: !!automation.id
  });


  // Delete step mutation  
  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      return apiRequest("DELETE", `/api/automation-steps/${stepId}`);
    },
    onSuccess: () => {
      toast({ title: "Step deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations", automation.id, "steps"] });
    },
    onError: () => {
      toast({ title: "Failed to delete step", variant: "destructive" });
    }
  });


  const handleDeleteStep = (stepId: string) => {
    if (confirm('Are you sure you want to delete this step?')) {
      deleteStepMutation.mutate(stepId);
    }
  };

  // Toggle automation mutation
  const toggleAutomationMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return apiRequest("PATCH", `/api/automations/${automation.id}`, { enabled });
    },
    onSuccess: () => {
      toast({ title: "Automation updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
    },
    onError: () => {
      toast({ title: "Failed to update automation", variant: "destructive" });
    }
  });

  // Toggle step mutation
  const toggleStepMutation = useMutation({
    mutationFn: async ({ stepId, enabled }: { stepId: string; enabled: boolean }) => {
      return apiRequest("PATCH", `/api/automation-steps/${stepId}`, { enabled });
    },
    onSuccess: () => {
      toast({ title: "Step updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations", automation.id, "steps"] });
    },
    onError: () => {
      toast({ title: "Failed to update step", variant: "destructive" });
    }
  });

  // Update automation mutation
  const updateAutomationMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const stageId = (updatedData.stageId && updatedData.stageId !== 'global') ? updatedData.stageId : null;
      return apiRequest("PUT", `/api/automations/${automation.id}`, {
        ...updatedData,
        stageId
      });
    },
    onSuccess: () => {
      toast({ title: "Automation updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to update automation", variant: "destructive" });
    }
  });

  const handleToggleAutomation = (enabled: boolean) => {
    toggleAutomationMutation.mutate(enabled);
  };

  const handleToggleStep = (stepId: string, enabled: boolean) => {
    toggleStepMutation.mutate({ stepId, enabled });
  };

  const handleSaveEdit = () => {
    updateAutomationMutation.mutate(editForm);
  };

  const handleCancelEdit = () => {
    setEditForm({
      name: automation.name,
      stageId: automation.stageId || 'global',
      channel: automation.channel,
      enabled: automation.enabled
    });
    setEditDialogOpen(false);
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {automation.channel === 'EMAIL' ? 
            <Mail className="w-4 h-4 text-blue-500" /> : 
            <Smartphone className="w-4 h-4 text-green-500" />
          }
          <div>
            <p className="font-medium">{automation.name}</p>
            <p className="text-sm text-muted-foreground">
              {automation.channel === 'EMAIL' ? 'Email' : 'SMS'} automation
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            data-testid={`button-delete-automation-${automation.id}`}
            onClick={() => {
              if (confirm('Are you sure you want to delete this automation? This cannot be undone.')) {
                onDelete(automation.id);
              }
            }}
          >
            ×
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            data-testid={`button-edit-automation-${automation.id}`}
            onClick={() => setEditDialogOpen(true)}
          >
            <Edit2 className="w-3 h-3" />
          </Button>
          <Badge variant={automation.enabled ? "default" : "secondary"}>
            {automation.enabled ? "Active" : "Inactive"}
          </Badge>
          <Switch 
            checked={automation.enabled}
            disabled={toggleAutomationMutation.isPending}
            data-testid={`switch-automation-${automation.id}`}
            onCheckedChange={handleToggleAutomation}
          />
        </div>
      </div>

      {/* Automation Steps */}
      <div className="ml-7 space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading steps...</p>
        ) : steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No steps configured</p>
        ) : (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">STEPS:</p>
            {steps.map((step: any, index: number) => (
              <div key={step.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                    {index + 1}
                  </span>
                  <span>
                    Wait {step.delayMinutes} min, then send {automation.channel.toLowerCase()}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Switch
                    checked={step.enabled}
                    disabled={toggleStepMutation.isPending}
                    data-testid={`switch-step-${step.id}`}
                    onCheckedChange={(enabled) => handleToggleStep(step.id, enabled)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    disabled={deleteStepMutation.isPending}
                    data-testid={`button-delete-step-${step.id}`}
                    onClick={() => handleDeleteStep(step.id)}
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Automation Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Automation</DialogTitle>
            <DialogDescription>
              Modify the automation settings and click Save to apply changes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Automation Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                placeholder="Enter automation name"
                data-testid={`input-edit-name-${automation.id}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-channel">Channel</Label>
              <Select
                value={editForm.channel}
                onValueChange={(value) => setEditForm({...editForm, channel: value})}
              >
                <SelectTrigger data-testid={`select-edit-channel-${automation.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={editForm.enabled}
                onCheckedChange={(checked) => setEditForm({...editForm, enabled: checked})}
                data-testid={`switch-edit-enabled-${automation.id}`}
              />
              <Label>Enable automation</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              disabled={updateAutomationMutation.isPending}
              data-testid={`button-cancel-edit-${automation.id}`}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateAutomationMutation.isPending || !editForm.name.trim()}
              data-testid={`button-save-edit-${automation.id}`}
            >
              {updateAutomationMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// StageChangeAutomationCard Component
function StageChangeAutomationCard({ automation, onDelete }: { automation: any, onDelete: (id: string) => void }) {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: automation.name,
    enabled: automation.enabled
  });

  // Toggle automation mutation
  const toggleAutomationMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return apiRequest("PATCH", `/api/automations/${automation.id}`, { enabled });
    },
    onSuccess: () => {
      toast({ title: "Pipeline automation updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
    },
    onError: () => {
      toast({ title: "Failed to update pipeline automation", variant: "destructive" });
    }
  });

  // Update automation mutation
  const updateAutomationMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      return apiRequest("PUT", `/api/automations/${automation.id}`, updatedData);
    },
    onSuccess: () => {
      toast({ title: "Pipeline automation updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to update pipeline automation", variant: "destructive" });
    }
  });

  const handleToggleAutomation = (enabled: boolean) => {
    toggleAutomationMutation.mutate(enabled);
  };

  const handleSaveEdit = () => {
    updateAutomationMutation.mutate(editForm);
  };

  const handleCancelEdit = () => {
    setEditForm({
      name: automation.name,
      enabled: automation.enabled
    });
    setEditDialogOpen(false);
  };

  const getTriggerLabel = (triggerType: string) => {
    const triggers = {
      'DEPOSIT_PAID': '💳 Deposit Payment',
      'FULL_PAYMENT_MADE': '✅ Full Payment',
      'PROJECT_BOOKED': '📋 Project Booked',
      'ESTIMATE_ACCEPTED': '📄 Estimate Accepted',
      'EVENT_DATE_REACHED': '📅 Event Date',
      'PROJECT_DELIVERED': '📦 Project Delivered',
      'CLIENT_ONBOARDED': '🎯 Client Onboarded'
    };
    return triggers[triggerType as keyof typeof triggers] || triggerType;
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ArrowRight className="w-4 h-4 text-purple-500" />
          <div>
            <p className="font-medium">{automation.name}</p>
            <p className="text-sm text-muted-foreground">
              Pipeline stage automation
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditDialogOpen(true)}
            data-testid={`button-edit-automation-${automation.id}`}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Switch
            checked={automation.enabled}
            onCheckedChange={handleToggleAutomation}
            disabled={toggleAutomationMutation.isPending}
            data-testid={`switch-toggle-automation-${automation.id}`}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(automation.id)}
            className="text-destructive hover:text-destructive"
            data-testid={`button-delete-automation-${automation.id}`}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground space-y-1">
        <p><strong>Trigger:</strong> {getTriggerLabel(automation.triggerType)}</p>
        <p><strong>Action:</strong> Move to "{automation.targetStage?.name || 'Unknown Stage'}"</p>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-testid={`dialog-edit-automation-${automation.id}`}>
          <DialogHeader>
            <DialogTitle>Edit Pipeline Automation</DialogTitle>
            <DialogDescription>
              Update the pipeline automation settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor={`edit-name-${automation.id}`}>Automation Name</Label>
              <Input
                id={`edit-name-${automation.id}`}
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                data-testid={`input-edit-name-${automation.id}`}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={editForm.enabled}
                onCheckedChange={(checked) => setEditForm({...editForm, enabled: checked})}
                data-testid={`switch-edit-enabled-${automation.id}`}
              />
              <Label>Enable automation</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              disabled={updateAutomationMutation.isPending}
              data-testid={`button-cancel-edit-${automation.id}`}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateAutomationMutation.isPending || !editForm.name.trim()}
              data-testid={`button-save-edit-${automation.id}`}
            >
              {updateAutomationMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Automations() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [countdownDialogOpen, setCountdownDialogOpen] = useState(false);
  const [manageRulesDialogOpen, setManageRulesDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<any>(null);
  const [timingMode, setTimingMode] = useState<'immediate' | 'delayed'>('immediate');
  const [activeProjectType, setActiveProjectType] = useState<string>('WEDDING');
  const [automationType, setAutomationType] = useState<'COMMUNICATION' | 'STAGE_CHANGE'>('COMMUNICATION');

  // Dynamic schema function that updates based on automation type
  const createExtendedFormSchema = (type: 'COMMUNICATION' | 'STAGE_CHANGE') => {
    return createAutomationFormSchema.extend({
      // Communication automation fields
      templateId: z.string().optional(),
      delayMinutes: z.coerce.number().min(0).default(0),
      delayHours: z.coerce.number().min(0).default(0),
      delayDays: z.coerce.number().min(0).default(0),
      questionnaireTemplateId: z.string().optional(), // New field for questionnaire assignments
      // Stage change automation fields
      triggerType: z.string().optional(),
      targetStageId: z.string().optional()
    }).refine(
      (data) => {
        if (type === 'COMMUNICATION') {
          // Communication automations require either a template (for messaging) or questionnaire (for assignment)
          return (data.templateId && data.templateId.length > 0) || 
                 (data.questionnaireTemplateId && data.questionnaireTemplateId.length > 0);
        }
        if (type === 'STAGE_CHANGE') {
          return data.triggerType && data.targetStageId;
        }
        return true;
      },
      {
        message: type === 'COMMUNICATION' 
          ? "Please select a template or questionnaire for the communication automation"
          : "Both trigger type and target stage are required for pipeline automations",
        path: type === 'COMMUNICATION' ? ["templateId"] : ["triggerType"]
      }
    );
  };

  // Memoize the schema to update when automation type changes
  const extendedFormSchema = useMemo(() => createExtendedFormSchema(automationType), [automationType]);
  type ExtendedFormData = z.infer<typeof extendedFormSchema>;

  // Form setup
  const form = useForm<ExtendedFormData>({
    resolver: zodResolver(extendedFormSchema),
    defaultValues: {
      name: "",
      stageId: "",
      channel: "EMAIL",
      enabled: true,
      automationType: "COMMUNICATION",
      templateId: "",
      delayMinutes: 0,
      delayHours: 0,
      delayDays: 0,
      questionnaireTemplateId: "",
      triggerType: "",
      targetStageId: ""
    }
  });

  // Update form values when automation type changes
  useEffect(() => {
    form.clearErrors();
    // Sync automation type with form
    form.setValue('automationType', automationType);
    
    // Reset fields that don't apply to the new automation type
    if (automationType === 'COMMUNICATION') {
      form.setValue('triggerType', '');
      form.setValue('targetStageId', '');
    } else if (automationType === 'STAGE_CHANGE') {
      form.setValue('templateId', '');
      form.setValue('delayMinutes', 0);
      form.setValue('delayHours', 0);
      form.setValue('delayDays', 0);
      form.setValue('questionnaireTemplateId', '');
    }
  }, [automationType, form]);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONALS
  const { data: stages = [], isError: stagesError, isLoading: stagesLoading } = useQuery<any[]>({
    queryKey: ["/api/stages", activeProjectType],
    queryFn: async () => {
      const res = await fetch(`/api/stages?projectType=${activeProjectType}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch stages: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!user
  });

  const { data: automations = [] } = useQuery<any[]>({
    queryKey: ["/api/automations", activeProjectType],
    queryFn: async () => {
      const res = await fetch(`/api/automations?projectType=${activeProjectType}`);
      if (!res.ok) {
        throw new Error('Failed to fetch automations');
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/templates", activeProjectType],
    queryFn: () => fetch(`/api/templates?projectType=${activeProjectType}`).then(res => res.json()),
    enabled: !!user
  });

  const { data: questionnaireTemplates = [] } = useQuery<any[]>({
    queryKey: ["/api/questionnaire-templates"],
    queryFn: () => fetch(`/api/questionnaire-templates`).then(res => res.json()),
    enabled: !!user
  });

  // Delete automation mutation
  const deleteAutomationMutation = useMutation({
    mutationFn: async (automationId: string) => {
      return apiRequest("DELETE", `/api/automations/${automationId}`);
    },
    onSuccess: () => {
      toast({ title: "Automation deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
    },
    onError: () => {
      toast({ title: "Failed to delete automation", variant: "destructive" });
    }
  });

  // Create automation mutation - atomic with rollback
  const createAutomationMutation = useMutation({
    mutationFn: async (data: ExtendedFormData) => {
      // Validate template or questionnaire for communication automations only
      if (data.automationType === 'COMMUNICATION') {
        // Either template or questionnaire must be provided
        if ((!data.templateId || data.templateId === "unavailable") && (!data.questionnaireTemplateId || data.questionnaireTemplateId === "unavailable")) {
          throw new Error("Either a message template or questionnaire assignment is required for communication automation creation");
        }

        // If template is provided, validate it
        if (data.templateId && data.templateId !== "unavailable") {
          // Validate templates are available for selected channel
          const channelTemplates = templates.filter((t: any) => t.channel === data.channel);
          if (channelTemplates.length === 0) {
            throw new Error(`No ${data.channel.toLowerCase()} templates available. Please create templates first.`);
          }

          // Validate selected template exists
          const selectedTemplate = channelTemplates.find((t: any) => t.id === data.templateId);
          if (!selectedTemplate) {
            throw new Error("Selected template is not valid");
          }
        }

        // If questionnaire is provided without template, skip channel validation
        if (data.questionnaireTemplateId && !data.templateId) {
          // Questionnaire-only communication, no channel validation needed
        }
      }

      let automation: any = null;
      try {
        // Create the automation with type-specific data
        const automationData = {
          name: data.name,
          stageId: (data.stageId && data.stageId !== 'global') ? data.stageId : null,
          enabled: data.enabled,
          projectType: activeProjectType,
          automationType: data.automationType,
          // Communication automation fields
          ...(data.automationType === 'COMMUNICATION' && {
            channel: data.channel,
            templateId: data.templateId && data.templateId !== "unavailable" ? data.templateId : null,
            questionnaireTemplateId: data.questionnaireTemplateId && data.questionnaireTemplateId !== "unavailable" && data.questionnaireTemplateId !== "none" ? data.questionnaireTemplateId : null
          }),
          // Pipeline automation fields
          ...(data.automationType === 'STAGE_CHANGE' && {
            triggerType: data.triggerType,
            targetStageId: data.targetStageId
          })
        };

        const response = await apiRequest("POST", "/api/automations", automationData);
        automation = await response.json();
        console.log('Created automation:', automation);
        
        // Create automation step ONLY for communication automations with templates
        if (data.automationType === 'COMMUNICATION' && data.templateId && automation?.id) {
          // Calculate total delay minutes
          const totalDelayMinutes = timingMode === 'immediate' ? 0 : 
            (data.delayDays * 24 * 60) + (data.delayHours * 60) + data.delayMinutes;
          
          // Create the first automation step with template (atomic)
          await apiRequest("POST", `/api/automations/${automation.id}/steps`, {
            stepIndex: 0,
            delayMinutes: totalDelayMinutes,
            templateId: data.templateId,
            enabled: true
          });
        }
        
        return automation;
      } catch (error) {
        // Rollback: delete automation if step creation failed
        if (automation?.id) {
          try {
            await apiRequest("DELETE", `/api/automations/${automation.id}`);
          } catch (rollbackError) {
            console.error('Failed to rollback automation creation:', rollbackError);
          }
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Automation created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setCreateDialogOpen(false);
      form.reset();
      setTimingMode('immediate');
    },
    onError: (error: any) => {
      console.error('Create automation error:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      toast({ 
        title: "Failed to create automation", 
        description: error?.message || "Unknown error occurred",
        variant: "destructive" 
      });
    }
  });

  const handleCreateAutomation = (data: ExtendedFormData) => {
    // Add automation type and appropriate data based on type
    const automationData = {
      ...data,
      automationType,
      projectType: activeProjectType,
      // Communication automation fields
      ...(automationType === 'COMMUNICATION' && {
        stageId: (data.stageId && data.stageId !== 'global') ? data.stageId : null,
        channel: data.channel,
        templateId: data.templateId,
        questionnaireTemplateId: data.questionnaireTemplateId || null
      }),
      // Pipeline automation fields
      ...(automationType === 'STAGE_CHANGE' && {
        triggerType: data.triggerType,
        targetStageId: data.targetStageId
      })
    };

    createAutomationMutation.mutate(automationData);
  };

  const handleDeleteAutomation = (automationId: string) => {
    deleteAutomationMutation.mutate(automationId);
  };

  // Countdown automation form schema and setup
  const countdownFormSchema = createAutomationFormSchema.extend({
    daysBefore: z.coerce.number().min(1, "Must be at least 1 day").max(365, "Cannot exceed 365 days").default(7),
    eventType: z.string().min(1, "Event type is required"),
    stageCondition: z.string().optional(),
    templateId: z.string().min(1, "Template is required")
  });
  type CountdownFormData = z.infer<typeof countdownFormSchema>;

  // Countdown form instance
  const countdownForm = useForm<CountdownFormData>({
    resolver: zodResolver(countdownFormSchema),
    defaultValues: {
      name: "",
      enabled: true,
      automationType: "COUNTDOWN",
      channel: "EMAIL",
      daysBefore: 7,
      eventType: "",
      stageCondition: "",
      templateId: ""
    }
  });

  // Countdown automation creation mutation
  const createCountdownAutomationMutation = useMutation({
    mutationFn: async (data: CountdownFormData) => {
      // Validate templates are available for selected channel
      const channelTemplates = templates.filter((t: any) => t.channel === data.channel);
      if (channelTemplates.length === 0) {
        throw new Error(`No ${data.channel.toLowerCase()} templates available. Please create templates first.`);
      }

      // Validate selected template exists
      const selectedTemplate = channelTemplates.find((t: any) => t.id === data.templateId);
      if (!selectedTemplate) {
        throw new Error("Selected template is not valid");
      }

      const automationData = {
        ...data,
        automationType: "COUNTDOWN" as const,
        projectType: activeProjectType,
        // Set stage condition to null if empty string
        stageCondition: data.stageCondition || null
      };

      const response = await apiRequest("POST", "/api/automations", automationData);
      const automation = await response.json();
      console.log('Created countdown automation:', automation);
      return automation;
    },
    onSuccess: () => {
      toast({ title: "Countdown automation created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setCountdownDialogOpen(false);
      countdownForm.reset();
    },
    onError: (error: any) => {
      console.error('Create countdown automation error:', error);
      toast({ 
        title: "Failed to create countdown automation", 
        description: error?.message || "Unknown error occurred",
        variant: "destructive" 
      });
    }
  });

  const handleCreateCountdownAutomation = (data: CountdownFormData) => {
    createCountdownAutomationMutation.mutate(data);
  };

  // Redirect to login if not authenticated
  if (!loading && !user) {
    setLocation("/login");
    return null;
  }

  if (loading) {
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
        <header className="bg-card border-b border-border px-4 md:px-6 py-4 relative">
          {/* Hamburger menu positioned absolutely at top-right */}
          <SidebarTrigger 
            data-testid="button-menu-toggle" 
            className="hidden md:inline-flex" 
          />
          
          {/* Mobile layout */}
          <div className="pr-12 md:pr-0">
            <h1 className="text-xl md:text-2xl font-semibold">Automations</h1>
            <p className="text-sm md:text-base text-muted-foreground">Set up automated email and SMS workflows for each stage</p>
          </div>
        </header>
        
        {/* Create Automation Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Automation</DialogTitle>
                  <DialogDescription>
                    Set up a new automated workflow for your clients
                  </DialogDescription>
                </DialogHeader>
                
                <Form key={automationType} {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateAutomation)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Automation Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Welcome Email, Follow-up SMS"
                              data-testid="input-automation-name"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Automation Type Selector */}
                    <div className="space-y-3">
                      <FormLabel>Automation Type</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={automationType === 'COMMUNICATION' ? 'default' : 'outline'}
                          className="w-full justify-start"
                          onClick={() => setAutomationType('COMMUNICATION')}
                          data-testid="button-automation-communication"
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Communication
                        </Button>
                        <Button
                          type="button"
                          variant={automationType === 'STAGE_CHANGE' ? 'default' : 'outline'}
                          className="w-full justify-start"
                          onClick={() => setAutomationType('STAGE_CHANGE')}
                          data-testid="button-automation-pipeline"
                        >
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Pipeline Stage
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {automationType === 'COMMUNICATION' 
                          ? 'Send automated emails and SMS to clients when they enter specific stages'
                          : 'Automatically move clients through pipeline stages based on business triggers'
                        }
                      </p>
                    </div>

                    {/* Communication Automation Fields */}
                    {automationType === 'COMMUNICATION' && (
                      <>
                        <FormField
                          control={form.control}
                          name="stageId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trigger Stage (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-stage">
                                <SelectValue placeholder="Select a stage or leave empty for global" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="global">No specific stage (Global)</SelectItem>
                              {stages?.map((stage: any) => (
                                <SelectItem key={stage.id} value={stage.id}>
                                  {stage.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="channel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Communication Channel</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-channel">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="EMAIL">📧 Email</SelectItem>
                              <SelectItem value="SMS">📱 SMS</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="templateId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message Template</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-template">
                                <SelectValue placeholder="Select a template" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {templates
                                .filter((t: any) => t.channel === form.watch('channel'))
                                .map((template: any) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name}
                                  </SelectItem>
                                ))}
                              {templates.filter((t: any) => t.channel === form.watch('channel')).length === 0 && (
                                <SelectItem value="unavailable" disabled>
                                  No {form.watch('channel').toLowerCase()} templates available - create templates first
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="questionnaireTemplateId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Questionnaire Assignment (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-questionnaire">
                                <SelectValue placeholder="Optionally assign a questionnaire" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No questionnaire assignment</SelectItem>
                              {questionnaireTemplates?.map((questionnaire: any) => (
                                <SelectItem key={questionnaire.id} value={questionnaire.id}>
                                  📋 {questionnaire.name}
                                </SelectItem>
                              ))}
                              {questionnaireTemplates?.length === 0 && (
                                <SelectItem value="unavailable" disabled>
                                  No questionnaire templates available - create questionnaires first
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <FormLabel>Send Timing</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={timingMode === 'immediate' ? 'default' : 'outline'}
                          className="w-full"
                          onClick={() => setTimingMode('immediate')}
                          data-testid="button-timing-immediate"
                        >
                          Send Immediately
                        </Button>
                        <Button
                          type="button"
                          variant={timingMode === 'delayed' ? 'default' : 'outline'}
                          className="w-full"
                          onClick={() => setTimingMode('delayed')}
                          data-testid="button-timing-delayed"
                        >
                          Send After Delay
                        </Button>
                      </div>

                      {timingMode === 'delayed' && (
                        <div className="grid grid-cols-3 gap-2 pt-2">
                          <FormField
                            control={form.control}
                            name="delayDays"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Days</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    data-testid="input-delay-days"
                                    {...field}
                                    onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="delayHours"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Hours</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="23"
                                    placeholder="0"
                                    data-testid="input-delay-hours"
                                    {...field}
                                    onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="delayMinutes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Minutes</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="59"
                                    placeholder="0"
                                    data-testid="input-delay-minutes"
                                    {...field}
                                    onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                      </>
                    )}

                    {/* Pipeline Stage Change Automation Fields */}
                    {automationType === 'STAGE_CHANGE' && (
                      <>
                        <FormField
                          control={form.control}
                          name="triggerType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Trigger</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-trigger">
                                    <SelectValue placeholder="Select when this automation should trigger" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="DEPOSIT_PAID">💳 Deposit Payment Received</SelectItem>
                                  <SelectItem value="FULL_PAYMENT_MADE">✅ Full Payment Completed</SelectItem>
                                  <SelectItem value="PROJECT_BOOKED">📋 Project Booked/Contract Signed</SelectItem>
                                  <SelectItem value="ESTIMATE_ACCEPTED">📄 Estimate Accepted</SelectItem>
                                  <SelectItem value="EVENT_DATE_REACHED">📅 Event Date Reached</SelectItem>
                                  <SelectItem value="PROJECT_DELIVERED">📦 Project Delivered</SelectItem>
                                  <SelectItem value="CLIENT_ONBOARDED">🎯 Client Onboarded</SelectItem>
                                  <SelectItem value="APPOINTMENT_BOOKED">📅 Appointment Booked</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="targetStageId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Move Project To Stage</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-target-stage">
                                    <SelectValue placeholder="Select destination stage" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {stages?.map((stage: any) => (
                                    <SelectItem key={stage.id} value={stage.id}>
                                      {stage.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}


                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button" 
                        variant="outline"
                        onClick={() => setCreateDialogOpen(false)}
                        data-testid="button-cancel-automation"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={
                          createAutomationMutation.isPending ||
                          (() => {
                            // Different validation for different automation types
                            if (automationType === 'COMMUNICATION') {
                              const hasTemplate = form.watch('templateId') && form.watch('templateId') !== 'unavailable';
                              const hasQuestionnaire = form.watch('questionnaireTemplateId') && form.watch('questionnaireTemplateId') !== 'unavailable' && form.watch('questionnaireTemplateId') !== 'none';
                              return !hasTemplate && !hasQuestionnaire;
                            }
                            if (automationType === 'STAGE_CHANGE') {
                              return !form.watch('triggerType') || !form.watch('targetStageId');
                            }
                            return false;
                          })()
                        }
                        data-testid="button-submit-automation"
                      >
                        {createAutomationMutation.isPending 
                          ? "Creating..." 
                          : (() => {
                              if (automationType === 'COMMUNICATION') {
                                const hasTemplate = form.watch('templateId') && form.watch('templateId') !== 'unavailable';
                                const hasQuestionnaire = form.watch('questionnaireTemplateId') && form.watch('questionnaireTemplateId') !== 'unavailable' && form.watch('questionnaireTemplateId') !== 'none';
                                if (!hasTemplate && !hasQuestionnaire) {
                                  return "Select template or questionnaire";
                                }
                              }
                              if (automationType === 'STAGE_CHANGE') {
                                if (!form.watch('triggerType') || !form.watch('targetStageId')) {
                                  return "Complete all fields";
                                }
                              }
                              return "Create Stage Automation";
                            })()
                        }
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

        {/* Countdown Automation Dialog */}
        <Dialog open={countdownDialogOpen} onOpenChange={setCountdownDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Event Countdown Automation</DialogTitle>
              <DialogDescription>
                Set up time-based messaging leading up to event dates
              </DialogDescription>
            </DialogHeader>
            
            <Form {...countdownForm}>
              <form onSubmit={countdownForm.handleSubmit(handleCreateCountdownAutomation)} className="space-y-4">
                <FormField
                  control={countdownForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Automation Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Event Reminder - 7 days before"
                          data-testid="input-countdown-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={countdownForm.control}
                  name="daysBefore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days Before Event</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          placeholder="7"
                          data-testid="input-days-before"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        How many days before the event should this trigger?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={countdownForm.control}
                  name="eventType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-countdown-event-type">
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="event_date">📅 Event Date</SelectItem>
                          <SelectItem value="delivery_date">📦 Delivery Date</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Which date field should trigger this countdown?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={countdownForm.control}
                  name="stageCondition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stage Condition (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-countdown-stage-condition">
                            <SelectValue placeholder="Any stage (no condition)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Any stage (no condition)</SelectItem>
                          {stages?.map((stage: any) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              Only if in: {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Only trigger if the client is in a specific stage
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={countdownForm.control}
                  name="channel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Communication Channel</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "EMAIL"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-countdown-channel">
                            <SelectValue placeholder="Select channel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EMAIL">📧 Email</SelectItem>
                          <SelectItem value="SMS">📱 SMS</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={countdownForm.control}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message Template</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-countdown-template">
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates.filter((t: any) => t.channel === countdownForm.watch('channel')).length > 0 ? (
                            templates
                              .filter((t: any) => t.channel === countdownForm.watch('channel'))
                              .map((template: any) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))
                          ) : (
                            <SelectItem value="unavailable" disabled>
                              No {countdownForm.watch('channel')?.toLowerCase()} templates available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Template to send before the event date
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button" 
                    variant="outline"
                    onClick={() => setCountdownDialogOpen(false)}
                    data-testid="button-cancel-countdown"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={
                      createCountdownAutomationMutation.isPending ||
                      !countdownForm.watch('name')?.trim() ||
                      !countdownForm.watch('daysBefore') ||
                      !countdownForm.watch('eventType') ||
                      !countdownForm.watch('templateId') ||
                      countdownForm.watch('templateId') === 'unavailable'
                    }
                    data-testid="button-submit-countdown"
                  >
                    {createCountdownAutomationMutation.isPending 
                      ? "Creating..." 
                      : (() => {
                          const templatesForChannel = templates.filter((t: any) => t.channel === countdownForm.watch('channel'));
                          if (templatesForChannel.length === 0) {
                            return `Create ${countdownForm.watch('channel')?.toLowerCase()} templates first`;
                          }
                          if (!countdownForm.watch('name')?.trim() || 
                              !countdownForm.watch('daysBefore') || 
                              !countdownForm.watch('eventType') || 
                              !countdownForm.watch('templateId') ||
                              countdownForm.watch('templateId') === 'unavailable') {
                            return "Complete all fields";
                          }
                          return "Create Countdown Automation";
                        })()
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Manage Rules Modal */}
        <Dialog open={manageRulesDialogOpen} onOpenChange={setManageRulesDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Manage Rules - {selectedStage?.name} Stage
              </DialogTitle>
              <DialogDescription>
                Configure automation rules for clients in the {selectedStage?.name} stage
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Existing automations for this stage */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3">Current Rules</h4>
                <div className="space-y-2">
                  {(() => {
                    const stageAutomations = (automations ?? []).filter((a: any) => a.stageId === selectedStage?.id);
                    return automations === undefined ? (
                      <p className="text-muted-foreground text-center py-4">
                        Loading automation rules...
                      </p>
                    ) : stageAutomations.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No automation rules configured for this stage yet.
                      </p>
                    ) : (
                      stageAutomations.map((automation: any) => (
                        automation.automationType === 'COMMUNICATION' ? (
                          <AutomationStepManager key={automation.id} automation={automation} onDelete={handleDeleteAutomation} />
                        ) : (
                          <StageChangeAutomationCard key={automation.id} automation={automation} onDelete={handleDeleteAutomation} />
                        )
                      ))
                    );
                  })()}
                </div>
              </div>

              {/* Add new rule section */}
              <div className="text-center py-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  To add more automation rules for this stage, use the main "Create Automation" button.
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setManageRulesDialogOpen(false)}
                  data-testid="button-close-manage-rules"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="p-6 space-y-6">
          {/* Project Type Selection */}
          <Tabs value={activeProjectType} onValueChange={setActiveProjectType} className="w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              {/* Desktop tabs */}
              <TabsList className="hidden md:grid w-full grid-cols-5 max-w-3xl">
                <TabsTrigger value="WEDDING" data-testid="tab-wedding">💒 Wedding</TabsTrigger>
                <TabsTrigger value="ENGAGEMENT" data-testid="tab-engagement">💍 Engagement</TabsTrigger>
                <TabsTrigger value="PORTRAIT" data-testid="tab-portrait">🎭 Portrait</TabsTrigger>
                <TabsTrigger value="CORPORATE" data-testid="tab-corporate">🏢 Corporate</TabsTrigger>
                <TabsTrigger value="EVENT" data-testid="tab-event">🎉 Event</TabsTrigger>
              </TabsList>
              
              {/* Mobile dropdown and button */}
              <div className="flex flex-col sm:flex-row gap-4 md:hidden w-full">
                <Select value={activeProjectType} onValueChange={setActiveProjectType}>
                  <SelectTrigger className="w-full sm:max-w-xs" data-testid="select-project-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEDDING">💒 Wedding</SelectItem>
                    <SelectItem value="ENGAGEMENT">💍 Engagement</SelectItem>
                    <SelectItem value="PORTRAIT">🎭 Portrait</SelectItem>
                    <SelectItem value="CORPORATE">🏢 Corporate</SelectItem>
                    <SelectItem value="EVENT">🎉 Event</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  data-testid="button-create-automation"
                  className="w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Automation
                </Button>
              </div>
              
              {/* Desktop button */}
              <Button
                onClick={() => setCreateDialogOpen(true)}
                data-testid="button-create-automation"
                className="hidden md:flex"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Automation
              </Button>
            </div>

            {Object.keys(projectTypeEnum).map((projectType) => (
              <TabsContent key={projectType} value={projectType} className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Automations</CardTitle>
                      <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {automations?.filter((a: any) => a.enabled).length || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">Running workflows</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Stages</CardTitle>
                      <Settings className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stages?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">Pipeline stages</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Templates</CardTitle>
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{templates?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">Available templates</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Two-Level Automation Architecture with Tabs */}
                <Tabs defaultValue="stage-based" className="w-full">
                  <TabsList className="flex flex-col md:grid w-full md:grid-cols-2 h-auto md:h-10">
                    <TabsTrigger value="stage-based" className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Stage-Based Automations
                    </TabsTrigger>
                    <TabsTrigger value="event-countdown" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Event Countdown Automations
                    </TabsTrigger>
                  </TabsList>

                  {/* Stage-Based Automations Tab */}
                  <TabsContent value="stage-based" className="mt-6">
                    <Card>
                      <CardHeader>
                        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                          <div>
                            <CardTitle className="flex items-center">
                              <Settings className="w-5 h-5 mr-3 text-blue-500" />
                              Stage-Based Automations
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              Triggered when clients enter specific pipeline stages
                            </p>
                          </div>
                          <Button 
                            onClick={() => {
                              setAutomationType('COMMUNICATION');
                              setCreateDialogOpen(true);
                            }}
                            data-testid="button-add-stage-automation"
                            className="w-full md:w-auto"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Stage Automation
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {(() => {
                            const stageBasedAutomations = (automations ?? []).filter((a: any) => 
                              a.automationType === 'COMMUNICATION' || a.automationType === 'STAGE_CHANGE'
                            );
                            
                            if (stageBasedAutomations.length === 0) {
                              return (
                                <div className="text-center py-8">
                                  <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                  <p className="text-muted-foreground">No stage-based automations configured yet.</p>
                                  <p className="text-sm text-muted-foreground">Create automations that trigger when clients move to specific stages.</p>
                                </div>
                              );
                            }
                            
                            return stageBasedAutomations.map((automation: any) => (
                              automation.automationType === 'COMMUNICATION' ? (
                                <AutomationStepManager key={automation.id} automation={automation} onDelete={handleDeleteAutomation} />
                              ) : (
                                <StageChangeAutomationCard key={automation.id} automation={automation} onDelete={handleDeleteAutomation} />
                              )
                            ));
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Event Countdown Automations Tab */}
                  <TabsContent value="event-countdown" className="mt-6">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center">
                              <Calendar className="w-5 h-5 mr-3 text-green-500" />
                              Event Countdown Automations
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              Triggered by days remaining until event dates
                            </p>
                          </div>
                          <Button 
                            onClick={() => setCountdownDialogOpen(true)}
                            data-testid="button-add-countdown-automation"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Countdown Automation
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {(() => {
                            const countdownAutomations = (automations ?? []).filter((a: any) => 
                              a.automationType === 'COUNTDOWN'
                            );
                            
                            if (countdownAutomations.length === 0) {
                              return (
                                <div className="text-center py-8">
                                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                  <p className="text-muted-foreground">No countdown automations configured yet.</p>
                                  <p className="text-sm text-muted-foreground">Create time-based reminders leading up to event dates.</p>
                                </div>
                              );
                            }
                            
                            return countdownAutomations.map((automation: any) => (
                              <AutomationStepManager key={automation.id} automation={automation} onDelete={handleDeleteAutomation} />
                            ));
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
