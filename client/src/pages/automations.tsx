import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Zap, Clock, Mail, Smartphone, Settings } from "lucide-react";
import { insertAutomationSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Create form schema based on insertAutomationSchema but without photographerId (auto-added by backend)
const createAutomationFormSchema = insertAutomationSchema.omit({ photographerId: true });
type CreateAutomationFormData = z.infer<typeof createAutomationFormSchema>;

// AutomationStepManager Component
function AutomationStepManager({ automation }: { automation: any }) {
  const { toast } = useToast();
  const [showAddStepForm, setShowAddStepForm] = useState(false);

  const { data: steps = [], isLoading } = useQuery({
    queryKey: ["/api/automations", automation.id, "steps"],
    enabled: !!automation.id
  });

  // Create step mutation
  const createStepMutation = useMutation({
    mutationFn: async (stepData: any) => {
      return apiRequest(`/api/automations/${automation.id}/steps`, {
        method: "POST", 
        body: JSON.stringify(stepData)
      });
    },
    onSuccess: () => {
      toast({ title: "Step added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations", automation.id, "steps"] });
      setShowAddStepForm(false);
    },
    onError: () => {
      toast({ title: "Failed to add step", variant: "destructive" });
    }
  });

  // Delete step mutation  
  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      return apiRequest(`/api/automation-steps/${stepId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({ title: "Step deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations", automation.id, "steps"] });
    },
    onError: () => {
      toast({ title: "Failed to delete step", variant: "destructive" });
    }
  });

  const handleAddStep = () => {
    const stepData = {
      stepIndex: steps.length,
      delayMinutes: 60, // Default 1 hour
      enabled: true
    };
    createStepMutation.mutate(stepData);
  };

  const handleDeleteStep = (stepId: string) => {
    if (confirm('Are you sure you want to delete this step?')) {
      deleteStepMutation.mutate(stepId);
    }
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
          <Badge variant={automation.enabled ? "default" : "secondary"}>
            {automation.enabled ? "Active" : "Inactive"}
          </Badge>
          <Switch 
            checked={automation.enabled}
            data-testid={`switch-automation-${automation.id}`}
            onCheckedChange={() => {
              // TODO: Implement toggle automation (Task #6)
              console.log('Toggle automation', automation.id);
            }}
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
                  <Badge variant={step.enabled ? "outline" : "secondary"} className="text-xs">
                    {step.enabled ? "On" : "Off"}
                  </Badge>
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
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-xs"
          disabled={createStepMutation.isPending}
          data-testid={`button-add-step-${automation.id}`}
          onClick={handleAddStep}
        >
          <Plus className="w-3 h-3 mr-1" />
          {createStepMutation.isPending ? "Adding..." : "Add Step"}
        </Button>
      </div>
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

  // Form setup
  const form = useForm<CreateAutomationFormData>({
    resolver: zodResolver(createAutomationFormSchema),
    defaultValues: {
      name: "",
      stageId: "",
      channel: "EMAIL",
      enabled: true
    }
  });

  // Create automation mutation
  const createAutomationMutation = useMutation({
    mutationFn: async (data: CreateAutomationFormData) => {
      return apiRequest("/api/automations", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({ title: "Automation created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error('Create automation error:', error);
      toast({ title: "Failed to create automation", variant: "destructive" });
    }
  });

  const handleCreateAutomation = (data: CreateAutomationFormData) => {
    createAutomationMutation.mutate(data);
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

  const { data: stages } = useQuery({
    queryKey: ["/api/stages"],
    enabled: !!user
  });

  const { data: automations } = useQuery({
    queryKey: ["/api/automations"],
    enabled: !!user
  });

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Automations</h1>
              <p className="text-muted-foreground">Set up automated email and SMS workflows for each stage</p>
            </div>
            
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-automation">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Automation
                </Button>
              </DialogTrigger>
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

                    <FormField
                      control={form.control}
                      name="stageId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trigger Stage (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-stage">
                                <SelectValue placeholder="Select a stage or leave empty for global" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">No specific stage (Global)</SelectItem>
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
                        disabled={createAutomationMutation.isPending}
                        data-testid="button-submit-automation"
                      >
                        {createAutomationMutation.isPending ? "Creating..." : "Create Automation"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

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
                        <AutomationStepManager key={automation.id} automation={automation} />
                      ))
                    );
                  })()}
                </div>
              </div>

              {/* Add new rule button */}
              <Button 
                variant="outline" 
                className="w-full" 
                data-testid="button-add-rule-modal"
                onClick={() => {
                  // Pre-fill the create automation form with this stage
                  form.setValue('stageId', selectedStage?.id || '');
                  setManageRulesDialogOpen(false);
                  setCreateDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Rule for {selectedStage?.name} Stage
              </Button>

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
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Automations</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">Running workflows</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,247</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">68%</div>
                <p className="text-xs text-muted-foreground">Average engagement</p>
              </CardContent>
            </Card>
          </div>

          {/* Automation Rules by Stage */}
          <div className="space-y-6">
            {stages?.map((stage: any) => (
              <Card key={stage.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <div className="w-3 h-3 bg-primary rounded-full mr-3"></div>
                      {stage.name} Stage
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      data-testid={`button-manage-${stage.name.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => {
                        setSelectedStage(stage);
                        setManageRulesDialogOpen(true);
                      }}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Manage Rules
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Sample automation rules */}
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Mail className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium">Welcome Email</p>
                          <p className="text-sm text-muted-foreground">Send immediately when entering stage</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant="secondary">Active</Badge>
                        <Switch defaultChecked data-testid={`switch-welcome-email-${stage.id}`} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Smartphone className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="font-medium">Follow-up SMS</p>
                          <p className="text-sm text-muted-foreground">Send after 24 hours if still in stage</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant="secondary">Active</Badge>
                        <Switch defaultChecked data-testid={`switch-followup-sms-${stage.id}`} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Mail className="w-5 h-5 text-orange-500" />
                        <div>
                          <p className="font-medium">Check-in Email</p>
                          <p className="text-sm text-muted-foreground">Send after 7 days if still in stage</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline">Inactive</Badge>
                        <Switch data-testid={`switch-checkin-email-${stage.id}`} />
                      </div>
                    </div>

                    <Button variant="outline" className="w-full" data-testid={`button-add-rule-${stage.id}`}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Automation Rule
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Long-drip Campaign */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Inquiry Long-drip Campaign
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">24-Email Nurture Sequence</p>
                    <p className="text-sm text-muted-foreground">
                      Automated email series over 12 months for clients in Inquiry stage
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant="secondary">Active</Badge>
                    <Switch defaultChecked data-testid="switch-long-drip-campaign" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Total Emails</p>
                    <p className="text-2xl font-bold">24</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-2xl font-bold">12 mo</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Frequency</p>
                    <p className="text-2xl font-bold">~15 days</p>
                  </div>
                </div>

                <Button variant="outline" data-testid="button-configure-drip">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
