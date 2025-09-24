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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Zap, Clock, Mail, Smartphone, Settings, Edit2, ArrowRight, Calendar, Users, AlertCircle } from "lucide-react";
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
    // Unified trigger settings
    triggerMode: z.enum(['STAGE', 'BUSINESS']).default('STAGE'),
    triggerStageId: z.string().optional(), // For stage-based triggers
    triggerEvent: z.string().optional(), // For business event triggers
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
    // Pipeline automation fields (simplified - only target stage)
    targetStageId: z.string().optional()
  }).refine(
    (data) => {
      // At least one automation type must be enabled
      if (!data.enableCommunication && !data.enablePipeline) {
        return false;
      }
      // Validate trigger settings
      if (data.triggerMode === 'STAGE') {
        if (!data.triggerStageId) {
          return false;
        }
      } else if (data.triggerMode === 'BUSINESS') {
        if (!data.triggerEvent) {
          return false;
        }
      }
      // If communication is enabled, require either template or questionnaire
      if (data.enableCommunication) {
        const hasTemplate = data.templateId && data.templateId.length > 0 && data.templateId !== "unavailable";
        const hasQuestionnaire = data.questionnaireTemplateId && data.questionnaireTemplateId.length > 0 && data.questionnaireTemplateId !== "none" && data.questionnaireTemplateId !== "unavailable";
        if (!hasTemplate && !hasQuestionnaire) {
          return false;
        }
      }
      // If pipeline is enabled, require target stage
      if (data.enablePipeline) {
        if (!data.targetStageId) {
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
      stageId: "", // Legacy field for backend compatibility
      triggerMode: "STAGE" as const,
      triggerStageId: "",
      triggerEvent: "",
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
          // Phase 1: Only allow stage-based triggers for communication
          if (data.triggerMode === 'BUSINESS') {
            throw new Error("Business event triggers for communication automations are coming soon. Please use stage-based triggers for now.");
          }

          // Validate communication automation data
          if (data.templateId && data.templateId !== "unavailable") {
            const channelTemplates = templates.filter((t: any) => t.channel === data.channel);
            if (channelTemplates.length === 0) {
              throw new Error(`No ${data.channel?.toLowerCase() || 'selected'} templates available. Please create templates first.`);
            }
            const selectedTemplate = channelTemplates.find((t: any) => t.id === data.templateId);
            if (!selectedTemplate) {
              throw new Error("Selected template is not valid");
            }
          }

          // Map unified trigger to communication automation format
          const stageId = data.triggerMode === 'STAGE' 
            ? (data.triggerStageId && data.triggerStageId !== 'global' ? data.triggerStageId : null)
            : null;

          const commAutomationData = {
            name: data.name + (data.enablePipeline ? " (Communication)" : ""),
            stageId: stageId,
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
          // Phase 1: Only support business event triggers for pipeline automations
          if (data.triggerMode === 'STAGE') {
            throw new Error("Stage-based pipeline automations are coming soon. Please use business event triggers for pipeline automations for now.");
          }

          // Map business event trigger to pipeline automation format
          const triggerType = data.triggerEvent || '';
          if (!triggerType) {
            throw new Error("Business event trigger is required for pipeline automations");
          }

          const pipelineAutomationData = {
            name: data.name + (data.enableCommunication ? " (Pipeline)" : ""),
            stageId: null, // Pipeline automations don't use stageId
            enabled: data.enabled,
            projectType: activeProjectType,
            automationType: "STAGE_CHANGE" as const,
            triggerType: triggerType,
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
        throw new Error(`No ${data.channel?.toLowerCase() || 'selected'} templates available. Please create templates first.`);
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
              <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[92vh] p-0 flex flex-col overflow-hidden">
                  <DialogHeader className="sticky top-0 z-10 bg-background px-6 py-4 border-b">
                    <DialogTitle>Create Automation</DialogTitle>
                    <DialogDescription>
                      Set up a new automated workflow for your clients
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleCreateAutomation)} className="flex flex-col min-h-0 flex-1">
                      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">
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

                    {/* Unified Trigger Section */}
                    <div className="space-y-4 p-4 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
                      <div className="flex items-center space-x-2">
                        <Settings className="h-4 w-4 text-amber-600" />
                        <Label className="font-medium text-amber-900 dark:text-amber-100">Automation Trigger</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Choose what will trigger this automation to run
                      </p>

                      {/* Trigger Mode Radio Buttons */}
                      <FormField
                        control={form.control}
                        name="triggerMode"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex flex-col space-y-2"
                                data-testid="radio-trigger-mode"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="STAGE" id="trigger-stage" data-testid="radio-trigger-stage" />
                                  <Label htmlFor="trigger-stage" className="flex items-center space-x-2 cursor-pointer">
                                    <Users className="h-4 w-4" />
                                    <span>Stage-based - When client enters a specific stage</span>
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="BUSINESS" id="trigger-business" data-testid="radio-trigger-business" />
                                  <Label htmlFor="trigger-business" className="flex items-center space-x-2 cursor-pointer">
                                    <Zap className="h-4 w-4" />
                                    <span>Business Event - When specific actions occur</span>
                                  </Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Stage-based Trigger Fields */}
                      {form.watch('triggerMode') === 'STAGE' && (
                        <FormField
                          control={form.control}
                          name="triggerStageId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trigger Stage</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-trigger-stage">
                                    <SelectValue placeholder="Select the stage that triggers this automation" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="global">All Stages (Global trigger)</SelectItem>
                                  {stages?.map((stage: any) => (
                                    <SelectItem key={stage.id} value={stage.id}>
                                      {stage.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Automation triggers when a client is moved to this stage
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Business Event Trigger Fields */}
                      {form.watch('triggerMode') === 'BUSINESS' && (
                        <FormField
                          control={form.control}
                          name="triggerEvent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Event</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-trigger-event">
                                    <SelectValue placeholder="Select the business event that triggers this automation" />
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
                              <FormDescription>
                                Automation triggers when this business event occurs for any client
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

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

                    {/* Current Limitations Info */}
                    {(enableCommunication && form.watch('triggerMode') === 'BUSINESS') || (enablePipeline && form.watch('triggerMode') === 'STAGE') ? (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-yellow-800 dark:text-yellow-200">
                            <p className="font-medium mb-1">Current Limitations:</p>
                            <ul className="text-xs space-y-1">
                              {enableCommunication && form.watch('triggerMode') === 'BUSINESS' && (
                                <li>• Business event triggers for communication are coming soon</li>
                              )}
                              {enablePipeline && form.watch('triggerMode') === 'STAGE' && (
                                <li>• Stage-based triggers for pipeline actions are coming soon</li>
                              )}
                            </ul>
                            <p className="text-xs mt-2 opacity-75">Currently supported: Stage triggers for communication, Business events for pipeline</p>
                          </div>
                        </div>
                      </div>
                    ) : null}

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

                    {/* Pipeline Action Fields - Simplified */}
                    {enablePipeline && (
                      <div className="space-y-4 p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
                        <div className="flex items-center space-x-2">
                          <ArrowRight className="h-4 w-4 text-green-600" />
                          <Label className="font-medium text-green-900 dark:text-green-100">Pipeline Action</Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Configure what stage the project should move to when this automation triggers
                        </p>

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
                              <FormDescription>
                                Projects will automatically move to this stage when the automation triggers
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    </div>

                    {/* Footer with Submit Buttons */}
                    <div className="sticky bottom-0 bg-background px-6 py-4 border-t flex justify-end space-x-2">
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
                            
                            // Validate unified trigger settings
                            const triggerMode = form.watch('triggerMode');
                            if (triggerMode === 'STAGE') {
                              if (!form.watch('triggerStageId')) {
                                return true;
                              }
                            } else if (triggerMode === 'BUSINESS') {
                              if (!form.watch('triggerEvent')) {
                                return true;
                              }
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
                              if (!form.watch('targetStageId')) {
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
                              
                              // Validate unified trigger settings
                              const triggerMode = form.watch('triggerMode');
                              if (triggerMode === 'STAGE') {
                                if (!form.watch('triggerStageId')) {
                                  return "Select trigger stage";
                                }
                              } else if (triggerMode === 'BUSINESS') {
                                if (!form.watch('triggerEvent')) {
                                  return "Select business event";
                                }
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
                                if (!form.watch('targetStageId')) {
                                  return "Select target stage";
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

        <div className="min-h-screen bg-background">
          <div className="p-3 sm:p-6 space-y-6">
          {/* Project Type Selection */}
          <div className="w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              {/* Desktop project type buttons */}
              <div className="hidden md:flex flex-wrap gap-2 max-w-3xl">
                {Object.entries(projectTypeEnum).map(([value, _]) => (
                  <Button
                    key={value}
                    variant={activeProjectType === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveProjectType(value as keyof typeof projectTypeEnum)}
                    data-testid={`tab-${value.toLowerCase()}`}
                    className="flex items-center gap-2"
                  >
                    {value === "WEDDING" && "💒 Wedding"}
                    {value === "ENGAGEMENT" && "💍 Engagement"}
                    {value === "PORTRAIT" && "🎭 Portrait"}
                    {value === "CORPORATE" && "🏢 Corporate"}
                    {value === "EVENT" && "🎉 Event"}
                  </Button>
                ))}
              </div>
              
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

            {activeProjectType && (
              <div className="space-y-6">
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

                {/* Unified Automation Interface */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                      <div>
                        <CardTitle className="flex items-center">
                          <Zap className="w-5 h-5 mr-3 text-blue-500" />
                          All Automations
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Automate your workflow with stage triggers, business events, and time-based actions
                        </p>
                      </div>
                      <Button 
                        onClick={() => {
                          setCreateDialogOpen(true);
                        }}
                        data-testid="button-add-automation"
                        className="w-full md:w-auto"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Automation
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(() => {
                        // Get all automations and group them
                        const allAutomations = automations ?? [];
                        
                        if (allAutomations.length === 0) {
                          return (
                            <div className="text-center py-8">
                              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                              <p className="text-muted-foreground">No automations configured yet.</p>
                              <p className="text-sm text-muted-foreground">Create workflows that trigger automatically based on stages, events, or time.</p>
                            </div>
                          );
                        }
                        
                        return allAutomations.map((automation: any) => {
                          // Add trigger type badge to each automation
                          const automationWithBadge = {
                            ...automation,
                            triggerTypeBadge: automation.automationType === 'COUNTDOWN' ? 'Time-based' : 
                                             automation.automationType === 'STAGE_CHANGE' ? 'Business Event' : 'Stage Trigger'
                          };
                          
                          if (automation.automationType === 'COMMUNICATION') {
                            return <AutomationStepManager key={automation.id} automation={automationWithBadge} onDelete={handleDeleteAutomation} />;
                          } else if (automation.automationType === 'STAGE_CHANGE') {
                            return <StageChangeAutomationCard key={automation.id} automation={automationWithBadge} onDelete={handleDeleteAutomation} />;
                          } else if (automation.automationType === 'COUNTDOWN') {
                            return <AutomationStepManager key={automation.id} automation={automationWithBadge} onDelete={handleDeleteAutomation} />;
                          }
                          return null;
                        });
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
