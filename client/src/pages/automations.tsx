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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Zap, Clock, Mail, Smartphone, Settings, Edit2, ArrowRight, Calendar, Users, AlertCircle, Trash2, Target, CheckCircle2, Briefcase, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { insertAutomationSchema, projectTypeEnum, automationTypeEnum, triggerTypeEnum, insertAutomationBusinessTriggerSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EmailTemplateBuilder, type ContentBlock } from "@/components/email-template-builder";
import { EmailPreview } from "@/components/email-preview";

// Create form schema based on insertAutomationSchema but without photographerId (auto-added by backend)
const createAutomationFormSchema = insertAutomationSchema.omit({ photographerId: true });
type CreateAutomationFormData = z.infer<typeof createAutomationFormSchema>;

// Business trigger form schema  
const createBusinessTriggerFormSchema = insertAutomationBusinessTriggerSchema.omit({ automationId: true });
type CreateBusinessTriggerFormData = z.infer<typeof createBusinessTriggerFormSchema>;

// AutomationStepManager Component
function AutomationStepManager({ automation, onDelete }: { automation: any, onDelete: (id: string) => void }) {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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

  // Fetch Smart File templates for the automation
  const { data: smartFiles } = useQuery<any[]>({
    queryKey: ["/api/smart-files"],
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
    <div className="border-2 border-gray-800 dark:border-gray-300 rounded-lg shadow-sm overflow-hidden min-w-[350px] max-w-[400px] mx-auto bg-gray-50 dark:bg-gray-800">
      {/* Card Header - Blue Background */}
      <div className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4 flex items-center justify-between">
        <h3 className="text-lg font-bold flex-1">{automation.name}</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
            data-testid={`button-edit-automation-${automation.id}`}
            onClick={() => setEditDialogOpen(true)}
          >
            Edit
          </Button>
          <Switch 
            checked={automation.enabled}
            disabled={toggleAutomationMutation.isPending}
            data-testid={`switch-automation-${automation.id}`}
            onCheckedChange={handleToggleAutomation}
          />
        </div>
      </div>
      
      {/* Card Content */}
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {/* Type Badge: Immediate, Time-Based, or Trigger-Based */}
            <span className="text-sm text-muted-foreground font-medium">Trigger:</span>
            {automation.businessTriggers && automation.businessTriggers.length > 0 ? (
              // Trigger-based automation
              <Badge variant="default" className="bg-purple-500 dark:bg-purple-600 text-white text-xs">
                <Target className="w-3 h-3 mr-1" />
                {automation.businessTriggers[0].triggerType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </Badge>
            ) : steps.length > 0 && steps[0].delayMinutes > 0 ? (
              // Time-based automation (has delay)
              <Badge variant="default" className="bg-blue-500 dark:bg-blue-600 text-white text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Delay: {steps[0].delayMinutes < 60 
                  ? `${steps[0].delayMinutes} minute${steps[0].delayMinutes !== 1 ? 's' : ''}`
                  : steps[0].delayMinutes < 1440
                  ? `${Math.floor(steps[0].delayMinutes / 60)} hour${Math.floor(steps[0].delayMinutes / 60) !== 1 ? 's' : ''}`
                  : `${Math.floor(steps[0].delayMinutes / 1440)} day${Math.floor(steps[0].delayMinutes / 1440) !== 1 ? 's' : ''}`
                }
              </Badge>
            ) : steps.length > 0 && steps[0].delayMinutes === 0 ? (
              // Immediate automation (delay is 0)
              <Badge variant="default" className="bg-amber-500 dark:bg-amber-600 text-white text-xs">
                <Zap className="w-3 h-3 mr-1" />
                Immediately
              </Badge>
            ) : null}
          </div>
          
          {/* Action badges */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">Action:</span>
            {automation.channel === 'EMAIL' && (
              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-xs">
                📧 Email
              </Badge>
            )}
            {automation.channel === 'SMS' && (
              <Badge variant="outline" className="bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 text-xs">
                📱 SMS
              </Badge>
            )}
          </div>
        </div>
        
        {/* View Details button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid={`button-expand-automation-${automation.id}`}
        >
          <span>View Details</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Details Section */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-3">
          {/* Description */}
          {automation.description && (
            <div className="bg-muted/30 border border-border/50 rounded-md p-3">
              <p className="text-sm text-foreground/90 leading-relaxed">
                {automation.description}
              </p>
            </div>
          )}
          
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading steps...</p>
          ) : steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No steps configured</p>
          ) : (
            steps.map((step: any, index: number) => {
            const template = templates?.find(t => t.id === step.templateId);
            const smartFile = smartFiles?.find(sf => sf.id === step.smartFileTemplateId);
            const isSmartFile = step.actionType === 'SMART_FILE' || automation.channel === 'SMART_FILE';
            
            return (
              <div key={step.id}>
                {/* Smart File Preview */}
                {smartFile && isSmartFile && (
                  <div className="bg-muted/50 border rounded-md p-3 text-sm">
                    <p className="font-semibold mb-2">📄 Smart File: {smartFile.name}</p>
                    <p className="text-muted-foreground">
                      Will send a smart file template to the client
                    </p>
                  </div>
                )}
                
                {/* Message Preview */}
                {template && !isSmartFile && (
                  <div className="bg-muted/50 border rounded-md p-3 text-sm">
                    <p className="font-semibold mb-2">
                      {automation.channel === 'EMAIL' ? 'Email Message:' : 'Text Message:'}
                    </p>
                    {template.subject && automation.channel === 'EMAIL' && (
                      <p className="font-medium mb-2 text-muted-foreground">Subject: {template.subject}</p>
                    )}
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {template.textBody || 'No message content'}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
        </div>
      )}

      {/* Edit Automation Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Communication Automation</DialogTitle>
            <DialogDescription>
              Modify the automation settings. The automation type, trigger, and communication steps cannot be changed after creation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Basic Settings */}
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

            {/* Automation Configuration Overview */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-primary" />
                <Label className="font-medium">Automation Configuration</Label>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Type:</span>
                  <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                    Communication
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Channel:</span>
                  <Badge 
                    variant="outline"
                    className={automation.channel === 'EMAIL' 
                      ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" 
                      : "bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800"
                    }
                  >
                    {automation.channel === 'EMAIL' ? '📧 Email' : '📱 SMS'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Trigger:</span>
                  <span className="text-muted-foreground">
                    {automation.stageId ? `When entering ${automation.stage?.name || 'stage'}` : 'Global automation'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Steps:</span>
                  <Badge variant="secondary">{steps.length}</Badge>
                </div>
              </div>
            </div>

            {/* Communication Steps Timeline */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Message Steps Timeline
              </Label>
              <div className="border rounded-lg p-3 bg-background max-h-60 overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Loading steps...</p>
                  </div>
                ) : steps.length > 0 ? (
                  <div className="space-y-3">
                    {steps.map((step: any, index: number) => {
                      const template = templates?.find(t => t.id === step.templateId);
                      const smartFile = smartFiles?.find(sf => sf.id === step.smartFileTemplateId);
                      const isSmartFile = step.actionType === 'SMART_FILE' || automation.channel === 'SMART_FILE';
                      
                      return (
                        <div key={step.id} className="relative pl-6 pb-3 border-l-2 border-primary/30 last:border-0">
                          {/* Step Number Badge */}
                          <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          
                          <div className="space-y-1.5">
                            {/* Timing */}
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {step.delayMinutes === 0 ? 'Immediately' : `After ${step.delayMinutes} min`}
                              </Badge>
                              <span className="text-xs text-muted-foreground">→</span>
                              <span className="text-xs font-medium">
                                {isSmartFile ? '📄 Send Smart File' : automation.channel === 'EMAIL' ? '📧 Send Email' : '📱 Send SMS'}
                              </span>
                            </div>
                            
                            {/* Smart File Template Selector */}
                            {isSmartFile && smartFiles && smartFiles.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-xs">Smart File Template</Label>
                                <Select
                                  value={step.smartFileTemplateId || ''}
                                  onValueChange={(value) => {
                                    // Update the step with new Smart File template
                                    apiRequest("PATCH", `/api/automation-steps/${step.id}`, {
                                      smartFileTemplateId: value
                                    }).then(() => {
                                      toast({ title: "Smart File template updated" });
                                      queryClient.invalidateQueries({ queryKey: ["/api/automations", automation.id, "steps"] });
                                    }).catch(() => {
                                      toast({ title: "Failed to update template", variant: "destructive" });
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select Smart File template" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {smartFiles.map((sf: any) => (
                                      <SelectItem key={sf.id} value={sf.id} className="text-xs">
                                        {sf.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {smartFile && (
                                  <p className="text-xs text-muted-foreground">
                                    Currently selected: {smartFile.name}
                                  </p>
                                )}
                              </div>
                            )}
                            
                            {/* Template Info or Custom Message */}
                            {template && !isSmartFile ? (
                              <div className="bg-muted/50 rounded-md p-2 text-xs space-y-1">
                                <p className="font-medium">{template.name}</p>
                                {template.subject && (
                                  <p className="text-muted-foreground">
                                    <span className="font-medium">Subject:</span> {template.subject}
                                  </p>
                                )}
                                <p className="text-muted-foreground line-clamp-2">
                                  {template.textBody || 'No message content'}
                                </p>
                              </div>
                            ) : step.customSmsContent && !isSmartFile ? (
                              <div className="bg-muted/50 rounded-md p-2 text-xs space-y-1">
                                <p className="font-medium text-primary">Custom Message</p>
                                <p className="text-muted-foreground line-clamp-3">
                                  {step.customSmsContent}
                                </p>
                              </div>
                            ) : !isSmartFile && !template && !step.customSmsContent ? (
                              <p className="text-xs text-muted-foreground italic">No message configured</p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No message steps configured</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {steps.some((s: any) => s.actionType === 'SMART_FILE' || automation.channel === 'SMART_FILE')
                  ? 'Smart File templates can be changed directly above. To modify other settings, delete this automation and create a new one.'
                  : 'To modify steps, delete this automation and create a new one with the desired configuration.'}
              </p>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg bg-background">
              <Switch
                checked={editForm.enabled}
                onCheckedChange={(checked) => setEditForm({...editForm, enabled: checked})}
                data-testid={`switch-edit-enabled-${automation.id}`}
              />
              <div className="flex-1">
                <Label className="cursor-pointer">Enable automation</Label>
                <p className="text-xs text-muted-foreground">When enabled, this automation will run automatically</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('Are you sure you want to delete this automation? This cannot be undone.')) {
                  onDelete(automation.id);
                  setEditDialogOpen(false);
                }
              }}
              disabled={updateAutomationMutation.isPending}
              data-testid={`button-delete-automation-${automation.id}`}
            >
              Delete
            </Button>
            <div className="flex space-x-2">
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
      'SMART_FILE_ACCEPTED': '📄 Smart File Accepted',
      'EVENT_DATE_REACHED': '📅 Event Date',
      'PROJECT_DELIVERED': '📦 Project Delivered',
      'CLIENT_ONBOARDED': '🎯 Client Onboarded',
      'APPOINTMENT_BOOKED': '📅 Appointment Booked'
    };
    return triggers[triggerType as keyof typeof triggers] || triggerType;
  };

  return (
    <div className="border-2 border-gray-800 dark:border-gray-300 rounded-lg shadow-sm overflow-hidden min-w-[350px] max-w-[400px] mx-auto bg-gray-50 dark:bg-gray-800">
      {/* Card Header - Blue Background */}
      <div className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4 flex items-center justify-between">
        <h3 className="text-lg font-bold flex-1">{automation.name}</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
            onClick={() => setEditDialogOpen(true)}
            data-testid={`button-edit-automation-${automation.id}`}
          >
            Edit
          </Button>
          <Switch
            checked={automation.enabled}
            onCheckedChange={handleToggleAutomation}
            disabled={toggleAutomationMutation.isPending}
            data-testid={`switch-toggle-automation-${automation.id}`}
          />
        </div>
      </div>
      
      {/* Card Content */}
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">Trigger:</span>
            <Badge variant="default" className="bg-purple-500 dark:bg-purple-600 text-white text-xs">
              <Target className="w-3 h-3 mr-1" />
              {automation.triggerType ? getTriggerLabel(automation.triggerType) : (automation.businessTriggers?.[0]?.triggerType?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Stage Entry')}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">Action:</span>
            <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-xs flex items-center gap-1">
              {(automation.conditionStage || automation.stage) && automation.targetStage && (
                <>
                  <span><span className="font-bold">Pipeline:</span> {(automation.conditionStage || automation.stage).name}</span>
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
              <span>{automation.targetStage?.name || 'Unknown Stage'}</span>
            </Badge>
          </div>
        </div>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl" data-testid={`dialog-edit-automation-${automation.id}`}>
          <DialogHeader>
            <DialogTitle>Edit Pipeline Automation</DialogTitle>
            <DialogDescription>
              Modify the automation settings. The trigger type and destination stage cannot be changed after creation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Settings */}
            <div>
              <Label htmlFor={`edit-name-${automation.id}`}>Automation Name</Label>
              <Input
                id={`edit-name-${automation.id}`}
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                placeholder="Enter automation name"
                data-testid={`input-edit-name-${automation.id}`}
              />
            </div>

            {/* Pipeline Automation Configuration Overview */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-4 h-4 text-primary" />
                <Label className="font-medium">Automation Configuration</Label>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Type:</span>
                  <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                    Pipeline Change
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Trigger:</span>
                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                    {automation.businessTriggers?.[0]?.triggerType?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase()) || getTriggerLabel(automation.triggerType) || 'Unknown'}
                  </Badge>
                </div>

                {(automation.conditionStage || automation.stage) && automation.targetStage && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Stage Flow:</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {(automation.conditionStage || automation.stage).name}
                      </Badge>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <Badge variant="secondary" className="text-xs">
                        {automation.targetStage.name}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Details */}
            <div className="space-y-2 p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                <Label className="font-medium text-green-900 dark:text-green-100">Pipeline Action</Label>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Action:</span>
                  <div className="mt-1 p-2 bg-background border rounded-md">
                    Move project to <span className="font-medium text-green-600 dark:text-green-400">"{automation.targetStage?.name || 'Unknown Stage'}"</span>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  When this automation triggers, projects will automatically move to the destination stage. To change the destination, delete this automation and create a new one.
                </p>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg bg-background">
              <Switch
                checked={editForm.enabled}
                onCheckedChange={(checked) => setEditForm({...editForm, enabled: checked})}
                data-testid={`switch-edit-enabled-${automation.id}`}
              />
              <div className="flex-1">
                <Label className="cursor-pointer">Enable automation</Label>
                <p className="text-xs text-muted-foreground">When enabled, this automation will run automatically</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('Are you sure you want to delete this automation? This cannot be undone.')) {
                  onDelete(automation.id);
                  setEditDialogOpen(false);
                }
              }}
              disabled={updateAutomationMutation.isPending}
              data-testid={`button-delete-automation-${automation.id}`}
            >
              Delete
            </Button>
            <div className="flex space-x-2">
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Edit Automation Details Component
function EditAutomationDetails({ automationId, automation }: { automationId: string; automation: any }) {
  const { data: steps = [] } = useQuery<any[]>({
    queryKey: ["/api/automations", automationId, "steps"],
    enabled: !!automationId && automation.automationType === 'COMMUNICATION'
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/templates"],
    enabled: !!automationId && automation.automationType === 'COMMUNICATION'
  });

  const { data: smartFiles = [] } = useQuery<any[]>({
    queryKey: ["/api/smart-files"],
    enabled: !!automationId && automation.automationType === 'COMMUNICATION'
  });

  const { data: stages = [] } = useQuery<any[]>({
    queryKey: ["/api/stages"],
    enabled: !!automationId
  });

  const { data: businessTriggers = [] } = useQuery<any[]>({
    queryKey: ["/api/automations", automationId, "business-triggers"],
    enabled: !!automationId
  });

  const formatDelay = (minutes: number) => {
    if (minutes === 0) return 'Immediately';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} day${days !== 1 ? 's' : ''}`;
  };

  // Find trigger stage if this is a stage-based automation
  const triggerStage = automation.stageId && Array.isArray(stages) ? stages.find(s => s.id === automation.stageId) : null;

  return (
    <div className="space-y-4">
      {/* Trigger Conditions Section - Always show */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Trigger Conditions</Label>
        <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
          {/* Stage Requirement */}
          {triggerStage ? (
            <div className="flex items-start space-x-3">
              <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-950">
                <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Stage Requirement</p>
                <p className="text-sm text-muted-foreground">
                  Triggers when client enters: <span className="font-semibold text-foreground">"{triggerStage.name}"</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start space-x-3">
              <div className="p-1.5 rounded bg-purple-100 dark:bg-purple-950">
                <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Global Automation</p>
                <p className="text-sm text-muted-foreground">
                  No specific stage requirement - runs independently
                </p>
              </div>
            </div>
          )}

          {/* Business Event Triggers */}
          {businessTriggers.length > 0 && (
            <div className="flex items-start space-x-3">
              <div className="p-1.5 rounded bg-green-100 dark:bg-green-950">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Business Events</p>
                <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                  {businessTriggers.map((trigger: any) => (
                    <li key={trigger.id} className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span>{trigger.triggerType.replace(/_/g, ' ').toLowerCase()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Countdown/Time-based info */}
          {automation.daysBefore && (
            <div className="flex items-start space-x-3">
              <div className="p-1.5 rounded bg-orange-100 dark:bg-orange-950">
                <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Time-Based Trigger</p>
                <p className="text-sm text-muted-foreground">
                  Sends {automation.daysBefore} day{automation.daysBefore !== 1 ? 's' : ''} {automation.triggerTiming === 'BEFORE' ? 'before' : 'after'} event date
                </p>
              </div>
            </div>
          )}

          {/* Project Type */}
          <div className="flex items-start space-x-3">
            <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800">
              <Briefcase className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Project Type</p>
              <p className="text-sm text-muted-foreground">
                {automation.projectType || 'WEDDING'}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Communication Steps */}
      {automation.automationType === 'COMMUNICATION' && steps.length > 0 && (
        <div className="space-y-2">
          <Label>Communication Steps ({steps.length})</Label>
          <div className="border rounded-lg p-3 bg-muted max-h-64 overflow-y-auto space-y-2">
            {steps.map((step: any, index: number) => {
              const template = templates.find(t => t.id === step.templateId);
              const smartFile = smartFiles.find(sf => sf.id === step.smartFileTemplateId);
              const isSmartFile = step.actionType === 'SMART_FILE' || automation.channel === 'SMART_FILE';
              
              console.log('🔍 Step data:', {
                stepId: step.id,
                actionType: step.actionType,
                smartFileTemplateId: step.smartFileTemplateId,
                templateId: step.templateId,
                isSmartFile,
                smartFileFound: !!smartFile,
                smartFileName: smartFile?.name
              });
              
              return (
                <div key={step.id} className="bg-background border rounded-lg p-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded font-medium">
                      {index + 1}
                    </span>
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">{formatDelay(step.delayMinutes)}</span>
                      <span className="text-muted-foreground">→</span>
                      <span>
                        {isSmartFile ? '📄 Smart File' : automation.channel === 'EMAIL' ? '📧 Email' : '📱 SMS'}
                      </span>
                    </div>
                  </div>
                  
                  {template && !isSmartFile && (
                    <div className="pl-7 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Message:</p>
                      <div className="bg-accent border rounded p-2 text-xs">
                        {template.subject && (
                          <p className="font-semibold mb-1 text-foreground">📋 {template.subject}</p>
                        )}
                        <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                          {template.textBody || 'No message content'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {smartFile && isSmartFile && (
                    <div className="pl-7 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Smart File Template:</p>
                      <div className="bg-accent border rounded p-2 text-xs">
                        <p className="font-semibold text-foreground">📄 {smartFile.name}</p>
                        <p className="text-muted-foreground text-xs mt-1">
                          Will send a {smartFile.isTemplate ? 'template' : 'file'} to the client
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {!template && !smartFile && (
                    <div className="pl-7 space-y-1">
                      <p className="text-xs text-muted-foreground italic">No content configured</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Pipeline Action */}
      {automation.automationType === 'PIPELINE' && automation.targetStageId && (
        <div className="space-y-2">
          <Label>Pipeline Action</Label>
          <div className="border rounded-lg p-3 bg-muted">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">Target Stage:</span>
                <span className="font-semibold">
                  {Array.isArray(stages) ? stages.find(s => s.id === automation.targetStageId)?.name || 'Unknown Stage' : 'Unknown Stage'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Clients will be automatically moved to this stage when the automation triggers.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Automation Steps Display Component
function AutomationStepsDisplay({ automationId, channel }: { automationId: string; channel: string }) {
  const { data: steps = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/automations", automationId, "steps"],
    enabled: !!automationId
  });

  const { data: templates } = useQuery<any[]>({
    queryKey: ["/api/templates"],
    enabled: !!automationId
  });

  const formatDelay = (minutes: number) => {
    if (minutes === 0) return 'Immediately';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} day${days !== 1 ? 's' : ''}`;
  };

  if (isLoading) {
    return (
      <div className="border-t p-4 bg-accent/5">
        <p className="text-sm text-muted-foreground">Loading steps...</p>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="border-t p-4 bg-accent/5">
        <p className="text-sm text-muted-foreground">No steps configured</p>
      </div>
    );
  }

  return (
    <div className="border-t p-4 bg-accent/5 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Steps:</p>
      {steps.map((step: any, index: number) => {
        const template = templates?.find(t => t.id === step.templateId);
        
        return (
          <div key={step.id} className="bg-background border rounded-lg p-3 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded font-medium">
                {index + 1}
              </span>
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium">{formatDelay(step.delayMinutes)}</span>
                <span className="text-muted-foreground">→</span>
                <span>
                  {channel === 'EMAIL' ? '📧 Email' : '📱 SMS'}
                </span>
              </div>
            </div>
            
            {template && (
              <div className="pl-7 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Message Preview:</p>
                <div className="bg-muted border rounded p-2.5 text-xs">
                  {template.subject && (
                    <p className="font-semibold mb-1.5 text-foreground">📋 {template.subject}</p>
                  )}
                  <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                    {template.textBody || 'No message content'}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Business Triggers Manager Component
function BusinessTriggersManager({ automation }: { automation: any }) {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editTrigger, setEditTrigger] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch business triggers for this automation
  const { data: businessTriggers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/automations", automation.id, "business-triggers"],
    enabled: !!automation.id
  });

  // Create business trigger form
  const createForm = useForm<CreateBusinessTriggerFormData>({
    resolver: zodResolver(createBusinessTriggerFormSchema),
    defaultValues: {
      triggerType: "DEPOSIT_PAID",
      enabled: true,
      minAmountCents: undefined,
      projectType: undefined
    }
  });

  // Edit business trigger form
  const editForm = useForm<CreateBusinessTriggerFormData>({
    resolver: zodResolver(createBusinessTriggerFormSchema),
    defaultValues: {
      triggerType: "DEPOSIT_PAID",
      enabled: true,
      minAmountCents: undefined,
      projectType: undefined
    }
  });

  // Create business trigger mutation
  const createTriggerMutation = useMutation({
    mutationFn: async (data: CreateBusinessTriggerFormData) => {
      return apiRequest("POST", "/api/business-triggers", {
        ...data,
        automationId: automation.id
      });
    },
    onSuccess: () => {
      toast({ title: "Business trigger created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations", automation.id, "business-triggers"] });
      setAddDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create business trigger", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    }
  });

  // Update business trigger mutation
  const updateTriggerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateBusinessTriggerFormData }) => {
      return apiRequest("PUT", `/api/business-triggers/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Business trigger updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations", automation.id, "business-triggers"] });
      setEditDialogOpen(false);
      setEditTrigger(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update business trigger", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    }
  });

  // Delete business trigger mutation
  const deleteTriggerMutation = useMutation({
    mutationFn: async (triggerId: string) => {
      return apiRequest("DELETE", `/api/business-triggers/${triggerId}`);
    },
    onSuccess: () => {
      toast({ title: "Business trigger deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations", automation.id, "business-triggers"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete business trigger", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    }
  });

  const handleCreateTrigger = (data: CreateBusinessTriggerFormData) => {
    createTriggerMutation.mutate(data);
  };

  const handleEditTrigger = (trigger: any) => {
    setEditTrigger(trigger);
    editForm.reset({
      triggerType: trigger.triggerType,
      enabled: trigger.enabled,
      minAmountCents: trigger.minAmountCents || undefined,
      projectType: trigger.projectType || undefined
    });
    setEditDialogOpen(true);
  };

  const handleUpdateTrigger = (data: CreateBusinessTriggerFormData) => {
    if (editTrigger) {
      updateTriggerMutation.mutate({ id: editTrigger.id, data });
    }
  };

  const handleDeleteTrigger = (triggerId: string) => {
    if (confirm('Are you sure you want to delete this business trigger?')) {
      deleteTriggerMutation.mutate(triggerId);
    }
  };

  const formatTriggerType = (triggerType: string) => {
    return triggerType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(cents / 100);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-purple-500" />
          <h4 className="text-sm font-medium">Business Triggers</h4>
          <Badge variant="outline" className="text-xs">
            {businessTriggers.length} configured
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          data-testid={`button-add-business-trigger-${automation.id}`}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Trigger
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-muted-foreground mt-1">Loading triggers...</p>
        </div>
      ) : businessTriggers.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border rounded-lg">
          <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-2">No business triggers configured</p>
          <p className="text-xs text-muted-foreground">Add triggers to execute this automation based on business events</p>
        </div>
      ) : (
        <div className="space-y-2">
          {businessTriggers.map((trigger: any) => (
            <div
              key={trigger.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-accent/20"
              data-testid={`business-trigger-${trigger.id}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-1.5 rounded-full ${trigger.enabled ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                  <Zap className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-sm font-medium">{formatTriggerType(trigger.triggerType)}</p>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    {trigger.minAmountCents && (
                      <span>Min: {formatAmount(trigger.minAmountCents)}</span>
                    )}
                    {trigger.projectType && (
                      <span>Type: {trigger.projectType}</span>
                    )}
                    <Badge variant={trigger.enabled ? "default" : "secondary"} className="text-xs">
                      {trigger.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditTrigger(trigger)}
                  data-testid={`button-edit-trigger-${trigger.id}`}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTrigger(trigger.id)}
                  data-testid={`button-delete-trigger-${trigger.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Trigger Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Business Trigger</DialogTitle>
            <DialogDescription>
              Configure a business event that will trigger this automation.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateTrigger)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="triggerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trigger Event</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-trigger-type">
                          <SelectValue placeholder="Select trigger event" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(triggerTypeEnum).map((trigger) => (
                          <SelectItem key={trigger} value={trigger}>
                            {formatTriggerType(trigger)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="minAmountCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Amount (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 500 for $5.00"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-min-amount"
                      />
                    </FormControl>
                    <FormDescription>
                      Amount in cents. Trigger only when payment meets this minimum.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="projectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type Filter (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'ALL_TYPES'}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project-type">
                          <SelectValue placeholder="All project types" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ALL_TYPES">All project types</SelectItem>
                        {Object.values(projectTypeEnum).map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0) + type.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Limit trigger to specific project types only.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Enable Trigger</FormLabel>
                      <FormDescription>
                        Trigger will be active and can execute the automation.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-trigger-enabled"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                  data-testid="button-cancel-add-trigger"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTriggerMutation.isPending}
                  data-testid="button-save-trigger"
                >
                  {createTriggerMutation.isPending ? "Saving..." : "Save Trigger"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Trigger Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Business Trigger</DialogTitle>
            <DialogDescription>
              Modify the business event trigger configuration.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateTrigger)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="triggerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trigger Event</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-trigger-type">
                          <SelectValue placeholder="Select trigger event" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(triggerTypeEnum).map((trigger) => (
                          <SelectItem key={trigger} value={trigger}>
                            {formatTriggerType(trigger)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="minAmountCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Amount (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 500 for $5.00"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-edit-min-amount"
                      />
                    </FormControl>
                    <FormDescription>
                      Amount in cents. Trigger only when payment meets this minimum.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="projectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type Filter (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'ALL_TYPES'}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-project-type">
                          <SelectValue placeholder="All project types" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ALL_TYPES">All project types</SelectItem>
                        {Object.values(projectTypeEnum).map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0) + type.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Limit trigger to specific project types only.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Enable Trigger</FormLabel>
                      <FormDescription>
                        Trigger will be active and can execute the automation.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-edit-trigger-enabled"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  data-testid="button-cancel-edit-trigger"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateTriggerMutation.isPending}
                  data-testid="button-update-trigger"
                >
                  {updateTriggerMutation.isPending ? "Updating..." : "Update Trigger"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Automations() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // ALL STATE HOOKS MUST BE BEFORE ANY CONDITIONAL RETURNS
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiConfirmDialogOpen, setAiConfirmDialogOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [availableStages, setAvailableStages] = useState<any[]>([]);
  const [aiSelectedStageId, setAiSelectedStageId] = useState<string>("");
  const [aiSelectedSmartFileTemplateIds, setAiSelectedSmartFileTemplateIds] = useState<Record<number, string>>({});
  const [editedMessageContent, setEditedMessageContent] = useState<string>("");
  
  // Conversational AI state
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [currentChatMessage, setCurrentChatMessage] = useState("");
  const [conversationState, setConversationState] = useState<any>(null);
  const [manageRulesDialogOpen, setManageRulesDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<any>(null);
  const [timingMode, setTimingMode] = useState<'immediate' | 'delayed'>('immediate');
  const [activeProjectType, setActiveProjectType] = useState<string>('WEDDING');
  const [isSettingUpDefaults, setIsSettingUpDefaults] = useState(false);
  const [enableCommunication, setEnableCommunication] = useState(true);
  const [enablePipeline, setEnablePipeline] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<any>(null);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  // Edit form states
  const [editEnableCommunication, setEditEnableCommunication] = useState(true);
  const [editEnablePipeline, setEditEnablePipeline] = useState(false);
  const [editTimingMode, setEditTimingMode] = useState<'immediate' | 'delayed'>('immediate');
  
  // Email builder states
  const [emailBuilderMode, setEmailBuilderMode] = useState<'select' | 'build'>('select');
  const [customEmailSubject, setCustomEmailSubject] = useState('');
  const [customEmailBlocks, setCustomEmailBlocks] = useState<any[]>([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [includeHeroImage, setIncludeHeroImage] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [includeHeader, setIncludeHeader] = useState(false);
  const [headerStyle, setHeaderStyle] = useState('professional');
  const [includeSignature, setIncludeSignature] = useState(true);
  const [signatureStyle, setSignatureStyle] = useState('professional');
  
  // Wizard state for step-by-step automation creation
  const [wizardStep, setWizardStep] = useState(1);
  const totalSteps = 5;
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  // Reset modal state when dialog opens
  useEffect(() => {
    if (createDialogOpen) {
      // Reset wizard step to beginning
      setWizardStep(1);
      // Reset toggle states to default
      setEnableCommunication(true);
      setEnablePipeline(false);
      setTimingMode('immediate');
      // Reset email builder states
      setEmailBuilderMode('select');
      setCustomEmailSubject('');
      setCustomEmailBlocks([]);
      setSaveAsTemplate(false);
      setNewTemplateName('');
      setIncludeHeroImage(false);
      setHeroImageUrl('');
      setIncludeHeader(false);
      setHeaderStyle('professional');
      setIncludeSignature(true);
      setSignatureStyle('professional');
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
    triggerTiming: z.enum(['BEFORE', 'AFTER']).default('BEFORE'),
    triggerHour: z.coerce.number().min(0).max(23).default(9),
    triggerMinute: z.coerce.number().min(0).max(59).default(0),
    eventType: z.string().optional(),
    stageCondition: z.string().optional(),
    eventDateCondition: z.string().optional(),
    // Optional automation type flags
    enableCommunication: z.boolean().default(true),
    enablePipeline: z.boolean().default(false),
    // Communication automation fields
    channel: z.string().default("EMAIL"),
    templateId: z.string().optional(),
    smartFileTemplateId: z.string().optional(),
    smsMessageType: z.enum(['template', 'custom']).default('template').optional(),
    customSmsContent: z.string().optional(),
    delayMinutes: z.coerce.number().min(0).default(0),
    delayHours: z.coerce.number().min(0).default(0),
    delayDays: z.coerce.number().min(0).default(0),
    questionnaireTemplateId: z.string().optional(),
    // Pipeline automation fields (simplified - only target stage)
    targetStageId: z.string().optional(),
    // Email builder state fields (synced from React state for validation)
    emailBuilderMode: z.enum(['select', 'build']).default('select').optional(),
    customEmailSubject: z.string().optional(),
    customEmailBlocks: z.any().optional() // Array of blocks
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
      // If communication is enabled, require template, questionnaire, or Smart File
      if (data.enableCommunication) {
        const hasTemplate = data.templateId && data.templateId.length > 0 && data.templateId !== "unavailable";
        const hasQuestionnaire = data.questionnaireTemplateId && data.questionnaireTemplateId.length > 0 && data.questionnaireTemplateId !== "none" && data.questionnaireTemplateId !== "unavailable";
        const hasSmartFile = data.smartFileTemplateId && data.smartFileTemplateId.length > 0 && data.smartFileTemplateId !== "unavailable" && data.smartFileTemplateId !== "none";
        const hasCustomSms = data.customSmsContent && data.customSmsContent.length > 0;
        const hasCustomEmailBuilder = data.emailBuilderMode === 'build' && 
                                     data.customEmailSubject && data.customEmailSubject.trim().length > 0 &&
                                     data.customEmailBlocks && Array.isArray(data.customEmailBlocks) && data.customEmailBlocks.length > 0;
        
        // For SMART_FILE channel, only smartFileTemplateId is required
        if (data.channel === 'SMART_FILE') {
          if (!hasSmartFile) {
            return false;
          }
        } else if (data.channel === 'SMS') {
          // For SMS, require template, custom content, or questionnaire
          if (!hasTemplate && !hasCustomSms && !hasQuestionnaire) {
            return false;
          }
        } else if (data.channel === 'EMAIL') {
          // For EMAIL, require template, questionnaire, OR custom email builder
          if (!hasTemplate && !hasQuestionnaire && !hasCustomEmailBuilder) {
            return false;
          }
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

  // Create form setup
  const form = useForm<UnifiedFormData>({
    resolver: zodResolver(unifiedFormSchema),
    defaultValues: {
      name: "",
      stageId: "", // Legacy field for backend compatibility
      triggerMode: "STAGE" as const,
      triggerStageId: "",
      triggerEvent: "",
      daysBefore: 7,
      triggerTiming: "BEFORE" as const,
      triggerHour: 9,
      triggerMinute: 0,
      eventType: "placeholder",
      stageCondition: "all",
      eventDateCondition: "",
      channel: "EMAIL", 
      enabled: true,
      automationType: "COMMUNICATION", // Still needed for backend compatibility
      enableCommunication: true,
      enablePipeline: false,
      templateId: "",
      smartFileTemplateId: "",
      delayMinutes: 0,
      delayHours: 0,
      delayDays: 0,
      questionnaireTemplateId: "",
      targetStageId: "",
      smsMessageType: "template",
      customSmsContent: "",
      // Email builder fields
      emailBuilderMode: "select",
      customEmailSubject: "",
      customEmailBlocks: []
    }
  });

  // Edit form setup
  const editForm = useForm<UnifiedFormData>({
    resolver: zodResolver(unifiedFormSchema),
    defaultValues: {
      name: "",
      stageId: "",
      triggerMode: "STAGE" as const,
      triggerStageId: "",
      triggerEvent: "",
      daysBefore: 7,
      triggerTiming: "BEFORE" as const,
      triggerHour: 9,
      triggerMinute: 0,
      eventType: "placeholder",
      stageCondition: "all",
      eventDateCondition: "",
      channel: "EMAIL",
      enabled: true,
      automationType: "COMMUNICATION",
      enableCommunication: true,
      enablePipeline: false,
      templateId: "",
      smartFileTemplateId: "",
      delayMinutes: 0,
      delayHours: 0,
      delayDays: 0,
      questionnaireTemplateId: "",
      targetStageId: "",
      smsMessageType: "template",
      customSmsContent: ""
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

  // Auto-switch to delayed mode when user enters delay values
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'delayMinutes' || name === 'delayHours' || name === 'delayDays') {
        const hasDelay = (value.delayDays && value.delayDays > 0) || 
                        (value.delayHours && value.delayHours > 0) || 
                        (value.delayMinutes && value.delayMinutes > 0);
        if (hasDelay && timingMode === 'immediate') {
          setTimingMode('delayed');
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, timingMode]);

  // Sync email builder state into form for validation
  useEffect(() => {
    form.setValue('emailBuilderMode', emailBuilderMode);
    form.setValue('customEmailSubject', customEmailSubject);
    form.setValue('customEmailBlocks', customEmailBlocks);
  }, [emailBuilderMode, customEmailSubject, customEmailBlocks, form]);

  // Populate edit form when editing automation changes
  useEffect(() => {
    if (editingAutomation && editDialogOpen) {
      const auto = editingAutomation;
      
      // Determine trigger mode
      let triggerMode: 'STAGE' | 'BUSINESS' | 'TIME' = 'STAGE';
      if (auto.daysBefore !== null && auto.daysBefore !== undefined) {
        triggerMode = 'TIME';
      } else if (auto.businessTriggers && auto.businessTriggers.length > 0) {
        triggerMode = 'BUSINESS';
      }
      
      // Set enable flags based on automation type
      const isComm = auto.automationType === 'COMMUNICATION';
      const isPipe = auto.automationType === 'PIPELINE_CHANGE';
      setEditEnableCommunication(isComm);
      setEditEnablePipeline(isPipe);
      
      // Populate form - use nullish coalescing to preserve 0 values
      editForm.reset({
        name: auto.name ?? "",
        stageId: auto.stageId ?? "",
        triggerMode: triggerMode,
        triggerStageId: auto.stageId ?? "",
        triggerEvent: auto.businessTriggers?.[0]?.triggerType ?? "",
        daysBefore: auto.daysBefore ?? 7,
        triggerTiming: auto.triggerTiming ?? "BEFORE",
        triggerHour: auto.triggerHour ?? 9,
        triggerMinute: auto.triggerMinute ?? 0,
        eventType: auto.eventType ?? "placeholder",
        stageCondition: auto.stageCondition ?? "all",
        eventDateCondition: auto.eventDateCondition ?? "",
        channel: auto.channel ?? "EMAIL",
        enabled: auto.enabled ?? true,
        automationType: auto.automationType ?? "COMMUNICATION",
        enableCommunication: isComm,
        enablePipeline: isPipe,
        templateId: auto.templateId ?? "",
        delayMinutes: 0,
        delayHours: 0,
        delayDays: 0,
        questionnaireTemplateId: auto.questionnaireTemplateId ?? "",
        // Extract ID from targetStage object (could be string ID or object with id property)
        targetStageId: typeof auto.targetStage === 'string' ? auto.targetStage : (auto.targetStage?.id ?? "")
      });
      
      // Set timing mode based on steps (will be handled separately)
      setEditTimingMode('immediate');
    }
  }, [editingAutomation, editDialogOpen, editForm]);

  // Update edit form when edit enable flags change
  useEffect(() => {
    editForm.clearErrors();
    editForm.setValue('enableCommunication', editEnableCommunication);
    editForm.setValue('enablePipeline', editEnablePipeline);
    
    if (!editEnableCommunication) {
      editForm.setValue('templateId', '');
      editForm.setValue('delayMinutes', 0);
      editForm.setValue('delayHours', 0);
      editForm.setValue('delayDays', 0);
      editForm.setValue('questionnaireTemplateId', '');
      editForm.setValue('channel', 'EMAIL');
    }
    if (!editEnablePipeline) {
      editForm.setValue('targetStageId', '');
    }
  }, [editEnableCommunication, editEnablePipeline, editForm]);

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

  const { data: automations = [], isLoading: automationsLoading } = useQuery<any[]>({
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

  const { data: smartFiles = [] } = useQuery<any[]>({
    queryKey: ["/api/smart-files"],
    queryFn: () => fetch(`/api/smart-files`).then(res => res.json()),
    enabled: !!user
  });

  // Set initial selected stage when stages load
  useEffect(() => {
    if (stages && stages.length > 0 && !selectedStageId) {
      setSelectedStageId(stages[0].id);
    }
  }, [stages, selectedStageId]);

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

          const commAutomationData: any = {
            name: data.name + (data.enablePipeline ? " (Communication)" : ""),
            stageId: stageId,
            enabled: data.enabled,
            projectType: activeProjectType,
            automationType: "COMMUNICATION" as const,
            channel: data.channel,
            templateId: data.templateId && data.templateId !== "unavailable" ? data.templateId : null,
            questionnaireTemplateId: data.questionnaireTemplateId && data.questionnaireTemplateId !== "unavailable" && data.questionnaireTemplateId !== "none" ? data.questionnaireTemplateId : null,
            eventDateCondition: data.eventDateCondition || null,
            smartFileTemplateId: (data as any).smartFileTemplateId && (data as any).smartFileTemplateId !== "unavailable" && (data as any).smartFileTemplateId !== "none" ? (data as any).smartFileTemplateId : null
          };
          
          // Include custom email builder data if present
          if ((data as any).useEmailBuilder) {
            commAutomationData.useEmailBuilder = true;
            commAutomationData.emailSubject = (data as any).emailSubject;
            commAutomationData.emailBlocks = (data as any).emailBlocks;
            commAutomationData.includeHeroImage = (data as any).includeHeroImage;
            commAutomationData.heroImageUrl = (data as any).heroImageUrl;
            commAutomationData.includeHeader = (data as any).includeHeader;
            commAutomationData.headerStyle = (data as any).headerStyle;
            commAutomationData.includeSignature = (data as any).includeSignature;
            commAutomationData.signatureStyle = (data as any).signatureStyle;
          }
          
          // Add stageCondition for business event triggers
          if (data.triggerMode === 'BUSINESS' && data.stageCondition && data.stageCondition !== 'all') {
            commAutomationData.stageCondition = data.stageCondition;
          }

          const commResponse = await apiRequest("POST", "/api/automations", commAutomationData);
          const commAutomation = await commResponse.json();
          createdAutomations.push(commAutomation);
          
          // Create business trigger if this is a business event trigger
          if (data.triggerMode === 'BUSINESS' && data.triggerEvent) {
            await apiRequest("POST", "/api/business-triggers", {
              automationId: commAutomation.id,
              triggerType: data.triggerEvent,
              enabled: true
            });
          }
          
          // Create automation step for communication (with templates, questionnaires, or Smart Files)
          const hasTemplate = data.templateId && data.templateId !== "unavailable";
          const hasSmartFile = data.smartFileTemplateId && data.smartFileTemplateId !== "unavailable";
          const hasQuestionnaire = data.questionnaireTemplateId && data.questionnaireTemplateId !== "unavailable" && data.questionnaireTemplateId !== "none";
          const hasCustomSms = data.customSmsContent && data.customSmsContent.length > 0;
          
          if (hasTemplate || hasSmartFile || hasQuestionnaire || hasCustomSms) {
            const totalDelayMinutes = timingMode === 'immediate' ? 0 : 
              (data.delayDays * 24 * 60) + (data.delayHours * 60) + data.delayMinutes;
            
            const stepData: any = {
              stepIndex: 0,
              delayMinutes: totalDelayMinutes,
              enabled: true,
              actionType: data.channel // EMAIL, SMS, or SMART_FILE
            };
            
            // Add templateId for EMAIL/SMS or smartFileTemplateId for SMART_FILE
            if (hasTemplate) {
              stepData.templateId = data.templateId;
            } else if (hasSmartFile) {
              stepData.smartFileTemplateId = data.smartFileTemplateId;
            } else if (hasCustomSms) {
              stepData.customSmsContent = data.customSmsContent;
            }
            
            await apiRequest("POST", `/api/automations/${commAutomation.id}/steps`, stepData);
          }
        }

        // Handle time-based triggers - update automation with time fields
        if (data.triggerMode === 'TIME' && createdAutomations.length > 0) {
          // Update the created automation(s) with time-based trigger fields
          for (const automation of createdAutomations) {
            const timeData = {
              daysBefore: data.daysBefore,
              triggerTiming: data.triggerTiming,
              triggerHour: data.triggerHour,
              triggerMinute: data.triggerMinute,
              eventType: data.eventType,
              stageCondition: data.stageCondition && data.stageCondition !== 'all' ? data.stageCondition : null,
              eventDateCondition: null // Countdown automations always require event dates, so no condition filtering
            };
            
            await apiRequest("PATCH", `/api/automations/${automation.id}`, timeData);
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
            stageCondition: data.stageCondition && data.stageCondition !== 'all' ? data.stageCondition : null,
            enabled: data.enabled,
            projectType: activeProjectType,
            automationType: "STAGE_CHANGE" as const,
            triggerType: triggerType,
            targetStageId: data.targetStageId,
            eventDateCondition: data.eventDateCondition || null
          };

          const pipelineResponse = await apiRequest("POST", "/api/automations", pipelineAutomationData);
          const pipelineAutomation = await pipelineResponse.json();
          createdAutomations.push(pipelineAutomation);
          
          // Create business trigger for pipeline automation
          if (data.triggerEvent) {
            await apiRequest("POST", "/api/business-triggers", {
              automationId: pipelineAutomation.id,
              triggerType: data.triggerEvent,
              enabled: true
            });
          }
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
      console.log('✅ Automation(s) created successfully:', createdAutomations);
      toast({ 
        title: `${count > 1 ? 'Automations' : 'Automation'} created successfully`,
        description: `Created ${count} automation${count > 1 ? 's' : ''} successfully.`
      });
      console.log('🔄 Invalidating queries with key: ["/api/automations", activeProjectType]');
      queryClient.invalidateQueries({ queryKey: ["/api/automations", activeProjectType] });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] }); // Also invalidate base key for safety
      console.log('🚪 Closing dialog and resetting form');
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

  const handleCreateAutomation = async (data: UnifiedFormData) => {
    console.log('🚀 handleCreateAutomation called with data:', data);
    console.log('📋 Channel:', data.channel);
    console.log('📁 Smart File Template ID:', data.smartFileTemplateId);
    
    // If using custom email builder, add email blocks directly to automation
    if (data.channel === 'EMAIL' && emailBuilderMode === 'build') {
      try {
        // Validate custom email
        if (!customEmailSubject.trim()) {
          toast({
            title: "Subject required",
            description: "Please enter an email subject line",
            variant: "destructive"
          });
          return;
        }
        
        if (customEmailBlocks.length === 0) {
          toast({
            title: "Content required",
            description: "Please add at least one content block to your email",
            variant: "destructive"
          });
          return;
        }
        
        // Add email blocks directly to automation data
        (data as any).useEmailBuilder = true;
        (data as any).emailSubject = customEmailSubject;
        (data as any).emailBlocks = customEmailBlocks;
        (data as any).includeHeroImage = includeHeroImage;
        (data as any).heroImageUrl = includeHeroImage ? heroImageUrl : undefined;
        (data as any).includeHeader = includeHeader;
        (data as any).headerStyle = includeHeader ? headerStyle : undefined;
        (data as any).includeSignature = includeSignature;
        (data as any).signatureStyle = includeSignature ? signatureStyle : undefined;
        
        // Optionally save as template if user requested
        if (saveAsTemplate && newTemplateName.trim()) {
          try {
            await apiRequest('POST', '/api/templates', {
              name: newTemplateName,
              channel: 'EMAIL',
              subject: customEmailSubject,
              contentBlocks: customEmailBlocks,
              includeHeroImage,
              heroImageUrl: includeHeroImage ? heroImageUrl : undefined,
              includeHeader,
              headerStyle: includeHeader ? headerStyle : undefined,
              includeSignature,
              signatureStyle: includeSignature ? signatureStyle : undefined
            });
            
            toast({
              title: "Template saved",
              description: `"${newTemplateName}" has been saved to your templates`
            });
          } catch (error: any) {
            // Don't fail the automation creation if template save fails
            console.error('Failed to save template:', error);
          }
        }
        
      } catch (error: any) {
        toast({
          title: "Validation failed",
          description: error.message || "An error occurred while validating the email",
          variant: "destructive"
        });
        return;
      }
    }
    
    // Normalize smartFileTemplateId: convert empty string to null/undefined
    if (data.smartFileTemplateId === '' || data.smartFileTemplateId === 'none') {
      (data as any).smartFileTemplateId = undefined;
    }
    
    createAutomationMutation.mutate(data);
  };

  const handleDeleteAutomation = (automationId: string) => {
    deleteAutomationMutation.mutate(automationId);
  };

  // AI automation extraction mutation (step 1)
  const extractAiAutomationMutation = useMutation({
    mutationFn: async (description: string) => {
      const response = await apiRequest("POST", "/api/automations/extract-with-ai", { description });
      return response.json();
    },
    onSuccess: (data: any) => {
      setExtractedData(data.extracted);
      setAvailableStages(data.availableStages);
      // Initialize edited message content with the first step's content
      if (data.extracted?.steps?.[0]?.content) {
        setEditedMessageContent(data.extracted.steps[0].content);
      }
      setAiDialogOpen(false);
      setAiConfirmDialogOpen(true);
    },
    onError: (error: any) => {
      console.error('Extract AI automation error:', error);
      toast({ 
        title: "Failed to process request", 
        description: error?.message || "Unknown error occurred",
        variant: "destructive" 
      });
    }
  });

  // AI automation creation mutation (step 2 - after confirmation)
  const createAiAutomationMutation = useMutation({
    mutationFn: async ({ extractedData, selectedStageId }: any) => {
      console.log('Mutation received:', { extractedData, selectedStageId });
      console.log('ExtractedData is:', extractedData);
      console.log('ExtractedData type:', typeof extractedData);
      const response = await apiRequest("POST", "/api/automations/create-with-ai", { extractedData, selectedStageId });
      return response.json();
    },
    onSuccess: (automation) => {
      toast({ 
        title: "Automation created successfully",
        description: `"${automation.name}" has been created and is ready to use.`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setAiConfirmDialogOpen(false);
      setAiDescription("");
      setExtractedData(null);
      setAiSelectedStageId("");
      setAiSelectedSmartFileTemplateIds({});
      setEditedMessageContent("");
    },
    onError: (error: any) => {
      console.error('Create AI automation error:', error);
      toast({ 
        title: "Failed to create automation", 
        description: error?.message || "Unknown error occurred",
        variant: "destructive" 
      });
    }
  });

  const handleExtractAiAutomation = () => {
    if (!aiDescription.trim()) {
      toast({
        title: "Description required",
        description: "Please describe what you want the automation to do.",
        variant: "destructive"
      });
      return;
    }
    extractAiAutomationMutation.mutate(aiDescription);
  };

  // Conversational AI chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/automations/chat", {
        message,
        conversationHistory: chatMessages,
        currentState: conversationState
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      // Add AI's response to chat
      const aiMessage = { role: 'assistant' as const, content: data.state.nextQuestion };
      setChatMessages(prev => [...prev, aiMessage]);
      setConversationState(data.state);
      setCurrentChatMessage("");

      // If automation was created, close dialog and show success
      if (data.created) {
        toast({
          title: "Automation created!",
          description: "Your automation has been set up successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
        setChatDialogOpen(false);
        setChatMessages([]);
        setConversationState(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to process message",
        variant: "destructive"
      });
    }
  });

  const handleSendChatMessage = () => {
    if (!currentChatMessage.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user' as const, content: currentChatMessage };
    setChatMessages(prev => [...prev, userMessage]);
    
    // Send to AI
    chatMutation.mutate(currentChatMessage);
  };

  const startConversationalAI = () => {
    setChatMessages([{
      role: 'assistant',
      content: "Hi! I'll help you create an automation. What would you like to automate? For example, you could say 'Send a thank you email 1 day after someone books' or 'Send a proposal 2 days after inquiry at 6pm'"
    }]);
    setConversationState(null);
    setChatDialogOpen(true);
  };

  const handleConfirmAiAutomation = () => {
    if (!extractedData) {
      toast({
        title: "Error",
        description: "No automation data available. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate smart file template selection if needed
    const missingTemplateSteps = extractedData.steps
      .map((step: any, idx: number) => ({ step, idx }))
      .filter(({ step, idx }: any) => step.type === 'SMART_FILE' && !aiSelectedSmartFileTemplateIds[idx]);
    
    if (missingTemplateSteps.length > 0) {
      toast({
        title: "Template Required",
        description: "Please select a Smart File template for all Smart File steps.",
        variant: "destructive"
      });
      return;
    }
    
    // Update the extracted data with the edited message content and smart file templates
    const updatedExtractedData = {
      ...extractedData,
      steps: extractedData.steps.map((step: any, idx: number) => ({
        ...step,
        content: idx === 0 ? editedMessageContent : step.content,
        smartFileTemplateId: step.type === 'SMART_FILE' ? aiSelectedSmartFileTemplateIds[idx] : undefined
      }))
    };
    
    console.log('Creating automation with data:', { extractedData: updatedExtractedData, selectedStageId: aiSelectedStageId });
    // Explicitly pass the current values to avoid closure issues
    const dataToSend = {
      extractedData: updatedExtractedData,
      selectedStageId: aiSelectedStageId || null
    };
    console.log('Data to send:', dataToSend);
    createAiAutomationMutation.mutate(dataToSend);
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

  // Edit automation mutation - comprehensive update
  const editAutomationMutation = useMutation({
    mutationFn: async (data: UnifiedFormData) => {
      if (!editingAutomation) throw new Error("No automation selected");
      
      const automationId = editingAutomation.id;
      
      // Build update data based on form values
      const updateData: any = {
        name: data.name,
        enabled: data.enabled,
        eventDateCondition: data.eventDateCondition || null
      };
      
      // Add trigger-specific fields
      if (data.triggerMode === 'STAGE') {
        updateData.stageId = data.triggerStageId && data.triggerStageId !== 'global' ? data.triggerStageId : null;
      } else if (data.triggerMode === 'BUSINESS') {
        updateData.stageCondition = data.stageCondition && data.stageCondition !== 'all' ? data.stageCondition : null;
      } else if (data.triggerMode === 'TIME') {
        updateData.daysBefore = data.daysBefore;
        updateData.triggerTiming = data.triggerTiming;
        updateData.triggerHour = data.triggerHour;
        updateData.triggerMinute = data.triggerMinute;
        updateData.eventType = data.eventType;
        updateData.stageCondition = data.stageCondition && data.stageCondition !== 'all' ? data.stageCondition : null;
        updateData.eventDateCondition = null; // Countdown automations can't have this condition
      }
      
      // Add communication-specific fields
      if (editingAutomation.automationType === 'COMMUNICATION') {
        updateData.channel = data.channel;
        updateData.templateId = data.templateId && data.templateId !== "unavailable" ? data.templateId : null;
        updateData.questionnaireTemplateId = data.questionnaireTemplateId && data.questionnaireTemplateId !== "unavailable" && data.questionnaireTemplateId !== "none" ? data.questionnaireTemplateId : null;
      }
      
      // Add pipeline-specific fields
      if (editingAutomation.automationType === 'PIPELINE_CHANGE') {
        updateData.targetStage = data.targetStageId;
      }
      
      return apiRequest("PATCH", `/api/automations/${automationId}`, updateData);
    },
    onSuccess: () => {
      toast({ title: "Automation updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setEditDialogOpen(false);
      setEditingAutomation(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update automation", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    }
  });

  const handleToggleAutomation = (automationId: string, enabled: boolean) => {
    toggleAutomationMutation.mutate({ automationId, enabled });
  };

  const handleEditAutomation = (automation: any) => {
    setEditingAutomation(automation);
    setEditDialogOpen(true);
  };

  // Wizard navigation functions
  const canProceedToStep2 = () => {
    return !!form.watch('name');
  };

  const canProceedToStep3 = () => {
    const triggerMode = form.watch('triggerMode');
    if (triggerMode === 'STAGE') {
      return !!form.watch('triggerStageId');
    } else if (triggerMode === 'BUSINESS') {
      return !!form.watch('triggerEvent');
    } else if (triggerMode === 'TIME') {
      return !!form.watch('daysBefore') && !!form.watch('eventType') && form.watch('eventType') !== 'placeholder';
    }
    return false;
  };

  const canProceedToStep4 = () => {
    // At least one action type must be enabled
    return enableCommunication || enablePipeline;
  };

  const canProceedToStep5 = () => {
    // Validate content based on what's enabled
    if (enableCommunication) {
      const channel = form.watch('channel');
      if (channel === 'SMART_FILE') {
        return !!form.watch('smartFileTemplateId') && form.watch('smartFileTemplateId') !== 'unavailable';
      } else if (channel === 'SMS') {
        const hasTemplate = form.watch('templateId') && form.watch('templateId') !== 'unavailable';
        const hasCustom = form.watch('smsMessageType') === 'custom' && !!form.watch('customSmsContent');
        return hasTemplate || hasCustom;
      } else if (channel === 'EMAIL') {
        const hasTemplate = form.watch('templateId') && form.watch('templateId') !== 'unavailable';
        const builderMode = form.watch('emailBuilderMode');
        const blocks = form.watch('customEmailBlocks');
        const subject = form.watch('customEmailSubject');
        const hasCustom = builderMode === 'build' && blocks && Array.isArray(blocks) && blocks.length > 0 && subject && subject.trim().length > 0;
        return hasTemplate || hasCustom;
      }
    }
    if (enablePipeline) {
      return !!form.watch('targetStageId');
    }
    return false;
  };

  const handleNextStep = () => {
    if (wizardStep < totalSteps) {
      setWizardStep(wizardStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Return null if not authenticated (redirect handled by useEffect)
  if (!user) {
    return null;
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
            <DialogContent className={`w-[95vw] ${emailBuilderMode === 'build' && form.watch('channel') === 'EMAIL' ? 'max-w-7xl' : 'sm:max-w-2xl'} max-h-[92vh] p-0 flex flex-col overflow-hidden`}>
                <DialogHeader className="sticky top-0 z-10 bg-background px-6 py-4 border-b">
                  <DialogTitle>Create new {activeProjectType.toLowerCase()} automation</DialogTitle>
                  <DialogDescription>
                    Save time by automating routine tasks for your clients
                  </DialogDescription>
                  {/* Progress Indicator */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                      <span>Step {wizardStep} of {totalSteps}</span>
                      <span className="text-xs">
                        {wizardStep === 1 && "Basic Information"}
                        {wizardStep === 2 && "Trigger"}
                        {wizardStep === 3 && "Action Type"}
                        {wizardStep === 4 && "Content"}
                        {wizardStep === 5 && "Review & Activate"}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(wizardStep / totalSteps) * 100}%` }}
                      />
                    </div>
                  </div>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={(e) => {
                    e.preventDefault(); // Always prevent default form submission
                    console.log('📝 Form onSubmit fired, wizardStep:', wizardStep, 'totalSteps:', totalSteps);
                    
                    // Only allow submission at step 5
                    if (wizardStep !== totalSteps) {
                      console.log('🚫 Not at final step, blocking submission');
                      return false;
                    }
                    
                    console.log('✅ At final step, calling handleCreateAutomation');
                    form.handleSubmit(handleCreateAutomation)(e);
                  }} onKeyDown={(e) => {
                    // Prevent Enter key from submitting the form unless at step 5
                    if (e.key === 'Enter' && wizardStep !== totalSteps) {
                      e.preventDefault();
                      console.log('🚫 Enter key blocked - not at final step');
                    }
                  }} className="flex flex-col min-h-0 flex-1">
                    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-8">
                  
                  {/* Step 1: Basic Information */}
                  {wizardStep === 1 && (
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
                  )}

                  {/* Step 2: When (Trigger) */}
                  {wizardStep === 2 && (
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
                                  <span>Based on event date</span>
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
                                {Array.isArray(stages) && stages.map((stage: any) => (
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
                      <div className="space-y-4">
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
                                  <SelectItem value="SMART_FILE_ACCEPTED">📄 Smart File Accepted</SelectItem>
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
                        
                        <FormField
                          control={form.control}
                          name="stageCondition"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Only trigger when client is in stage (optional)</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || "all"}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-stage-condition">
                                    <SelectValue placeholder="Select a stage or leave as 'All Stages'" />
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
                                Limit this trigger to only fire when the client is in a specific stage
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Time-based Trigger Fields */}
                    {form.watch('triggerMode') === 'TIME' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="daysBefore"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Number of Days</FormLabel>
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
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="triggerTiming"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Before or After?</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-trigger-timing">
                                      <SelectValue placeholder="Select timing" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="BEFORE">Before</SelectItem>
                                    <SelectItem value="AFTER">After</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

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

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="triggerHour"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>At what time? (Hour)</FormLabel>
                                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-trigger-hour">
                                      <SelectValue placeholder="Select hour" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Array.from({ length: 24 }, (_, i) => (
                                      <SelectItem key={i} value={i.toString()}>
                                        {i.toString().padStart(2, '0')}:00 {i < 12 ? 'AM' : 'PM'}
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
                            name="triggerMinute"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Minute</FormLabel>
                                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-trigger-minute">
                                      <SelectValue placeholder="Select minute" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {[0, 15, 30, 45].map((minute) => (
                                      <SelectItem key={minute} value={minute.toString()}>
                                        :{minute.toString().padStart(2, '0')}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

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
                  )}

                  {/* Step 3: Action Type */}
                  {wizardStep === 3 && (
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
                    
                    <div className="ml-11 space-y-4 p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={enableCommunication}
                            onCheckedChange={setEnableCommunication}
                            data-testid="switch-enable-communication"
                          />
                          <Label className="flex items-center space-x-2 cursor-pointer" onClick={() => setEnableCommunication(!enableCommunication)}>
                            <Mail className="h-4 w-4" />
                            <span className="font-medium">Send a message (Email/SMS/Smart File)</span>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={enablePipeline}
                            onCheckedChange={setEnablePipeline}
                            data-testid="switch-enable-pipeline"
                          />
                          <Label className="flex items-center space-x-2 cursor-pointer" onClick={() => setEnablePipeline(!enablePipeline)}>
                            <ArrowRight className="h-4 w-4" />
                            <span className="font-medium">Move client to a different stage</span>
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Step 4: Content - Only show when on Step 4 */}
                  {wizardStep === 4 && (
                  <div className="space-y-4">

                  {/* Step 4: What Actions */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-semibold">
                        4
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
                  {enablePipeline && form.watch('triggerMode') === 'STAGE' ? (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-yellow-800 dark:text-yellow-200">
                          <p className="font-medium mb-1">Current Limitations:</p>
                          <ul className="text-xs space-y-1">
                            <li>• Stage-based triggers for pipeline actions are coming soon</li>
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
                        <FormLabel>Action Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-channel">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="EMAIL">📧 Send Email</SelectItem>
                            <SelectItem value="SMS">📱 Send SMS</SelectItem>
                            <SelectItem value="SMART_FILE">📄 Send Smart File</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('channel') === 'SMS' && (
                    <>
                      <FormField
                        control={form.control}
                        name="smsMessageType"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Message Type</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  // Clear the other field when switching
                                  if (value === 'custom') {
                                    form.setValue('templateId', '');
                                  } else {
                                    form.setValue('customSmsContent', '');
                                  }
                                }}
                                value={field.value || 'template'}
                                className="flex flex-col space-y-1"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="template" id="template" />
                                  <Label htmlFor="template" className="font-normal cursor-pointer">
                                    Use Template
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="custom" id="custom" />
                                  <Label htmlFor="custom" className="font-normal cursor-pointer">
                                    Custom Message
                                  </Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch('smsMessageType') === 'custom' ? (
                        <FormField
                          control={form.control}
                          name="customSmsContent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Custom SMS Message</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Type your SMS message here... (supports variables like {{firstName}}, {{lastName}}, {{projectType}})"
                                  className="min-h-[100px]"
                                  {...field}
                                  data-testid="textarea-custom-sms"
                                />
                              </FormControl>
                              <FormDescription>
                                You can use variables: {'{{'} firstName {'}}'},  {'{{'} lastName {'}}'},  {'{{'} projectType {'}}'},  {'{{'} eventDate {'}}'}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name="templateId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SMS Template</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-template">
                                    <SelectValue placeholder="Choose a message template" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {templates
                                    .filter((t: any) => t.channel === 'SMS')
                                    .map((template: any) => (
                                      <SelectItem key={template.id} value={template.id}>
                                        {template.name}
                                      </SelectItem>
                                    ))}
                                  {templates.filter((t: any) => t.channel === 'SMS').length === 0 && (
                                    <SelectItem value="unavailable" disabled>
                                      No SMS templates available - create templates first
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </>
                  )}

                  {form.watch('channel') === 'EMAIL' && (
                    <div className="space-y-4">
                      {/* Mode Toggle */}
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={emailBuilderMode === 'select' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEmailBuilderMode('select')}
                          data-testid="button-mode-select"
                        >
                          📋 Select Template
                        </Button>
                        <Button
                          type="button"
                          variant={emailBuilderMode === 'build' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEmailBuilderMode('build')}
                          data-testid="button-mode-build"
                        >
                          ✨ Build Custom Email
                        </Button>
                      </div>
                      
                      {emailBuilderMode === 'select' ? (
                        <FormField
                          control={form.control}
                          name="templateId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Template</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-template">
                                    <SelectValue placeholder="Choose a message template" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {templates
                                    .filter((t: any) => t.channel === 'EMAIL')
                                    .map((template: any) => (
                                      <SelectItem key={template.id} value={template.id}>
                                        {template.name}
                                      </SelectItem>
                                    ))}
                                  {templates.filter((t: any) => t.channel === 'EMAIL').length === 0 && (
                                    <SelectItem value="unavailable" disabled>
                                      No email templates available - create templates first
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <div className="space-y-4">
                          {/* Settings Container */}
                          <div className="bg-slate-200 dark:bg-slate-800/60 rounded-lg p-4 space-y-3 border border-slate-400 dark:border-slate-500">
                            <div className="space-y-2">
                              <Label htmlFor="custom-email-subject">Email Subject</Label>
                              <Input
                                id="custom-email-subject"
                                value={customEmailSubject}
                                onChange={(e) => setCustomEmailSubject(e.target.value)}
                                placeholder="e.g., Welcome to our studio!"
                                className="bg-background"
                                data-testid="input-custom-subject"
                              />
                            </div>
                          </div>
                          
                          {/* Build Email Container */}
                          <div className="bg-blue-200 dark:bg-slate-800/60 rounded-lg p-4 border border-blue-400 dark:border-slate-600">
                            {/* Email Builder (2-column layout) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div>
                                <EmailTemplateBuilder
                                  blocks={customEmailBlocks as ContentBlock[]}
                                  onBlocksChange={setCustomEmailBlocks}
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
                              <div>
                                <Label className="mb-2 block">Preview</Label>
                                <EmailPreview
                                  subject={customEmailSubject}
                                  blocks={customEmailBlocks as ContentBlock[]}
                                  includeHeroImage={includeHeroImage}
                                  heroImageUrl={heroImageUrl}
                                  includeHeader={includeHeader}
                                  headerStyle={headerStyle}
                                  includeSignature={includeSignature}
                                  signatureStyle={signatureStyle}
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Save as Template Option */}
                          <div className="flex items-center space-x-2 p-3 border rounded-lg bg-background">
                            <Switch
                              checked={saveAsTemplate}
                              onCheckedChange={setSaveAsTemplate}
                              data-testid="switch-save-as-template"
                            />
                            <Label className="flex-1 cursor-pointer" onClick={() => setSaveAsTemplate(!saveAsTemplate)}>
                              Save as reusable template
                            </Label>
                          </div>
                          
                          {saveAsTemplate && (
                            <div className="space-y-2">
                              <Label htmlFor="template-name">Template Name</Label>
                              <Input
                                id="template-name"
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                placeholder="e.g., Welcome Email Template"
                                data-testid="input-template-name"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {(form.watch('channel') === 'SMART_FILE' || form.watch('channel') === 'EMAIL') && (
                    <FormField
                      control={form.control}
                      name="smartFileTemplateId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {form.watch('channel') === 'SMART_FILE' 
                              ? 'Smart File Template' 
                              : 'Include Smart File Link (Optional)'
                            }
                          </FormLabel>
                          {form.watch('channel') === 'EMAIL' && (
                            <p className="text-sm text-muted-foreground mb-2">
                              Optionally include a link to a Smart File in your email. The Smart File will be created and the link will be available as <code className="bg-muted px-1 rounded">&#123;&#123;smart_file_link&#125;&#125;</code> in your email template.
                            </p>
                          )}
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-smartfile-template">
                                <SelectValue placeholder={
                                  form.watch('channel') === 'SMART_FILE'
                                    ? "Choose a Smart File template"
                                    : "Choose a Smart File template (optional)"
                                } />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {form.watch('channel') === 'EMAIL' && (
                                <SelectItem value="none">No Smart File</SelectItem>
                              )}
                              {smartFiles?.map((smartFile: any) => (
                                <SelectItem key={smartFile.id} value={smartFile.id}>
                                  📄 {smartFile.name}
                                </SelectItem>
                              ))}
                              {(!smartFiles || smartFiles.length === 0) && (
                                <SelectItem value="unavailable" disabled>
                                  No Smart File templates available - create Smart Files first
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

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
                    <FormLabel>Send Timing {timingMode === 'delayed' && <span className="text-blue-600 dark:text-blue-400 font-semibold">(Delay Active)</span>}</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={timingMode === 'immediate' ? 'default' : 'outline'}
                        className="w-full"
                        onClick={() => {
                          setTimingMode('immediate');
                          form.setValue('delayMinutes', 0);
                          form.setValue('delayHours', 0);
                          form.setValue('delayDays', 0);
                        }}
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
                      <div className="space-y-2 p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                        <p className="text-xs text-muted-foreground">Set the delay before sending the message</p>
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
                  </div>
                  )}

                  {/* Step 5: Review & Activate */}
                  {wizardStep === 5 && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-semibold">
                        5
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Review & Activate</h3>
                        <p className="text-sm text-muted-foreground">Review your automation before activating</p>
                      </div>
                    </div>
                    
                    <div className="ml-11 space-y-4 p-4 border rounded-lg bg-card">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between py-2 border-b">
                          <span className="text-sm font-medium text-muted-foreground">Name</span>
                          <span className="text-sm font-semibold">{form.watch('name') || '(Not set)'}</span>
                        </div>
                        <div className="flex items-start justify-between py-2 border-b">
                          <span className="text-sm font-medium text-muted-foreground">Trigger</span>
                          <span className="text-sm">{
                            form.watch('triggerMode') === 'STAGE' ? `Stage: ${stages?.find(s => s.id === form.watch('triggerStageId'))?.name || '(Select stage)'}` :
                            form.watch('triggerMode') === 'BUSINESS' ? `Business Event: ${form.watch('triggerEvent')?.replace(/_/g, ' ') || '(Select event)'}` :
                            `Time-based: ${form.watch('daysBefore')} days`
                          }</span>
                        </div>
                        <div className="flex items-start justify-between py-2 border-b">
                          <span className="text-sm font-medium text-muted-foreground">Actions</span>
                          <div className="text-sm text-right">
                            {enableCommunication && <div>✓ Send {form.watch('channel')}</div>}
                            {enablePipeline && <div>✓ Move to stage</div>}
                          </div>
                        </div>
                        
                        {/* Message Preview */}
                        {enableCommunication && form.watch('templateId') && form.watch('templateId') !== 'unavailable' && (() => {
                          const template = templates?.find((t: any) => t.id === form.watch('templateId'));
                          if (!template) return null;
                          
                          return (
                            <div className="py-2 border-b">
                              <span className="text-sm font-medium text-muted-foreground mb-2 block">
                                {form.watch('channel') === 'EMAIL' ? 'Email Content' : 'SMS Message'}
                              </span>
                              <div className="mt-2 p-3 bg-muted/50 rounded text-sm space-y-2">
                                {template.subject && form.watch('channel') === 'EMAIL' && (
                                  <div>
                                    <span className="font-medium">Subject: </span>
                                    <span className="text-muted-foreground">{template.subject}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium">Message: </span>
                                  <div className="text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-4">
                                    {template.body || '(No content)'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        
                        {/* Timing */}
                        {enableCommunication && (
                          <div className="flex items-start justify-between py-2">
                            <span className="text-sm font-medium text-muted-foreground">Timing</span>
                            <span className="text-sm text-right">
                              {form.watch('delayDays') || 0} days, {form.watch('delayHours') || 0} hours
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Wizard Navigation Footer */}
                  <div className="sticky bottom-0 bg-background px-6 py-4 border-t flex justify-between">
                    <div>
                      {(() => {
                        const showBackButton = wizardStep !== 1;
                        return showBackButton && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handlePrevStep}
                            data-testid="button-wizard-back"
                          >
                            Back
                          </Button>
                        );
                      })()}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button" 
                        variant="outline"
                        onClick={() => setCreateDialogOpen(false)}
                        data-testid="button-cancel-automation"
                      >
                        Cancel
                      </Button>
                      {(() => {
                        const isNotLastStep = wizardStep !== totalSteps;
                        return isNotLastStep ? (
                        <Button
                          type="button"
                          onClick={handleNextStep}
                          disabled={
                            (wizardStep === 1 && !canProceedToStep2()) ||
                            (wizardStep === 2 && !canProceedToStep3()) ||
                            (wizardStep === 3 && !canProceedToStep4()) ||
                            (wizardStep === 4 && !canProceedToStep5())
                          }
                          data-testid="button-wizard-next"
                        >
                          Next
                        </Button>
                      ) : (
                        <Button 
                          type="button"
                          disabled={createAutomationMutation.isPending}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🔍 Create button explicitly clicked');
                            console.log('Form errors:', form.formState.errors);
                            console.log('Form values:', form.getValues());
                            form.handleSubmit(handleCreateAutomation)(e);
                          }}
                          data-testid="button-submit-automation"
                        >
                      {createAutomationMutation.isPending 
                        ? "Creating..." 
                        : (() => {
                            const actions = [];
                            if (enableCommunication) actions.push("Communication");
                            if (enablePipeline) actions.push("Pipeline");
                            
                            if (actions.length === 0) {
                              return "Create Automation";
                            }
                            
                            const suffix = actions.length !== 1 ? "s" : "";
                            return `Create ${actions.join(" + ")} Automation${suffix}`;
                          })()
                      }
                    </Button>
                        );
                      })()}
                    </div>
                  </div>
                  </div>
                  </form>
                </Form>
            </DialogContent>
          </Dialog>
      {/* Edit Automation Dialog - Comprehensive Edit */}
      {editingAutomation && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[92vh] p-0 flex flex-col overflow-hidden">
            <DialogHeader className="sticky top-0 z-10 bg-background px-6 py-4 border-b">
              <DialogTitle>Edit Automation</DialogTitle>
              <DialogDescription>
                Update your automation settings - all fields are editable
              </DialogDescription>
            </DialogHeader>
            
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((data) => editAutomationMutation.mutate(data))} className="flex flex-col min-h-0 flex-1">
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-3">
                    <h3 className="font-semibold">Basic Information</h3>
                    <FormField
                      control={editForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Automation Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Welcome Email, Follow-up SMS" data-testid="input-edit-automation-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Enable/Disable */}
                  <FormField
                    control={editForm.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Enable Automation</FormLabel>
                          <FormDescription>
                            When enabled, this automation will actively run
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-edit-enabled"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Automation Type Indicator */}
                  <div className="border rounded-lg p-3 bg-muted/50">
                    <div className="text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Automation Type:</span>
                        <Badge variant="outline">
                          {editingAutomation.automationType === 'COMMUNICATION' ? 'Communication' : 'Pipeline Change'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Communication-specific fields */}
                  {editingAutomation.automationType === 'COMMUNICATION' && (
                    <div className="space-y-3">
                      <h3 className="font-semibold">Communication Settings</h3>
                      <FormField
                        control={editForm.control}
                        name="channel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Channel</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-edit-channel">
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
                    </div>
                  )}

                  {/* Wedding Date Condition - only for non-countdown automations */}
                  {(!editingAutomation.daysBefore || editingAutomation.daysBefore === null) && (
                    <div className="space-y-3">
                      <h3 className="font-semibold">Conditions (Optional)</h3>
                      <FormField
                        control={editForm.control}
                        name="eventDateCondition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Wedding Date Requirement</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "NO_CONDITION"}>
                              <FormControl>
                                <SelectTrigger data-testid="select-edit-event-date-condition">
                                  <SelectValue placeholder="No condition (run for all clients)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="NO_CONDITION">No condition (run for all clients)</SelectItem>
                                <SelectItem value="HAS_EVENT_DATE">Only if client has wedding date</SelectItem>
                                <SelectItem value="NO_EVENT_DATE">Only if client does NOT have wedding date</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Filter which clients this automation applies to based on wedding date
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={editAutomationMutation.isPending}
                    data-testid="button-save-edit"
                  >
                    {editAutomationMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
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
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
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
            
            {/* Mobile dropdown */}
            <div className="md:hidden w-full">
              <Select value={activeProjectType} onValueChange={setActiveProjectType}>
                <SelectTrigger className="w-full" data-testid="select-project-type">
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
            </div>
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        {activeProjectType.charAt(0) + activeProjectType.slice(1).toLowerCase()} Automations
                      </CardTitle>
                      <CardDescription>
                        Automated workflows for {activeProjectType.toLowerCase()} projects
                      </CardDescription>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      {activeProjectType === "WEDDING" && (
                        <Button
                          onClick={async () => {
                            if (isSettingUpDefaults) return;
                            
                            setIsSettingUpDefaults(true);
                            try {
                              await apiRequest("POST", "/api/automations/setup-wedding-inquiry-defaults");
                              toast({
                                title: "Success!",
                                description: "Wedding inquiry automation sequence has been set up successfully. 11 automations created.",
                              });
                              queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
                            } catch (error: any) {
                              toast({
                                title: "Error",
                                description: error.message || "Failed to set up automation sequence",
                                variant: "destructive"
                              });
                            } finally {
                              setIsSettingUpDefaults(false);
                            }
                          }}
                          disabled={isSettingUpDefaults}
                          variant="default"
                          size="sm"
                          data-testid="button-setup-wedding-defaults"
                          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          {isSettingUpDefaults ? "Setting up..." : "Setup Inquiry Sequence"}
                        </Button>
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={startConversationalAI}
                          variant="default"
                          size="sm"
                          data-testid="button-chat-ai-automation"
                          className="flex-1 sm:flex-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          <span className="hidden sm:inline">Chat with AI</span>
                          <span className="sm:hidden">AI Chat</span>
                        </Button>
                        <Button
                          onClick={() => setAiDialogOpen(true)}
                          variant="outline"
                          size="sm"
                          data-testid="button-create-ai-automation"
                          className="flex-1 sm:flex-auto"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          <span className="hidden sm:inline">Quick Create</span>
                          <span className="sm:hidden">Quick AI</span>
                        </Button>
                        <Button
                          onClick={() => setCreateDialogOpen(true)}
                          size="sm"
                          data-testid="button-create-automation"
                          className="flex-1 sm:flex-auto"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          <span className="hidden sm:inline">New Automation</span>
                          <span className="sm:hidden">New</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {automationsLoading ? (
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
                    <Tabs defaultValue="stage-based" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="stage-based" data-testid="tab-stage-based">
                          <Settings className="w-4 h-4 mr-2" />
                          Stage-Based
                        </TabsTrigger>
                        <TabsTrigger value="global" data-testid="tab-global">
                          <Zap className="w-4 h-4 mr-2" />
                          Global
                        </TabsTrigger>
                      </TabsList>

                      {/* Stage-Based Automations Tab */}
                      <TabsContent value="stage-based" className="space-y-4 mt-4">
                        {(() => {
                          // Include automations with stageId OR stageCondition (not targetStageId alone)
                          const stageBased = automations.filter((a: any) => a.stageId || a.stageCondition);
                          
                          console.log('🔍 Debug - All automations:', automations.length);
                          console.log('🔍 Debug - Stage-based automations:', stageBased.length);
                          console.log('🔍 Debug - Selected stage ID:', selectedStageId);
                          console.log('🔍 Debug - Stage-based automation stageIds:', stageBased.map((a: any) => ({ name: a.name, stageId: a.stageId })));

                          // Get automations for the selected stage
                          const selectedStage = stages?.find((s: any) => s.id === selectedStageId);
                          const stageAutomations = stageBased.filter((a: any) => {
                            // Priority 1: stageCondition (where the automation checks if client is in this stage)
                            if (a.stageCondition === selectedStageId) return true;
                            // Priority 2: stageId (communication automations triggered when entering this stage)
                            if (!a.stageCondition && a.stageId === selectedStageId) return true;
                            return false;
                          });
                          
                          console.log('🔍 Debug - Filtered stage automations:', stageAutomations.length);
                          console.log('🔍 Debug - Filtered automation names:', stageAutomations.map((a: any) => a.name));

                          return stages && stages.length > 0 ? (
                            <div className="space-y-4">
                              {/* Stage Selector Dropdown */}
                              <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium">Select Stage:</Label>
                                <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                                  <SelectTrigger className="w-[250px]" data-testid="select-stage">
                                    <SelectValue placeholder="Select a stage" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.isArray(stages) && stages.map((stage: any) => (
                                      <SelectItem key={stage.id} value={stage.id} data-testid={`select-stage-${stage.id}`}>
                                        {stage.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Stage Automations Content */}
                              {stageAutomations.length > 0 ? (() => {
                                const group = { stage: selectedStage, automations: stageAutomations };
                                // Separate automations by timing and triggers
                                const immediateAutomations = group.automations.filter((a: any) => {
                                  // Exclude trigger-based automations
                                  if (a.businessTriggers && a.businessTriggers.length > 0) return false;
                                  if (a.automationType === 'STAGE_CHANGE') return false; // Stage change automations are trigger-based
                                  // For communication automations, check first step delay
                                  const firstStep = a.steps?.[0];
                                  return firstStep && firstStep.delayMinutes === 0;
                                });
                                
                                const timeBasedAutomations = group.automations.filter((a: any) => {
                                  // Exclude trigger-based automations
                                  if (a.businessTriggers && a.businessTriggers.length > 0) return false;
                                  if (a.automationType === 'STAGE_CHANGE') return false; // Stage change automations are trigger-based
                                  // For communication automations, check first step delay
                                  const firstStep = a.steps?.[0];
                                  return firstStep && firstStep.delayMinutes > 0;
                                }).sort((a: any, b: any) => {
                                  // Sort by delay minutes (shortest to longest)
                                  const delayA = a.steps?.[0]?.delayMinutes || 0;
                                  const delayB = b.steps?.[0]?.delayMinutes || 0;
                                  return delayA - delayB;
                                });
                                
                                const triggerBasedAutomations = group.automations.filter((a: any) => {
                                  // Stage change automations OR automations with business triggers
                                  if (a.automationType === 'STAGE_CHANGE') return true;
                                  return a.businessTriggers && a.businessTriggers.length > 0;
                                });
                                
                                return (
                                  <div className="border-l-4 border-blue-500 rounded-lg p-4 bg-blue-50 dark:bg-blue-950 shadow-sm">
                                    <div className="space-y-3">
                                      {/* Immediate Automations */}
                                      {immediateAutomations.length > 0 && (
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-center gap-2">
                                            <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                            <h5 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">Immediate</h5>
                                            <Badge variant="outline" className="text-sm">
                                              {immediateAutomations.length}
                                            </Badge>
                                          </div>
                                          <div className="flex flex-wrap justify-center gap-4">
                                            {immediateAutomations.map((automation: any) => (
                                              <div key={automation.id} className="w-[400px]">
                                                {automation.automationType === 'COMMUNICATION' ? (
                                                  <AutomationStepManager automation={automation} onDelete={handleDeleteAutomation} />
                                                ) : (
                                                  <StageChangeAutomationCard automation={automation} onDelete={handleDeleteAutomation} />
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Time-Based Automations */}
                                      {timeBasedAutomations.length > 0 && (
                                        <div className="space-y-3 mt-[30px] mb-[30px]">
                                          <div className="flex items-center justify-center gap-2">
                                            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            <h5 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">Time-Based</h5>
                                            <Badge variant="outline" className="text-sm">
                                              {timeBasedAutomations.length}
                                            </Badge>
                                          </div>
                                          <div className="flex flex-col items-center">
                                            {timeBasedAutomations.map((automation: any, index: number) => (
                                              <div key={automation.id} className="w-[400px]">
                                                <AutomationStepManager automation={automation} onDelete={handleDeleteAutomation} />
                                                {/* Vertical connector between cards */}
                                                {index < timeBasedAutomations.length - 1 && (
                                                  <div className="flex justify-center py-3 pt-[1px] pb-[1px]">
                                                    <div className="w-0.5 h-8 bg-border" />
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Trigger-Based Automations */}
                                      {triggerBasedAutomations.length > 0 && (
                                        <div className="space-y-3 mt-[30px] mb-[30px]">
                                          <div className="flex items-center justify-center gap-2">
                                            <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                            <h5 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">Trigger-Based</h5>
                                            <Badge variant="outline" className="text-sm">
                                              {triggerBasedAutomations.length}
                                            </Badge>
                                          </div>
                                          <div className="flex flex-wrap justify-center gap-4">
                                            {triggerBasedAutomations.map((automation: any) => (
                                              <div key={automation.id} className="w-[400px]">
                                                {automation.automationType === 'COMMUNICATION' ? (
                                                  <AutomationStepManager automation={automation} onDelete={handleDeleteAutomation} />
                                                ) : (
                                                  <StageChangeAutomationCard automation={automation} onDelete={handleDeleteAutomation} />
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })() : (
                                <div className="text-center py-8 border rounded-lg bg-muted/30">
                                  <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                  <h3 className="text-lg font-semibold mb-2">No automations for {selectedStage?.name}</h3>
                                  <p className="text-muted-foreground">
                                    Create automations for this stage to automate your client communications and workflows
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                              <h3 className="text-lg font-semibold mb-2">No stage-based automations</h3>
                              <p className="text-muted-foreground">
                                Create automations that trigger when clients enter specific pipeline stages
                              </p>
                            </div>
                          );
                        })()}
                      </TabsContent>

                      {/* Global Automations Tab */}
                      <TabsContent value="global" className="space-y-4 mt-4">
                        {(() => {
                          // Global automations: no stageId and no stageCondition
                          // This includes pipeline automations without stage conditions
                          const globalAutomations = automations.filter((a: any) => !a.stageId && !a.stageCondition);
                          
                          return globalAutomations.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-4">
                              {globalAutomations.map((automation: any) => (
                                <div key={automation.id} className="w-[400px]">
                                  {automation.automationType === 'COMMUNICATION' ? (
                                    <AutomationStepManager automation={automation} onDelete={handleDeleteAutomation} />
                                  ) : (
                                    <StageChangeAutomationCard automation={automation} onDelete={handleDeleteAutomation} />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                              <h3 className="text-lg font-semibold mb-2">No global automations</h3>
                              <p className="text-muted-foreground">
                                Create automations that run globally without stage triggers
                              </p>
                            </div>
                          );
                        })()}
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* AI Automation Dialog */}
    <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Create new {activeProjectType.toLowerCase()} automation with AI
          </DialogTitle>
          <DialogDescription>
            Describe what you want the automation to do and AI will set it up for you.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ai-description">What do you want to automate?</Label>
            <Textarea
              id="ai-description"
              data-testid="textarea-ai-description"
              placeholder="Example: Send a thank you email 1 day after booking, then follow up with a questionnaire 3 days later"
              className="min-h-[120px]"
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
            />
          </div>
          <div className="bg-muted/30 p-4 rounded-lg space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Try these examples:
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>"Send welcome email when someone enters inquiry stage"</li>
              <li>"Text them 2 days before wedding with preparation tips"</li>
              <li>"Send proposal via email 3 hours after first contact"</li>
              <li>"Remind me to follow up 5 days after booking"</li>
            </ul>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setAiDialogOpen(false);
              setAiDescription("");
            }}
            data-testid="button-cancel-ai"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExtractAiAutomation}
            disabled={extractAiAutomationMutation.isPending || !aiDescription.trim()}
            data-testid="button-create-ai"
          >
            {extractAiAutomationMutation.isPending ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Continue
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Conversational AI Chat Dialog */}
    <Dialog open={chatDialogOpen} onOpenChange={setChatDialogOpen}>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Automation Assistant
          </DialogTitle>
          <DialogDescription>
            Chat with AI to create your automation step-by-step
          </DialogDescription>
        </DialogHeader>
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-6 space-y-4">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <p className="text-sm">Thinking...</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={currentChatMessage}
              onChange={(e) => setCurrentChatMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChatMessage();
                }
              }}
              data-testid="input-chat-message"
              disabled={chatMutation.isPending}
            />
            <Button
              onClick={handleSendChatMessage}
              disabled={chatMutation.isPending || !currentChatMessage.trim()}
              data-testid="button-send-chat"
            >
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* AI Automation Confirmation Dialog */}
    <Dialog open={aiConfirmDialogOpen} onOpenChange={setAiConfirmDialogOpen}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Confirm Automation Details
          </DialogTitle>
          <DialogDescription>
            Review and adjust the automation before creating it.
          </DialogDescription>
        </DialogHeader>
        {extractedData && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Automation Name</Label>
              <p className="text-sm font-medium">{extractedData.name}</p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <p className="text-sm text-muted-foreground">{extractedData.description}</p>
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <p className="text-sm">
                {extractedData.triggerType === 'SPECIFIC_STAGE' ? 'When contact enters a specific stage' : 'When stage changes'}
              </p>
            </div>
            {extractedData.triggerType === 'SPECIFIC_STAGE' && (
              <div className="space-y-2">
                <Label htmlFor="stage-select">Select Stage *</Label>
                {availableStages.length > 0 ? (
                  <Select value={aiSelectedStageId} onValueChange={setAiSelectedStageId}>
                    <SelectTrigger id="stage-select">
                      <SelectValue placeholder="Choose a stage..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStages.map((stage: any) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-950 p-3 rounded">
                    ⚠️ You don't have any stages set up yet. The automation will be created as a global automation.
                  </p>
                )}
              </div>
            )}
            {extractedData.steps.map((step: any, idx: number) => 
              step.type === 'SMART_FILE' ? (
                <div key={idx} className="space-y-2">
                  <Label htmlFor={`smart-file-select-${idx}`}>
                    Select Smart File Template {extractedData.steps.filter((s: any) => s.type === 'SMART_FILE').length > 1 ? `(Step ${idx + 1})` : ''} *
                  </Label>
                  {smartFiles.length > 0 ? (
                    <Select 
                      value={aiSelectedSmartFileTemplateIds[idx] || ''} 
                      onValueChange={(value) => setAiSelectedSmartFileTemplateIds(prev => ({ ...prev, [idx]: value }))}
                    >
                      <SelectTrigger id={`smart-file-select-${idx}`}>
                        <SelectValue placeholder="Choose a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {smartFiles.map((template: any) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-950 p-3 rounded">
                      ⚠️ You don't have any Smart File templates yet. Create one first in Sales & Proposals → Smart Files.
                    </p>
                  )}
                </div>
              ) : null
            )}
            <div className="space-y-2">
              <Label>Message Content</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Edit the AI-generated message below. Make any changes needed before creating the automation.
              </p>
              <Textarea
                value={editedMessageContent}
                onChange={(e) => setEditedMessageContent(e.target.value)}
                rows={6}
                className="font-mono text-sm"
                placeholder="Enter your message content..."
                data-testid="textarea-edit-ai-message"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Timing: {extractedData.steps[0].delayDays > 0 ? `${extractedData.steps[0].delayDays} day${extractedData.steps[0].delayDays > 1 ? 's' : ''}` : ''} 
                {extractedData.steps[0].delayHours > 0 ? ` ${extractedData.steps[0].delayHours} hour${extractedData.steps[0].delayHours > 1 ? 's' : ''}` : ''}
                {extractedData.steps[0].delayDays === 0 && extractedData.steps[0].delayHours === 0 ? 'Sent immediately' : ' after stage entry'}
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setAiConfirmDialogOpen(false);
              setAiDialogOpen(true);
            }}
            data-testid="button-back-ai"
          >
            Back
          </Button>
          <Button
            onClick={handleConfirmAiAutomation}
            disabled={createAiAutomationMutation.isPending}
            data-testid="button-confirm-ai"
          >
            {createAiAutomationMutation.isPending ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Create Automation
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </div>
  );
}
