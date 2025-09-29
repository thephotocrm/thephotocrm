import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Zap, Clock, Mail, Smartphone, Settings, Edit2, ArrowRight, Calendar, Users, AlertCircle, Trash2 } from "lucide-react";
import { insertAutomationSchema, projectTypeEnum, automationTypeEnum, triggerTypeEnum } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Create form schema based on insertAutomationSchema but without photographerId (auto-added by backend)
const createAutomationFormSchema = insertAutomationSchema.omit({ photographerId: true });
type CreateAutomationFormData = z.infer<typeof createAutomationFormSchema>;

// Helper function to format enhanced timing information
function formatStepTiming(step: any): string {
  const parts: string[] = [];
  
  // Add days, hours, minutes
  if (step.delayDays > 0) parts.push(`${step.delayDays} day${step.delayDays > 1 ? 's' : ''}`);
  if (step.delayHours > 0) parts.push(`${step.delayHours} hour${step.delayHours > 1 ? 's' : ''}`);
  if (step.delayMinutes > 0) parts.push(`${step.delayMinutes} min`);
  
  // If no timing is set, show "immediately"
  if (parts.length === 0) {
    parts.push('immediately');
  }
  
  let timing = `Wait ${parts.join(', ')}`;
  
  // Add specific send time if set
  if (step.sendAtTime) {
    const [hours, minutes] = step.sendAtTime.split(':');
    const time = new Date();
    time.setHours(parseInt(hours), parseInt(minutes));
    const timeStr = time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    timing += `, at ${timeStr}`;
  }
  
  return timing;
}

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

  // Fetch template details for the automation
  const { data: templates } = useQuery<any[]>({
    queryKey: ["/api/templates"],
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
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {automation.enabled ? "On" : "Off"}
            </span>
            <Switch 
              checked={automation.enabled}
              disabled={toggleAutomationMutation.isPending}
              data-testid={`switch-automation-${automation.id}`}
              onCheckedChange={handleToggleAutomation}
            />
          </div>
          <Badge variant={automation.enabled ? "default" : "secondary"}>
            {automation.enabled ? "Active" : "Inactive"}
          </Badge>
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
                    {formatStepTiming(step)}, then send {automation.channel.toLowerCase()}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-muted-foreground">
                    {step.enabled ? "On" : "Off"}
                  </span>
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

            {/* Template Content Preview */}
            <div className="space-y-2">
              <Label>Message Content</Label>
              <div className="border rounded-lg p-3 bg-muted max-h-40 overflow-y-auto">
                {steps.length > 0 ? (
                  <div className="space-y-2">
                    {steps.map((step: any, index: number) => {
                      const template = templates?.find(t => t.id === step.templateId);
                      return (
                        <div key={step.id} className="border-l-2 border-primary pl-3">
                          <p className="text-sm font-medium">Step {index + 1} ({formatStepTiming(step)})</p>
                          {template ? (
                            <div className="text-sm text-muted-foreground">
                              <p className="font-medium">{template.name}</p>
                              {template.subject && <p className="italic">Subject: {template.subject}</p>}
                              <p className="mt-1 text-xs bg-background rounded p-2 border">
                                {template.textBody?.substring(0, 150) + (template.textBody?.length > 150 ? '...' : '')}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Template not found</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No message steps configured</p>
                )}
              </div>
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
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {automation.enabled ? "On" : "Off"}
            </span>
            <Switch
              checked={automation.enabled}
              onCheckedChange={handleToggleAutomation}
              disabled={toggleAutomationMutation.isPending}
              data-testid={`switch-toggle-automation-${automation.id}`}
            />
          </div>
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

            {/* Pipeline Automation Details */}
            <div className="space-y-2">
              <Label>Automation Details</Label>
              <div className="border rounded-lg p-3 bg-muted">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Type:</span>
                    <span>Pipeline Stage Automation</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Trigger:</span>
                    <span>{getTriggerLabel(automation.triggerType)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Action:</span>
                    <span>Move to "{automation.targetStage?.name || 'Unknown Stage'}"</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Status:</span>
                    <Badge variant={automation.enabled ? "default" : "secondary"}>
                      {automation.enabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
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
  const [manageRulesDialogOpen, setManageRulesDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<any>(null);
  const [timingMode, setTimingMode] = useState<'immediate' | 'delayed'>('immediate');
  const [activeProjectType, setActiveProjectType] = useState<string>('WEDDING');
  const [enableCommunication, setEnableCommunication] = useState(true);
  const [enablePipeline, setEnablePipeline] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<any>(null);

  // Reset modal state when dialog opens
  useEffect(() => {
    if (createDialogOpen) {
      // Reset toggle states to default
      setEnableCommunication(true);
      setEnablePipeline(false);
      setTimingMode('immediate');
    }
  }, [createDialogOpen]);

  // Unified form schema that supports all three automation types with optional sections
  const unifiedFormSchema = createAutomationFormSchema.extend({
    // Unified trigger settings
    triggerMode: z.enum(['STAGE', 'BUSINESS', 'TIME']).default('STAGE'),
    triggerStageId: z.string().optional(), // For stage-based triggers
    triggerEvent: z.string().optional(), // For business event triggers
    // Time-based trigger fields
    daysBefore: z.coerce.number().min(1).max(365).optional(),
    eventType: z.string().optional(),
    stageCondition: z.string().optional(),
    // Optional automation type flags
    enableCommunication: z.boolean().default(true),
    enablePipeline: z.boolean().default(false),
    // Communication automation fields
    channel: z.string().default("EMAIL"),
    templateId: z.string().optional(),
    delayMinutes: z.coerce.number().min(0).default(0),
    delayHours: z.coerce.number().min(0).default(0),
    delayDays: z.coerce.number().min(0).default(0),
    sendAtTime: z.string().optional(),
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
      } else if (data.triggerMode === 'TIME') {
        if (!data.daysBefore || !data.eventType) {
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
      daysBefore: 7,
      eventType: "placeholder",
      stageCondition: "all",
      channel: "EMAIL", 
      enabled: true,
      automationType: "COMMUNICATION", // Still needed for backend compatibility
      enableCommunication: true,
      enablePipeline: false,
      templateId: "",
      delayMinutes: 0,
      delayHours: 0,
      delayDays: 0,
      sendAtTime: "",
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
      form.setValue('sendAtTime', '');
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
              delayHours: data.delayHours || 0,
              delayDays: data.delayDays || 0,
              sendAtTime: data.sendAtTime || null,
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

  // Toggle automation mutation
  const toggleAutomationMutation = useMutation({
    mutationFn: async ({ automationId, enabled }: { automationId: string; enabled: boolean }) => {
      return apiRequest("PATCH", `/api/automations/${automationId}`, { enabled });
    },
    onSuccess: () => {
      toast({ title: "Automation updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
    },
    onError: () => {
      toast({ title: "Failed to update automation", variant: "destructive" });
    }
  });

  // Edit automation mutation
  const editAutomationMutation = useMutation({
    mutationFn: async ({ automationId, data }: { automationId: string; data: any }) => {
      return apiRequest("PUT", `/api/automations/${automationId}`, data);
    },
    onSuccess: () => {
      toast({ title: "Automation updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setEditDialogOpen(false);
      setEditingAutomation(null);
    },
    onError: () => {
      toast({ title: "Failed to update automation", variant: "destructive" });
    }
  });

  const handleToggleAutomation = (automationId: string, enabled: boolean) => {
    toggleAutomationMutation.mutate({ automationId, enabled });
  };

  const handleEditAutomation = (automation: any) => {
    setEditingAutomation(automation);
    setEditDialogOpen(true);
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
                      Save time by automating routine tasks for your clients
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleCreateAutomation)} className="flex flex-col min-h-0 flex-1">
                      <>
                      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-8">
                    
                    {/* Step 1: Basic Information */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-semibold">
                          1
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">Basic Information</h3>
                          <p className="text-sm text-muted-foreground">Give your automation a descriptive name</p>
                        </div>
                      </div>
                      
                      <div className="ml-11 p-4 border rounded-lg bg-card">
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
                      </div>
                    </div>

                    {/* Step 2: When (Trigger) */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-semibold">
                          2
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">When should this happen?</h3>
                          <p className="text-sm text-muted-foreground">Choose what event will start this automation</p>
                        </div>
                      </div>
                      
                      <div className="ml-11 space-y-4 p-4 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20">

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
                                    <span>When a client enters a stage</span>
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="BUSINESS" id="trigger-business" data-testid="radio-trigger-business" />
                                  <Label htmlFor="trigger-business" className="flex items-center space-x-2 cursor-pointer">
                                    <Zap className="h-4 w-4" />
                                    <span>When a business event happens</span>
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="TIME" id="trigger-time" data-testid="radio-trigger-time" />
                                  <Label htmlFor="trigger-time" className="flex items-center space-x-2 cursor-pointer">
                                    <Clock className="h-4 w-4" />
                                    <span>Before an event date</span>
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
                              <FormLabel>Which stage triggers this?</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-trigger-stage">
                                    <SelectValue placeholder="Select the stage that triggers this" />
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
                                The automation starts when a client moves into this stage
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
                              <FormLabel>Which business event?</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-trigger-event">
                                    <SelectValue placeholder="Select the business event" />
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
                                The automation starts when this happens in your business
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Time-based Trigger Fields */}
                      {form.watch('triggerMode') === 'TIME' && (
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="daysBefore"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>How many days before?</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number"
                                    min="1"
                                    max="365"
                                    placeholder="e.g., 7"
                                    data-testid="input-days-before"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Enter the number of days before the event date
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="eventType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Based on which date?</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-event-type">
                                      <SelectValue placeholder="Choose which date to count from" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="placeholder" disabled>Select an event type...</SelectItem>
                                    <SelectItem value="EVENT_DATE">📅 Event Date</SelectItem>
                                    <SelectItem value="DELIVERY_DATE">📦 Delivery Date</SelectItem>
                                    <SelectItem value="CONSULTATION_DATE">💬 Consultation Date</SelectItem>
                                    <SelectItem value="SHOOT_DATE">📸 Shoot Date</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  The automation will count days from this date
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="stageCondition"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Only for clients in (Optional)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-stage-condition">
                                      <SelectValue placeholder="Leave blank for all clients, or choose a stage" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="all">All Stages</SelectItem>
                                    {stages?.map((stage: any) => (
                                      <SelectItem key={stage.id} value={stage.id}>
                                        {stage.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Leave blank to include all clients, or pick a specific stage
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                      </div>
                    </div>

                    {/* Step 3: What Actions */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-semibold">
                          3
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">What should happen?</h3>
                          <p className="text-sm text-muted-foreground">Choose what actions this automation should take</p>
                        </div>
                      </div>
                      
                      <div className="ml-11 space-y-4">
                      
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
                            <Label className="font-medium">Send Messages</Label>
                          </div>
                          <p className="text-xs text-muted-foreground">Send emails, texts, or assign forms to clients</p>
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
                            <Label className="font-medium">Move Projects</Label>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {enablePipeline 
                              ? "Move projects to the next stage automatically" 
                              : "Automatically move projects through your pipeline"
                            }
                          </p>
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
                          <Label className="font-medium text-blue-900 dark:text-blue-100">Message Settings</Label>
                        </div>

                    <FormField
                      control={form.control}
                      name="channel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact method</FormLabel>
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
                          <FormLabel>What to send</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-template">
                                <SelectValue placeholder="Choose a message template" />
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
                          <FormLabel>Forms to send (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-questionnaire">
                                <SelectValue placeholder="Choose a form to send (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No forms to send</SelectItem>
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
                        <div className="space-y-4 pt-2">
                          <div className="grid grid-cols-3 gap-2">
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
                          
                          <div className="pt-4 border-t">
                            <FormField
                              control={form.control}
                              name="sendAtTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm">Send at specific time (optional)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="time"
                                      placeholder="09:00"
                                      className="w-full"
                                      data-testid="input-send-at-time"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                  <FormDescription className="text-xs text-muted-foreground">
                                    If specified, the message will be sent at this time of day after the delay period
                                  </FormDescription>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}
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
                    </>
                    </form>
                  </Form>
              </DialogContent>
            </Dialog>



        {/* Edit Automation Dialog */}
        {editingAutomation && (
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Automation</DialogTitle>
                <DialogDescription>
                  Update automation settings
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Automation Name</Label>
                  <Input
                    value={editingAutomation.name}
                    onChange={(e) => setEditingAutomation({...editingAutomation, name: e.target.value})}
                    placeholder="Enter automation name"
                    data-testid={`input-edit-name-${editingAutomation.id}`}
                  />
                </div>

                {/* Show automation details based on type */}
                {editingAutomation.automationType === 'COMMUNICATION' && (
                  <div className="space-y-2">
                    <Label>Channel</Label>
                    <Select
                      value={editingAutomation.channel}
                      onValueChange={(value) => setEditingAutomation({...editingAutomation, channel: value})}
                    >
                      <SelectTrigger data-testid={`select-edit-channel-${editingAutomation.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Show automation type and trigger info */}
                <div className="space-y-2">
                  <Label>Automation Details</Label>
                  <div className="border rounded-lg p-3 bg-muted">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Type:</span>
                        <span>{editingAutomation.automationType === 'COMMUNICATION' ? 'Communication' : 'Pipeline Stage'}</span>
                      </div>
                      {editingAutomation.triggerMode && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Trigger:</span>
                          <span>
                            {editingAutomation.triggerMode === 'STAGE' ? 'Stage-based' :
                             editingAutomation.triggerMode === 'BUSINESS' ? 'Business Event' : 'Time-based'}
                          </span>
                        </div>
                      )}
                      {editingAutomation.stageName && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Stage:</span>
                          <span>"{editingAutomation.stageName}"</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Status:</span>
                        <Badge variant={editingAutomation.enabled ? "default" : "secondary"}>
                          {editingAutomation.enabled ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingAutomation.enabled}
                    onCheckedChange={(checked) => setEditingAutomation({...editingAutomation, enabled: checked})}
                    data-testid={`switch-edit-enabled-${editingAutomation.id}`}
                  />
                  <Label>Enable automation</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  data-testid={`button-cancel-edit-${editingAutomation.id}`}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    editAutomationMutation.mutate({
                      automationId: editingAutomation.id,
                      data: {
                        name: editingAutomation.name,
                        enabled: editingAutomation.enabled,
                        ...(editingAutomation.automationType === 'COMMUNICATION' && {
                          channel: editingAutomation.channel
                        })
                      }
                    });
                  }}
                  disabled={editAutomationMutation.isPending || !editingAutomation.name.trim()}
                  data-testid={`button-save-edit-${editingAutomation.id}`}
                >
                  {editAutomationMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

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
              <div className="hidden md:flex flex-wrap gap-2 max-w-5xl">
                {(Object.keys(projectTypeEnum) as Array<keyof typeof projectTypeEnum>).map((value) => (
                  <Button
                    key={value}
                    variant={activeProjectType === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveProjectType(value)}
                    data-testid={`tab-${value.toLowerCase()}`}
                    className="flex items-center gap-2"
                  >
                    {value === "WEDDING" && "💒 Wedding"}
                    {value === "ENGAGEMENT" && "💍 Engagement"}
                    {value === "PROPOSAL" && "💍 Proposal"}
                    {value === "PORTRAIT" && "🎭 Portrait"}
                    {value === "CORPORATE" && "🏢 Corporate"}
                    {value === "FAMILY" && "👨‍👩‍👧‍👦 Family"}
                    {value === "MATERNITY" && "🤱 Maternity"}
                    {value === "NEWBORN" && "👶 Newborn"}
                    {value === "EVENT" && "🎉 Event"}
                    {value === "COMMERCIAL" && "📸 Commercial"}
                    {value === "OTHER" && "📁 Other"}
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
                    <SelectItem value="PROPOSAL">💍 Proposal</SelectItem>
                    <SelectItem value="PORTRAIT">🎭 Portrait</SelectItem>
                    <SelectItem value="CORPORATE">🏢 Corporate</SelectItem>
                    <SelectItem value="FAMILY">👨‍👩‍👧‍👦 Family</SelectItem>
                    <SelectItem value="MATERNITY">🤱 Maternity</SelectItem>
                    <SelectItem value="NEWBORN">👶 Newborn</SelectItem>
                    <SelectItem value="EVENT">🎉 Event</SelectItem>
                    <SelectItem value="COMMERCIAL">📸 Commercial</SelectItem>
                    <SelectItem value="OTHER">📁 Other</SelectItem>
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

                {/* Automation List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      {activeProjectType.charAt(0) + activeProjectType.slice(1).toLowerCase()} Automations
                    </CardTitle>
                    <CardDescription>
                      Automated workflows for {activeProjectType.toLowerCase()} projects
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {automations === undefined ? (
                        <div className="text-center py-8">
                          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                          <p className="text-muted-foreground mt-2">Loading automations...</p>
                        </div>
                      ) : automations.length === 0 ? (
                        <div className="text-center py-8">
                          <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No automations yet</h3>
                          <p className="text-muted-foreground mb-4">
                            Create your first automation to streamline your workflow
                          </p>
                          <Button 
                            onClick={() => setCreateDialogOpen(true)}
                            data-testid="button-create-first-automation"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Automation
                          </Button>
                        </div>
                      ) : (
                        automations.map((automation: any) => (
                          <div
                            key={automation.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors space-y-3 sm:space-y-0"
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-full ${automation.enabled ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                {automation.automationType === 'COMMUNICATION' ? <Mail className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium">{automation.name}</p>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      automation.triggerMode === 'STAGE' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300' :
                                      automation.triggerMode === 'BUSINESS' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300' :
                                      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300'
                                    }`}
                                  >
                                    {automation.triggerMode === 'STAGE' ? 'Stage-based' : 
                                     automation.triggerMode === 'BUSINESS' ? 'Business Event' : 'Time-based'}
                                  </Badge>
                                  <Badge variant={automation.automationType === 'COMMUNICATION' ? 'default' : 'secondary'}>
                                    {automation.automationType === 'COMMUNICATION' ? 'Communication' : 'Pipeline'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {automation.triggerMode === 'STAGE' && automation.stageName ? 
                                    `Triggers when clients enter "${automation.stageName}" stage` :
                                   automation.triggerMode === 'BUSINESS' && automation.triggerEvent ?
                                    `Triggers on ${automation.triggerEvent.replace(/_/g, ' ').toLowerCase()}` :
                                   automation.triggerMode === 'TIME' ?
                                    `Time-based trigger after ${automation.delayAmount} ${automation.delayUnit}` :
                                    'Custom trigger conditions'
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-center sm:justify-start space-x-2">
                              <span className="text-xs text-muted-foreground">
                                {automation.enabled ? "On" : "Off"}
                              </span>
                              <Switch
                                checked={automation.enabled}
                                onCheckedChange={(enabled) => handleToggleAutomation(automation.id, enabled)}
                                data-testid={`switch-automation-${automation.id}`}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditAutomation(automation)}
                                data-testid={`button-edit-automation-${automation.id}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAutomation(automation.id)}
                                data-testid={`button-delete-automation-${automation.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
