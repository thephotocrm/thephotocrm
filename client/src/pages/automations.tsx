import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [enableCommunication, setEnableCommunication] = useState(true);
  const [enablePipeline, setEnablePipeline] = useState(false);

  // Unified form schema that supports both automation types with optional sections
  const unifiedFormSchema = createAutomationFormSchema.extend({
    // Optional automation type flags
    enableCommunication: z.boolean().default(true),
    enablePipeline: z.boolean().default(false),
    // Communication automation fields
    channel: z.string().default("EMAIL"),
    templateId: z.string().optional(),
    delayMinutes: z.coerce.number().min(0).default(0),
    delayHours: z.coerce.number().min(0).default(0),
    delayDays: z.coerce.number().min(0).default(0),
    questionnaireTemplateId: z.string().optional(),
    // Pipeline automation fields
    triggerType: z.string().optional(),
    targetStageId: z.string().optional()
  }).refine(
    (data) => {
      // At least one automation type must be enabled
      if (!data.enableCommunication && !data.enablePipeline) {
        return false;
      }
      // If communication is enabled, require either template or questionnaire
      if (data.enableCommunication) {
        const hasTemplate = data.templateId && data.templateId.length > 0 && data.templateId !== "unavailable";
        const hasQuestionnaire = data.questionnaireTemplateId && data.questionnaireTemplateId.length > 0 && data.questionnaireTemplateId !== "none" && data.questionnaireTemplateId !== "unavailable";
        if (!hasTemplate && !hasQuestionnaire) {
          return false;
        }
      }
      // If pipeline is enabled, require trigger and target stage
      if (data.enablePipeline) {
        if (!data.triggerType || !data.targetStageId) {
          return false;
        }
      }
      return true;
    },
    {
      message: "Please enable at least one automation type and complete all required fields",
      path: ["enableCommunication"]
    }
  );
  
  type UnifiedFormData = z.infer<typeof unifiedFormSchema>;

  // Form setup
  const form = useForm<UnifiedFormData>({
    resolver: zodResolver(unifiedFormSchema),
    defaultValues: {
      name: "",
      stageId: "",
      channel: "EMAIL", 
      enabled: true,
      automationType: "COMMUNICATION", // Still needed for backend compatibility
      enableCommunication: true,
      enablePipeline: false,
      templateId: "",
      delayMinutes: 0,
      delayHours: 0,
      delayDays: 0,
      questionnaireTemplateId: "",
      triggerType: "",
      targetStageId: ""
    }
  });

  // Update form values when enable flags change
  useEffect(() => {
    form.clearErrors();
    // Sync enable flags with form
    form.setValue('enableCommunication', enableCommunication);
    form.setValue('enablePipeline', enablePipeline);
    
    // Reset fields that don't apply to disabled automation types
    if (!enableCommunication) {
      form.setValue('templateId', '');
      form.setValue('delayMinutes', 0);
      form.setValue('delayHours', 0);
      form.setValue('delayDays', 0);
      form.setValue('questionnaireTemplateId', '');
      form.setValue('channel', 'EMAIL');
    }
    if (!enablePipeline) {
      form.setValue('triggerType', '');
      form.setValue('targetStageId', '');
    }
  }, [enableCommunication, enablePipeline, form]);

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

  // Create unified automation mutation - handles both automation types
  const createAutomationMutation = useMutation({
    mutationFn: async (data: UnifiedFormData) => {
      const createdAutomations: any[] = [];
      
      try {
        // Create communication automation if enabled
        if (data.enableCommunication) {
          // Validate communication automation data
          if (data.templateId && data.templateId !== "unavailable") {
            const channelTemplates = templates.filter((t: any) => t.channel === data.channel);
            if (channelTemplates.length === 0) {
              throw new Error(`No ${data.channel.toLowerCase()} templates available. Please create templates first.`);
            }
            const selectedTemplate = channelTemplates.find((t: any) => t.id === data.templateId);
            if (!selectedTemplate) {
              throw new Error("Selected template is not valid");
            }
          }

          const commAutomationData = {
            name: data.name + (data.enablePipeline ? " (Communication)" : ""),
            stageId: (data.stageId && data.stageId !== 'global') ? data.stageId : null,
            enabled: data.enabled,
            projectType: activeProjectType,
            automationType: "COMMUNICATION" as const,
            channel: data.channel,
            templateId: data.templateId && data.templateId !== "unavailable" ? data.templateId : null,
            questionnaireTemplateId: data.questionnaireTemplateId && data.questionnaireTemplateId !== "unavailable" && data.questionnaireTemplateId !== "none" ? data.questionnaireTemplateId : null
          };

          const commResponse = await apiRequest("POST", "/api/automations", commAutomationData);
          const commAutomation = await commResponse.json();
          createdAutomations.push(commAutomation);
          
          // Create automation step for communication (with templates or questionnaires)
          const hasTemplate = data.templateId && data.templateId !== "unavailable";
          const hasQuestionnaire = data.questionnaireTemplateId && data.questionnaireTemplateId !== "unavailable" && data.questionnaireTemplateId !== "none";
          
          if (hasTemplate || hasQuestionnaire) {
            const totalDelayMinutes = timingMode === 'immediate' ? 0 : 
              (data.delayDays * 24 * 60) + (data.delayHours * 60) + data.delayMinutes;
            
            const stepData: any = {
              stepIndex: 0,
              delayMinutes: totalDelayMinutes,
              enabled: true
            };
            
            // Add templateId only if we have a template (questionnaire-only steps don't need templateId)
            if (hasTemplate) {
              stepData.templateId = data.templateId;
            }
            
            await apiRequest("POST", `/api/automations/${commAutomation.id}/steps`, stepData);
          }
        }

        // Create pipeline automation if enabled
        if (data.enablePipeline) {
          const pipelineAutomationData = {
            name: data.name + (data.enableCommunication ? " (Pipeline)" : ""),
            stageId: (data.stageId && data.stageId !== 'global') ? data.stageId : null,
            enabled: data.enabled,
            projectType: activeProjectType,
            automationType: "STAGE_CHANGE" as const,
            triggerType: data.triggerType,
            targetStageId: data.targetStageId
          };

          const pipelineResponse = await apiRequest("POST", "/api/automations", pipelineAutomationData);
          const pipelineAutomation = await pipelineResponse.json();
          createdAutomations.push(pipelineAutomation);
        }
        
        return createdAutomations;
      } catch (error) {
        // Rollback: delete any created automations
        for (const automation of createdAutomations) {
          try {
            await apiRequest("DELETE", `/api/automations/${automation.id}`);
          } catch (rollbackError) {
            console.error('Failed to rollback automation creation:', rollbackError);
          }
        }
        throw error;
      }
    },
    onSuccess: (createdAutomations) => {
      const count = createdAutomations.length;
      toast({ 
        title: `${count > 1 ? 'Automations' : 'Automation'} created successfully`,
        description: `Created ${count} automation${count > 1 ? 's' : ''} successfully.`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setCreateDialogOpen(false);
      form.reset();
      setTimingMode('immediate');
      setEnableCommunication(true);
      setEnablePipeline(false);
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

  const handleCreateAutomation = (data: UnifiedFormData) => {
    createAutomationMutation.mutate(data);
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
    <div>
        {/* Header */}
        <header className="bg-card border-b border-border px-4 md:px-6 py-4 relative">
          
          {/* Mobile layout */}
          <div>
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
                
                <Form {...form}>
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

                    {/* Trigger Stage - Common Field */}
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
                          <FormDescription>
                            Select a stage to trigger this automation, or leave global for all stages
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Automation Actions Section */}
                    <div className="space-y-4">
                      <FormLabel>Automation Actions</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Choose which actions this automation should perform. You can enable both types for comprehensive workflows.
                      </p>
                      
                      {/* Communication Actions Toggle */}
                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                        <Switch
                          checked={enableCommunication}
                          onCheckedChange={setEnableCommunication}
                          data-testid="switch-enable-communication"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4" />
                            <Label className="font-medium">Send Communication</Label>
                          </div>
                          <p className="text-xs text-muted-foreground">Send automated emails, SMS, or assign questionnaires</p>
                        </div>
                      </div>

                      {/* Pipeline Actions Toggle */}
                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                        <Switch
                          checked={enablePipeline}
                          onCheckedChange={setEnablePipeline}
                          data-testid="switch-enable-pipeline"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <ArrowRight className="h-4 w-4" />
                            <Label className="font-medium">Move Through Pipeline</Label>
                          </div>
                          <p className="text-xs text-muted-foreground">Automatically move projects to different stages</p>
                        </div>
                      </div>
                    </div>

                    {/* Communication Automation Fields */}
                    {enableCommunication && (
                      <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-blue-600" />
                          <Label className="font-medium text-blue-900 dark:text-blue-100">Communication Settings</Label>
                        </div>

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
                      </div>
                    )}

                    {/* Pipeline Stage Change Automation Fields */}
                    {enablePipeline && (
                      <div className="space-y-4 p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
                        <div className="flex items-center space-x-2">
                          <ArrowRight className="h-4 w-4 text-green-600" />
                          <Label className="font-medium text-green-900 dark:text-green-100">Pipeline Settings</Label>
                        </div>
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
                      </div>
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
                            // At least one automation type must be enabled
                            if (!enableCommunication && !enablePipeline) {
                              return true;
                            }
                            
                            // Validate communication fields if enabled
                            if (enableCommunication) {
                              const hasTemplate = form.watch('templateId') && form.watch('templateId') !== 'unavailable';
                              const hasQuestionnaire = form.watch('questionnaireTemplateId') && form.watch('questionnaireTemplateId') !== 'unavailable' && form.watch('questionnaireTemplateId') !== 'none';
                              if (!hasTemplate && !hasQuestionnaire) {
                                return true;
                              }
                            }
                            
                            // Validate pipeline fields if enabled
                            if (enablePipeline) {
                              if (!form.watch('triggerType') || !form.watch('targetStageId')) {
                                return true;
                              }
                            }
                            
                            return false;
                          })()
                        }
                        data-testid="button-submit-automation"
                      >
                        {createAutomationMutation.isPending 
                          ? "Creating..." 
                          : (() => {
                              // At least one automation type must be enabled
                              if (!enableCommunication && !enablePipeline) {
                                return "Enable at least one action";
                              }
                              
                              // Validate communication fields if enabled
                              if (enableCommunication) {
                                const hasTemplate = form.watch('templateId') && form.watch('templateId') !== 'unavailable';
                                const hasQuestionnaire = form.watch('questionnaireTemplateId') && form.watch('questionnaireTemplateId') !== 'unavailable' && form.watch('questionnaireTemplateId') !== 'none';
                                if (!hasTemplate && !hasQuestionnaire) {
                                  return "Select template or questionnaire";
                                }
                              }
                              
                              // Validate pipeline fields if enabled
                              if (enablePipeline) {
                                if (!form.watch('triggerType') || !form.watch('targetStageId')) {
                                  return "Complete pipeline fields";
                                }
                              }
                              
                              const actions = [];
                              if (enableCommunication) actions.push("Communication");
                              if (enablePipeline) actions.push("Pipeline");
                              
                              return `Create ${actions.join(" + ")} Automation${actions.length > 1 ? "s" : ""}`;
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

        <div className="p-3 sm:p-6 space-y-6">
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
                <div className="hidden md:grid md:grid-cols-3 gap-6">
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
    </div>
  );
}
