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
import { projectTypeEnum, type DripCampaignEmail as SchemaDripCampaignEmail } from "@shared/schema";
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

// Use schema type with all proper fields including approvalStatus
type DripCampaignEmail = SchemaDripCampaignEmail & {
  delayWeeks: number; // Frontend computed field
  content: string; // Fallback for content display
};

// Form schemas for static campaign activation
const activateCampaignSchema = z.object({
  targetStageId: z.string().min(1, "Please select a target stage"),
  projectType: z.enum(["WEDDING", "PORTRAIT", "COMMERCIAL"]).default("WEDDING"),
});

type ActivateCampaignFormData = z.infer<typeof activateCampaignSchema>;

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

  // Activate campaign form
  const activateForm = useForm<ActivateCampaignFormData>({
    resolver: zodResolver(activateCampaignSchema),
    defaultValues: {
      projectType: "WEDDING"
    }
  });

  // Mutations
  const createStaticCampaignMutation = useMutation({
    mutationFn: async (data: ActivateCampaignFormData) => {
      const response = await apiRequest("POST", "/api/drip-campaigns/activate", data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Static campaign activated successfully!" });
      // Store static campaign data for saving
      setGeneratedCampaignData(data);
      
      // Transform static campaign response to DripCampaign format for preview
      const mappedEmails = data.emails?.map((email: any, index: number) => ({
        id: 'email-' + index,
        campaignId: 'preview-' + Date.now(),
        sequenceIndex: index,
        subject: email.subject,
        content: email.textBody || email.htmlBody || '',
        delayWeeks: Math.ceil(email.daysAfterStart / 7) || 0 // Convert days to weeks for display
      })) || [];
      
      const campaignForPreview = {
        id: 'preview-' + Date.now(),
        name: data.campaign.name || `${activateForm.getValues('projectType')} Email Campaign`,
        projectType: activateForm.getValues('projectType') || 'WEDDING',
        targetStageId: activateForm.getValues('targetStageId') || '',
        status: 'DRAFT' as const,
        emailCount: data.emails?.length || 0,
        emailFrequencyWeeks: Math.ceil(data.campaign.emailFrequencyDays / 7) || 3, // ~24 days = 3.4 weeks
        maxDurationMonths: data.campaign.maxDurationMonths || 24,
        createdAt: new Date(),
        emails: mappedEmails
      };
      
      setSelectedCampaign(campaignForPreview);
      setGenerateDialogOpen(false);
      setPreviewDialogOpen(true);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to activate campaign", 
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

  const handleActivateCampaign = (data: ActivateCampaignFormData) => {
    createStaticCampaignMutation.mutate(data);
  };

  const handleSaveCampaign = () => {
    if (selectedCampaign && generatedCampaignData) {
      // Construct proper payload for backend with all required fields for static campaign
      const campaignPayload = {
        name: selectedCampaign.name,
        projectType: selectedCampaign.projectType,
        targetStageId: selectedCampaign.targetStageId,
        status: 'DRAFT',
        maxDurationMonths: 24, // 24-month static campaign
        emailFrequencyDays: 24, // 24-day intervals
        emailFrequencyWeeks: Math.ceil(24 / 7), // Legacy compatibility
        isStaticTemplate: true,
        staticTemplateType: selectedCampaign.projectType,
        generatedByAi: false,
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

  const handleActivateExistingCampaign = (campaignId: string) => {
    if (confirm("Are you sure you want to activate this campaign? It will start sending emails to eligible clients.")) {
      activateCampaignMutation.mutate(campaignId);
    }
  };

  const handleDeleteCampaign = (campaignId: string) => {
    if (confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) {
      deleteCampaignMutation.mutate(campaignId);
    }
  };

  const handleApproveEmail = async (emailId: string) => {
    if (!selectedCampaign) return;
    
    try {
      await apiRequest('POST', `/api/drip-campaigns/${selectedCampaign.id}/emails/${emailId}/approve`);
      
      // Update the local state
      setSelectedCampaign(prev => prev ? {
        ...prev,
        emails: prev.emails?.map(email => 
          email.id === emailId 
            ? { ...email, approvalStatus: 'APPROVED' as const }
            : email
        )
      } : null);
      
      toast({
        title: "Email approved",
        description: "The email has been approved and will be included in the campaign.",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ["/api/drip-campaigns", selectedProjectType]
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve email. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRejectEmail = async (emailId: string) => {
    if (!selectedCampaign) return;
    
    try {
      await apiRequest('POST', `/api/drip-campaigns/${selectedCampaign.id}/emails/${emailId}/reject`);
      
      // Update the local state
      setSelectedCampaign(prev => prev ? {
        ...prev,
        emails: prev.emails?.map(email => 
          email.id === emailId 
            ? { ...email, approvalStatus: 'REJECTED' as const }
            : email
        )
      } : null);
      
      toast({
        title: "Email rejected",
        description: "The email has been rejected and will not be included in the campaign.",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ["/api/drip-campaigns", selectedProjectType]
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject email. Please try again.",
        variant: "destructive",
      });
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
            onClick={() => handleActivateExistingCampaign(campaign.id)}
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
            Professional email campaigns with 24 pre-written templates to nurture your inquiries into bookings
          </p>
        </div>
        <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-activate-campaign">
              <Plus className="h-4 w-4 mr-2" />
              Activate Email Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Activate Static Email Campaign</DialogTitle>
              <DialogDescription>
                Activate a professional 24-email campaign with pre-written content tailored to your project type. Emails will be sent every 24 days.
              </DialogDescription>
            </DialogHeader>
            <Form {...activateForm}>
              <form onSubmit={activateForm.handleSubmit(handleActivateCampaign)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={activateForm.control}
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
                    control={activateForm.control}
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
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Campaign Details</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 24 professionally written emails</li>
                    <li>• Sent every 24 days (monthly touchpoints)</li>
                    <li>• Beautiful HTML styling with your branding</li>
                    <li>• Targets clients in inquiry stage only</li>
                  </ul>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setGenerateDialogOpen(false)}
                    data-testid="button-cancel-activate"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createStaticCampaignMutation.isPending}
                    data-testid="button-submit-activate"
                  >
                    {createStaticCampaignMutation.isPending ? (
                      <>Activating...</>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Activate Campaign
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
                          {campaign.emailCount} emails • Every {campaign.emailFrequencyWeeks} week{campaign.emailFrequencyWeeks > 1 ? 's' : ''}
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
            <div className="space-y-4 h-[70vh]">
              {/* Email List - Horizontal Layout */}
              <div className="h-32">
                <h3 className="text-sm font-medium mb-3">Campaign Emails</h3>
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-2">
                    {selectedCampaign.emails && selectedCampaign.emails.length > 0 ? (
                      selectedCampaign.emails.map((email, index) => {
                        // Debug logging
                        if (index === 0) {
                          console.log('🔍 DEBUG: Total emails in campaign:', selectedCampaign.emails.length);
                        }
                        return (
                        <Card 
                          key={email.id}
                          className={`min-w-[280px] cursor-pointer hover:bg-accent transition-colors ${
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
                                {/* Approval Status Badge - only for saved campaigns */}
                                {!selectedCampaign.id.startsWith('preview-') && email.approvalStatus === 'APPROVED' && (
                                  <Badge className="text-xs bg-green-100 text-green-800 border-green-300">
                                    <CheckCircle className="h-2 w-2 mr-1" />
                                    Approved
                                  </Badge>
                                )}
                                {!selectedCampaign.id.startsWith('preview-') && email.approvalStatus === 'REJECTED' && (
                                  <Badge className="text-xs bg-red-100 text-red-800 border-red-300">
                                    <AlertCircle className="h-2 w-2 mr-1" />
                                    Rejected
                                  </Badge>
                                )}
                                {!selectedCampaign.id.startsWith('preview-') && !email.approvalStatus && selectedCampaign.status === "DRAFT" && (
                                  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
                                    <Clock className="h-2 w-2 mr-1" />
                                    Pending Review
                                  </Badge>
                                )}
                                {selectedCampaign.id.startsWith('preview-') && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                                    <Eye className="h-2 w-2 mr-1" />
                                    Preview
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
                        )
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground w-full">
                        No emails in this campaign yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Email Preview - Full Width Below */}
              <div className="flex-1 border-t pt-4">
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
                              {selectedCampaign.status === "DRAFT" && !selectedCampaign.id.startsWith('preview-') && (
                                <div className="flex items-center gap-1 ml-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs px-2 py-1 text-green-600 border-green-300 hover:bg-green-50"
                                    onClick={() => handleApproveEmail(selectedEmail.id)}
                                    data-testid="button-approve-email"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm" 
                                    variant="outline"
                                    className="text-xs px-2 py-1 text-red-600 border-red-300 hover:bg-red-50"
                                    onClick={() => handleRejectEmail(selectedEmail.id)}
                                    data-testid="button-reject-email"
                                  >
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                              {selectedCampaign.id.startsWith('preview-') && (
                                <div className="text-xs text-muted-foreground ml-2">
                                  Save as draft to approve individual emails
                                </div>
                              )}
                            </div>
                          </div>
                          <ScrollArea className="flex-1">
                            <div className="border rounded bg-white">
                              {selectedEmailPreview === 'html' ? (
                                <iframe
                                  srcDoc={selectedEmail.htmlBody || selectedEmail.content}
                                  className="w-full h-[500px] border-0 rounded"
                                  title="Email Preview"
                                  sandbox="allow-same-origin"
                                  data-testid="email-html-preview"
                                />
                              ) : (
                                <div className="p-4 whitespace-pre-wrap text-sm font-mono">
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