import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Sparkles, 
  Mail, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  Calendar,
  Edit,
  Trash2,
  Play,
  Pause,
  Eye,
  MoreHorizontal
} from "lucide-react";
import { projectTypeEnum } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types
type DripCampaign = {
  id: string;
  name: string;
  projectType: string;
  targetStageId: string;
  status: "DRAFT" | "APPROVED" | "ACTIVE" | "PAUSED";
  emailCount: number;
  emailFrequencyWeeks: number;
  maxDurationMonths: number;
  approvedAt?: Date;
  approvedBy?: string;
  createdAt: Date;
  emails?: DripCampaignEmail[];
  subscriptionsCount?: number;
};

type DripCampaignEmail = {
  id: string;
  campaignId: string;
  sequenceIndex: number;
  subject: string;
  content: string;
  delayWeeks: number;
};

// Form schemas
const generateCampaignSchema = z.object({
  targetStageId: z.string().min(1, "Please select a target stage"),
  projectType: z.enum(["WEDDING", "PORTRAIT", "COMMERCIAL"]).default("WEDDING"),
  campaignName: z.string().min(1, "Campaign name is required"),
  emailCount: z.number().min(1).max(12).default(6),
  frequencyWeeks: z.number().min(1).max(8).default(2),
  customPrompt: z.string().optional(),
});

type GenerateCampaignFormData = z.infer<typeof generateCampaignSchema>;

export default function DripCampaigns() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCampaign, setSelectedCampaign] = useState<DripCampaign | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedEmailPreview, setSelectedEmailPreview] = useState<'text' | 'html'>('html');
  const [generatedCampaignData, setGeneratedCampaignData] = useState<any>(null);
  const [selectedProjectType, setSelectedProjectType] = useState<string>("WEDDING");

  // Queries
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<DripCampaign[]>({
    queryKey: ["/api/drip-campaigns", selectedProjectType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/drip-campaigns?projectType=${selectedProjectType}`);
      return await res.json();
    },
    enabled: !!user?.photographerId
  });

  const { data: stages = [] } = useQuery<any[]>({
    queryKey: ["/api/stages", selectedProjectType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stages?projectType=${selectedProjectType}`);
      return await res.json();
    },
    enabled: !!user?.photographerId
  });

  const { data: subscriptions = [] } = useQuery<any[]>({
    queryKey: ["/api/drip-subscriptions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/drip-subscriptions");
      return await res.json();
    },
    enabled: !!user?.photographerId
  });

  // Generate campaign form
  const generateForm = useForm<GenerateCampaignFormData>({
    resolver: zodResolver(generateCampaignSchema),
    defaultValues: {
      projectType: "WEDDING",
      emailCount: 6,
      frequencyWeeks: 2,
      campaignName: ""
    }
  });

  // Mutations
  const generateCampaignMutation = useMutation({
    mutationFn: async (data: GenerateCampaignFormData) => {
      const response = await apiRequest("POST", "/api/drip-campaigns/generate", data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Campaign generated successfully!" });
      // Store original OpenAI data for saving
      setGeneratedCampaignData(data);
      
      // Transform OpenAI response to DripCampaign format for preview
      const mappedEmails = data.emails?.map((email: any, index: number) => ({
        id: 'email-' + index,
        campaignId: 'preview-' + Date.now(),
        sequenceIndex: index,
        subject: email.subject,
        content: email.textBody || email.htmlBody || '',
        delayWeeks: email.weeksAfterStart || 0
      })) || [];
      
      const campaignForPreview = {
        id: 'preview-' + Date.now(),
        name: generateForm.getValues('campaignName') || 'Generated Campaign',
        projectType: generateForm.getValues('projectType') || 'WEDDING',
        targetStageId: generateForm.getValues('targetStageId') || '',
        status: 'DRAFT' as const,
        emailCount: data.emails?.length || 0,
        emailFrequencyWeeks: generateForm.getValues('frequencyWeeks') || 2,
        maxDurationMonths: 12,
        createdAt: new Date(),
        emails: mappedEmails
      };
      
      setSelectedCampaign(campaignForPreview);
      setGenerateDialogOpen(false);
      setPreviewDialogOpen(true);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to generate campaign", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    }
  });

  const saveCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/drip-campaigns", data);
    },
    onSuccess: () => {
      toast({ title: "Campaign saved as draft!" });
      queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns"] });
      setPreviewDialogOpen(false);
      setSelectedCampaign(null);
      setGeneratedCampaignData(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to save campaign", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const approveCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      return apiRequest("POST", `/api/drip-campaigns/${campaignId}/approve`);
    },
    onSuccess: () => {
      toast({ title: "Campaign approved and ready to activate!" });
      queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to approve campaign", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const activateCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      return apiRequest("POST", `/api/drip-campaigns/${campaignId}/activate`);
    },
    onSuccess: () => {
      toast({ title: "Campaign activated and will start nurturing clients!" });
      queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to activate campaign", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      return apiRequest("DELETE", `/api/drip-campaigns/${campaignId}`);
    },
    onSuccess: () => {
      toast({ title: "Campaign deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete campaign", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleGenerateCampaign = (data: GenerateCampaignFormData) => {
    generateCampaignMutation.mutate(data);
  };

  const handleSaveCampaign = () => {
    if (selectedCampaign && generatedCampaignData) {
      // Construct proper payload for backend with all required fields
      const formData = generateForm.getValues();
      
      const campaignPayload = {
        name: formData.campaignName || selectedCampaign.name,
        projectType: formData.projectType || selectedCampaign.projectType,
        targetStageId: formData.targetStageId || selectedCampaign.targetStageId,
        status: 'DRAFT',
        maxDurationMonths: 12,
        emailFrequencyWeeks: formData.frequencyWeeks || selectedCampaign.emailFrequencyWeeks,
        generatedByAi: true,
        aiPrompt: formData.customPrompt || '',
        businessContext: generatedCampaignData.businessContext || '',
        enabled: true,
        emails: generatedCampaignData.emails || []
      };
      
      saveCampaignMutation.mutate(campaignPayload);
    }
  };

  const handleApproveCampaign = (campaignId: string) => {
    if (confirm("Are you sure you want to approve this campaign? Once approved, it cannot be edited.")) {
      approveCampaignMutation.mutate(campaignId);
    }
  };

  const handleActivateCampaign = (campaignId: string) => {
    if (confirm("Are you sure you want to activate this campaign? It will start sending emails to eligible clients.")) {
      activateCampaignMutation.mutate(campaignId);
    }
  };

  const handleDeleteCampaign = (campaignId: string) => {
    if (confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) {
      deleteCampaignMutation.mutate(campaignId);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      DRAFT: "secondary",
      APPROVED: "outline", 
      ACTIVE: "default",
      PAUSED: "destructive"
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || "secondary"}>{status}</Badge>;
  };

  const getActionButton = (campaign: DripCampaign) => {
    switch (campaign.status) {
      case "DRAFT":
        return (
          <Button 
            size="sm" 
            onClick={() => handleApproveCampaign(campaign.id)}
            data-testid={`button-approve-${campaign.id}`}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>
        );
      case "APPROVED":
        return (
          <Button 
            size="sm" 
            onClick={() => handleActivateCampaign(campaign.id)}
            data-testid={`button-activate-${campaign.id}`}
          >
            <Play className="h-4 w-4 mr-1" />
            Activate
          </Button>
        );
      case "ACTIVE":
        return (
          <Button 
            size="sm" 
            variant="secondary"
            data-testid={`button-pause-${campaign.id}`}
          >
            <Pause className="h-4 w-4 mr-1" />
            Pause
          </Button>
        );
      default:
        return null;
    }
  };

  if (!user?.photographerId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-drip-campaigns">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-drip-campaigns">Drip Campaigns</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered email sequences to nurture your inquiries into bookings
          </p>
        </div>
        <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-generate-campaign">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate AI Drip Campaign</DialogTitle>
              <DialogDescription>
                Let AI create a personalized email sequence to nurture clients in a specific stage
              </DialogDescription>
            </DialogHeader>
            <Form {...generateForm}>
              <form onSubmit={generateForm.handleSubmit(handleGenerateCampaign)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={generateForm.control}
                    name="projectType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-project-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="WEDDING">Wedding</SelectItem>
                            <SelectItem value="PORTRAIT">Portrait</SelectItem>
                            <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={generateForm.control}
                    name="targetStageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Stage</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-target-stage">
                              <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {stages.map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                {stage.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Clients in this stage will receive the drip campaign
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={generateForm.control}
                  name="campaignName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Inquiry Nurturing Campaign" 
                          {...field} 
                          data-testid="input-campaign-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={generateForm.control}
                    name="emailCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Emails</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1} 
                            max={12} 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-email-count"
                          />
                        </FormControl>
                        <FormDescription>1-12 emails</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={generateForm.control}
                    name="frequencyWeeks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Frequency</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1} 
                            max={8} 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-frequency-weeks"
                          />
                        </FormControl>
                        <FormDescription>Weeks between emails</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={generateForm.control}
                  name="customPrompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Instructions (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="e.g., Focus on showcasing portfolio, mention specific services, use a friendly tone..."
                          className="min-h-[80px]"
                          {...field} 
                          data-testid="textarea-custom-prompt"
                        />
                      </FormControl>
                      <FormDescription>
                        Additional instructions for AI to customize the email content
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setGenerateDialogOpen(false)}
                    data-testid="button-cancel-generate"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={generateCampaignMutation.isPending}
                    data-testid="button-submit-generate"
                  >
                    {generateCampaignMutation.isPending ? (
                      <>Generating...</>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Campaign
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Project Type Tabs */}
      <Tabs value={selectedProjectType} onValueChange={setSelectedProjectType}>
        <TabsList data-testid="tabs-project-type">
          <TabsTrigger value="WEDDING">Wedding</TabsTrigger>
          <TabsTrigger value="PORTRAIT">Portrait</TabsTrigger>
          <TabsTrigger value="COMMERCIAL">Commercial</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedProjectType} className="mt-6">
          {/* Campaign Cards */}
          {campaignsLoading ? (
            <div className="text-center py-8">Loading campaigns...</div>
          ) : !Array.isArray(campaigns) || campaigns.length === 0 ? (
            <Card data-testid="empty-campaigns">
              <CardContent className="text-center py-12">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first AI-powered drip campaign to start nurturing inquiries
                </p>
                <Button onClick={() => setGenerateDialogOpen(true)} data-testid="button-create-first-campaign">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Your First Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} data-testid={`card-campaign-${campaign.id}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {campaign.name}
                          {getStatusBadge(campaign.status)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {campaign.emailCount} emails • Every {campaign.frequencyWeeks} week{campaign.frequencyWeeks > 1 ? 's' : ''}
                          {campaign.subscriptionsCount ? ` • ${campaign.subscriptionsCount} active subscriptions` : ''}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getActionButton(campaign)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCampaign(campaign);
                            setPreviewDialogOpen(true);
                          }}
                          data-testid={`button-preview-${campaign.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          data-testid={`button-delete-${campaign.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {campaign.emails && campaign.emails.length > 0 && (
                    <CardContent>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Email Sequence:</Label>
                        <div className="grid gap-2">
                          {campaign.emails.slice(0, 3).map((email, index) => (
                            <div key={email.id} className="flex items-center text-sm text-muted-foreground">
                              <Mail className="h-3 w-3 mr-2" />
                              <span className="font-medium">Email {index + 1}:</span>
                              <span className="ml-1 truncate">{email.subject}</span>
                              <span className="ml-auto text-xs">
                                +{email.delayWeeks} week{email.delayWeeks > 1 ? 's' : ''}
                              </span>
                            </div>
                          ))}
                          {campaign.emails.length > 3 && (
                            <div className="text-sm text-muted-foreground">
                              ... and {campaign.emails.length - 3} more emails
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      {selectedCampaign && (
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedCampaign.name}
                {getStatusBadge(selectedCampaign.status)}
              </DialogTitle>
              <DialogDescription>
                Preview and manage your drip campaign emails
              </DialogDescription>
            </DialogHeader>
            <div className="flex h-[60vh]">
              {/* Email List */}
              <div className="w-1/2 pr-4">
                <ScrollArea className="h-full">
                  <div className="space-y-2">
                    {selectedCampaign.emails && selectedCampaign.emails.length > 0 ? (
                      selectedCampaign.emails.map((email, index) => (
                        <Card 
                          key={email.id}
                          className={`cursor-pointer hover:bg-accent transition-colors ${
                            selectedEmailId === email.id ? 'ring-2 ring-blue-500 bg-accent' : ''
                          }`}
                          onClick={() => setSelectedEmailId(email.id)}
                          data-testid={`email-preview-${email.id}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                Email {index + 1}
                                {email.delayWeeks > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    +{email.delayWeeks} week{email.delayWeeks > 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </CardTitle>
                              {selectedEmailId === email.id && (
                                <Eye className="h-4 w-4 text-blue-500" />
                              )}
                            </div>
                            <CardDescription className="font-medium text-xs">
                              {email.subject}
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No emails in this campaign yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Email Preview */}
              <div className="w-1/2 pl-4 border-l">
                {selectedEmailId ? (
                  <div className="h-full flex flex-col">
                    {(() => {
                      const selectedEmail = selectedCampaign.emails?.find(e => e.id === selectedEmailId);
                      return selectedEmail ? (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-sm">{selectedEmail.subject}</h3>
                              <p className="text-xs text-muted-foreground">
                                Sent {selectedEmail.delayWeeks} weeks after campaign start
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex border rounded">
                                <Button
                                  variant={selectedEmailPreview === 'html' ? 'default' : 'ghost'}
                                  size="sm"
                                  onClick={() => setSelectedEmailPreview('html')}
                                  className="text-xs px-2 py-1"
                                >
                                  HTML
                                </Button>
                                <Button
                                  variant={selectedEmailPreview === 'text' ? 'default' : 'ghost'}
                                  size="sm"
                                  onClick={() => setSelectedEmailPreview('text')}
                                  className="text-xs px-2 py-1"
                                >
                                  Text
                                </Button>
                              </div>
                            </div>
                          </div>
                          <ScrollArea className="flex-1">
                            <div className="border rounded p-4 bg-white">
                              {selectedEmailPreview === 'html' ? (
                                <div 
                                  className="w-full h-auto"
                                  dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody || selectedEmail.content }}
                                  style={{ maxWidth: '100%' }}
                                  data-testid="email-html-preview"
                                />
                              ) : (
                                <div className="whitespace-pre-wrap text-sm font-mono">
                                  {selectedEmail.textBody || selectedEmail.content}
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                    <div>
                      <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Select an email to preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setPreviewDialogOpen(false)}
                data-testid="button-close-preview"
              >
                Close
              </Button>
              {selectedCampaign.status === "DRAFT" && (
                <Button 
                  onClick={handleSaveCampaign}
                  disabled={saveCampaignMutation.isPending}
                  data-testid="button-save-draft"
                >
                  {saveCampaignMutation.isPending ? "Saving..." : "Save Draft"}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}