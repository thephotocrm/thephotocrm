import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  MoreHorizontal,
  Save
} from "lucide-react";
import { projectTypeEnum, type DripCampaignEmail as SchemaDripCampaignEmail } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EmailTemplateBuilder, type ContentBlock } from "@/components/email-template-builder";
import { EmailPreview } from "@/components/email-preview";

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


export default function DripCampaigns() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedEmailPreview, setSelectedEmailPreview] = useState<'text' | 'html'>('html');
  const [selectedProjectType, setSelectedProjectType] = useState<string>("WEDDING");
  const [selectedEmailForPreview, setSelectedEmailForPreview] = useState<any>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
  // Email edit modal state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [emailBeingEdited, setEmailBeingEdited] = useState<any>(null);
  const [editEmailSubject, setEditEmailSubject] = useState("");
  const [editEmailBlocks, setEditEmailBlocks] = useState<ContentBlock[]>([]);
  const [editDaysAfterStart, setEditDaysAfterStart] = useState(0);
  const [editSendAtHour, setEditSendAtHour] = useState<number | null>(null);
  const [previewTab, setPreviewTab] = useState<'builder' | 'preview'>('builder');
  // Email branding state
  const [editIncludeHeader, setEditIncludeHeader] = useState(false);
  const [editHeaderStyle, setEditHeaderStyle] = useState('professional');
  const [editIncludeSignature, setEditIncludeSignature] = useState(false);
  const [editSignatureStyle, setEditSignatureStyle] = useState('professional');
  
  // Email toggle states for direct static template display
  const [emailToggles, setEmailToggles] = useState<Record<string, boolean>>({});
  const [campaignEnabled, setCampaignEnabled] = useState<Record<string, boolean>>({});

  // Load campaign settings for the selected project type
  const { data: campaignSettings } = useQuery({
    queryKey: ["/api/static-campaign-settings", selectedProjectType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/static-campaign-settings/${selectedProjectType}`);
      return await res.json();
    },
  });

  // Mutation for saving campaign settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: { projectType: string; campaignEnabled: boolean; emailToggles: Record<string, boolean> }) => {
      const res = await apiRequest("POST", "/api/static-campaign-settings", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Settings saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/static-campaign-settings"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
    }
  });

  // Mutation for updating email content
  const updateEmailMutation = useMutation({
    mutationFn: async (data: {
      campaignId: string;
      emailId: string;
      subject: string;
      htmlBody: string;
      textBody: string;
      emailBlocks: string;
      sendAtHour: number | null;
      daysAfterStart: number;
      useEmailBuilder: boolean;
      includeHeader: boolean;
      headerStyle: string;
      includeSignature: boolean;
      signatureStyle: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/drip-campaigns/${data.campaignId}/emails/${data.emailId}`, {
        subject: data.subject,
        htmlBody: data.htmlBody,
        textBody: data.textBody,
        emailBlocks: data.emailBlocks,
        sendAtHour: data.sendAtHour,
        daysAfterStart: data.daysAfterStart,
        useEmailBuilder: data.useEmailBuilder,
        includeHeader: data.includeHeader,
        headerStyle: data.headerStyle,
        includeSignature: data.includeSignature,
        signatureStyle: data.signatureStyle
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Email updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns/static-templates"] });
      setEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update email", description: error.message, variant: "destructive" });
    }
  });

  // Initialize settings from backend when data loads
  useEffect(() => {
    if (campaignSettings) {
      setCampaignEnabled(prev => ({
        ...prev,
        [selectedProjectType]: campaignSettings.campaignEnabled || false
      }));
      
      if (campaignSettings.emailToggles) {
        try {
          const parsedToggles = JSON.parse(campaignSettings.emailToggles);
          setEmailToggles(prev => ({
            ...prev,
            ...parsedToggles
          }));
        } catch (error) {
          console.error('Failed to parse email toggles:', error);
        }
      }
    }
  }, [campaignSettings, selectedProjectType]);

  // First get stages (needed for static campaign query)
  const { data: stages = [] } = useQuery<any[]>({
    queryKey: ["/api/stages", selectedProjectType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stages?projectType=${selectedProjectType}`);
      return await res.json();
    },
    enabled: !!user?.photographerId
  });

  // Query for static campaign templates (read-only)
  const { data: staticCampaign, isLoading: campaignsLoading } = useQuery<any>({
    queryKey: ["/api/drip-campaigns/static-templates", selectedProjectType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/drip-campaigns/static-templates?projectType=${selectedProjectType}`);
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






  // Handler for opening edit dialog
  const handleEditEmail = (email: any) => {
    setEmailBeingEdited(email);
    setEditEmailSubject(email.subject);
    setEditDaysAfterStart(email.daysAfterStart || 0);
    setEditSendAtHour(email.sendAtHour ?? null);
    
    // Parse existing blocks if they exist
    if (email.emailBlocks) {
      try {
        setEditEmailBlocks(JSON.parse(email.emailBlocks));
      } catch (error) {
        console.error('Failed to parse email blocks:', error);
        setEditEmailBlocks([]);
      }
    } else {
      setEditEmailBlocks([]);
    }
    
    // Load branding preferences
    setEditIncludeHeader(email.includeHeader || false);
    setEditHeaderStyle(email.headerStyle || 'professional');
    setEditIncludeSignature(email.includeSignature || false);
    setEditSignatureStyle(email.signatureStyle || 'professional');
    
    setPreviewTab('builder');
    setEditDialogOpen(true);
  };

  // Handler for saving edited email
  const handleSaveEmail = async () => {
    if (!emailBeingEdited || !staticCampaign || !user?.photographerId) return;

    try {
      // First, check if this campaign has a draft in the database
      const campaignsRes = await apiRequest("GET", `/api/drip-campaigns?projectType=${staticCampaign.projectType}`);
      const existingCampaigns = await campaignsRes.json();
      
      let draftCampaign = existingCampaigns.find(
        (c: any) => c.projectType === staticCampaign.projectType && c.isStaticTemplate
      );

      // If no draft exists, create one from the template
      if (!draftCampaign) {
        // Get the first stage as target
        const stagesRes = await apiRequest("GET", `/api/stages?projectType=${staticCampaign.projectType}`);
        const stages = await stagesRes.json();
        const firstStage = stages[0];

        if (!firstStage) {
          toast({ title: "Error", description: "No stages found. Please create a stage first.", variant: "destructive" });
          return;
        }

        // Create draft from template - this creates database records but doesn't activate
        const draftRes = await apiRequest("POST", "/api/drip-campaigns/create-draft-from-template", {
          projectType: staticCampaign.projectType,
          targetStageId: firstStage.id
        });
        draftCampaign = await draftRes.json();
      }

      // Now find the corresponding email in the draft campaign
      const emailIndex = staticCampaign.emails?.findIndex((e: any) => e.sequenceIndex === emailBeingEdited.sequenceIndex);
      const draftEmail = draftCampaign.emails?.[emailIndex];

      if (!draftEmail) {
        toast({ title: "Error", description: "Email not found in draft campaign", variant: "destructive" });
        return;
      }

      // Now we can update the email with proper IDs
      const emailBlocks = editEmailBlocks;
      updateEmailMutation.mutate({
        campaignId: draftCampaign.id,
        emailId: draftEmail.id,
        subject: editEmailSubject,
        htmlBody: emailBeingEdited.htmlBody,
        textBody: emailBeingEdited.textBody,
        emailBlocks: JSON.stringify(emailBlocks),
        sendAtHour: editSendAtHour,
        daysAfterStart: editDaysAfterStart,
        useEmailBuilder: emailBlocks.length > 0,
        includeHeader: editIncludeHeader,
        headerStyle: editHeaderStyle,
        includeSignature: editIncludeSignature,
        signatureStyle: editSignatureStyle
      });
    } catch (error) {
      console.error('Error saving email:', error);
      toast({ title: "Error", description: "Failed to save email. Please try again.", variant: "destructive" });
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

  if (authLoading || !user?.photographerId) {
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
        <Badge variant="outline" className="text-sm">
          {staticCampaign?.emails?.length || 24} Email Templates Ready
        </Badge>
      </div>

      {/* Project Type Selection */}
      <div>
        {/* Desktop Tabs */}
        <Tabs value={selectedProjectType} onValueChange={setSelectedProjectType} className="hidden md:block">
          <TabsList data-testid="tabs-project-type" className="grid w-full grid-cols-6">
            <TabsTrigger value="WEDDING">Wedding</TabsTrigger>
            <TabsTrigger value="PORTRAIT">Portrait</TabsTrigger>
            <TabsTrigger value="COMMERCIAL">Commercial</TabsTrigger>
            <TabsTrigger value="ENGAGEMENT">Engagement</TabsTrigger>
            <TabsTrigger value="MATERNITY">Maternity</TabsTrigger>
            <TabsTrigger value="FAMILY">Family</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Mobile Dropdown */}
        <div className="md:hidden">
          <Label htmlFor="mobile-project-type" className="text-sm font-medium">Project Type</Label>
          <Select value={selectedProjectType} onValueChange={setSelectedProjectType}>
            <SelectTrigger className="w-full mt-2" data-testid="select-mobile-project-type">
              <SelectValue placeholder="Select project type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WEDDING">💒 Wedding</SelectItem>
              <SelectItem value="PORTRAIT">🎭 Portrait</SelectItem>
              <SelectItem value="COMMERCIAL">📸 Commercial</SelectItem>
              <SelectItem value="ENGAGEMENT">💍 Engagement</SelectItem>
              <SelectItem value="MATERNITY">🤱 Maternity</SelectItem>
              <SelectItem value="FAMILY">👨‍👩‍👧‍👦 Family</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={selectedProjectType} onValueChange={setSelectedProjectType}>

        <TabsContent value={selectedProjectType} className="mt-6">
          {/* Static Email Campaign Display */}
          {campaignsLoading ? (
            <div className="text-center py-8">Loading email templates...</div>
          ) : staticCampaign?.emails ? (
            <div className="space-y-6">
              {/* Campaign Header with Master Toggle */}
              <Card>
                <CardHeader>
                  <div className="space-y-4">
                    <div>
                      <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-lg sm:text-xl">
                        <span>{selectedProjectType.charAt(0) + selectedProjectType.slice(1).toLowerCase()} Email Campaign</span>
                        <Badge variant="secondary" className="w-fit text-xs">24 Professional Emails</Badge>
                      </CardTitle>
                      <CardDescription className="mt-2 text-xs sm:text-sm">
                        Research-backed email sequence designed for {selectedProjectType.toLowerCase()} photography clients
                      </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`campaign-${selectedProjectType}`}
                          checked={campaignEnabled[selectedProjectType] || false}
                          onChange={(e) => setCampaignEnabled(prev => ({
                            ...prev,
                            [selectedProjectType]: e.target.checked
                          }))}
                          className="w-4 h-4"
                          data-testid={`toggle-campaign-${selectedProjectType}`}
                        />
                        <Label htmlFor={`campaign-${selectedProjectType}`} className="text-sm font-medium">
                          Enable Campaign
                        </Label>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        data-testid="button-save-campaign"
                        onClick={() => {
                          saveSettingsMutation.mutate({
                            projectType: selectedProjectType,
                            campaignEnabled: campaignEnabled[selectedProjectType] || false,
                            emailToggles: emailToggles
                          });
                        }}
                        disabled={saveSettingsMutation.isPending}
                        className="w-full sm:w-auto"
                      >
                        {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Email List */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium">Email Sequence</h3>
                <div className="grid gap-3">
                  {staticCampaign.emails.map((email: any, index: number) => {
                    const emailKey = `${selectedProjectType}-${index}`;
                    const isEnabled = emailToggles[emailKey] ?? true;
                    
                    return (
                      <Card key={index} className={`transition-opacity ${isEnabled ? 'opacity-100' : 'opacity-60'}`}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              {/* Email Toggle */}
                              <input
                                type="checkbox"
                                id={emailKey}
                                checked={isEnabled}
                                onChange={(e) => setEmailToggles(prev => ({
                                  ...prev,
                                  [emailKey]: e.target.checked
                                }))}
                                className="w-4 h-4 mt-1 flex-shrink-0"
                                data-testid={`toggle-email-${index}`}
                              />
                              
                              {/* Email Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium">Email {index + 1}</span>
                                  <Badge variant="outline" className="text-xs">
                                    Day {email.daysAfterStart}
                                  </Badge>
                                </div>
                                <h4 className="font-medium mt-1 text-sm break-words">{email.subject}</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Sent {email.daysAfterStart === 0 ? 'immediately' : `${email.daysAfterStart} days after signup`}
                                </p>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedEmailForPreview(email);
                                  setPreviewDialogOpen(true);
                                }}
                                className="flex-1 sm:flex-none"
                                data-testid={`button-preview-email-${index}`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleEditEmail(email)}
                                className="flex-1 sm:flex-none"
                                data-testid={`button-edit-email-${index}`}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Unable to load email templates</h3>
                <p className="text-muted-foreground">
                  There was an issue loading the {selectedProjectType.toLowerCase()} email campaign templates.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog for Individual Emails */}
      {selectedEmailForPreview && (
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="w-full max-w-[100vw] md:max-w-4xl max-h-[90vh] md:max-h-[80vh] p-4 md:p-6">
            <DialogHeader>
              <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">Email Preview</span>
                </div>
                <Badge variant="outline" className="text-xs w-fit">Day {selectedEmailForPreview.daysAfterStart}</Badge>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm break-words">
                {selectedEmailForPreview.subject}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 h-[calc(90vh-120px)] md:h-[calc(80vh-120px)]">
              {/* Email Content Display */}
              <div className="h-full">
                <div className="flex gap-2 sm:gap-4 mb-4">
                  <Button
                    size="sm"
                    variant={selectedEmailPreview === 'html' ? 'default' : 'outline'}
                    onClick={() => setSelectedEmailPreview('html')}
                    data-testid="button-preview-html"
                    className="flex-1 sm:flex-none text-xs sm:text-sm"
                  >
                    HTML Preview
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedEmailPreview === 'text' ? 'default' : 'outline'}
                    onClick={() => setSelectedEmailPreview('text')}
                    data-testid="button-preview-text"
                    className="flex-1 sm:flex-none text-xs sm:text-sm"
                  >
                    Text Version
                  </Button>
                </div>
                <ScrollArea className="h-[calc(100%-60px)] border rounded-lg">
                  <div className="p-3 md:p-4">
                    {selectedEmailPreview === 'html' ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: selectedEmailForPreview.htmlBody || '' }}
                        className="prose prose-sm max-w-none text-sm"
                      />
                    ) : (
                      <div className="whitespace-pre-wrap font-mono text-xs sm:text-sm break-words">
                        {selectedEmailForPreview.textBody || selectedEmailForPreview.subject}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Email Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-full max-w-[100vw] md:max-w-7xl max-h-[90vh] p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Email
            </DialogTitle>
            <DialogDescription>
              Customize this email with the visual builder, set timing, and preview changes
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[calc(90vh-180px)] pr-4">
            <div className="space-y-6">
              {/* Email Settings */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-subject">Email Subject</Label>
                  <Input
                    id="edit-subject"
                    value={editEmailSubject}
                    onChange={(e) => setEditEmailSubject(e.target.value)}
                    placeholder="Enter email subject"
                    data-testid="input-edit-subject"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-days">Days After Start</Label>
                    <Input
                      id="edit-days"
                      type="number"
                      min="0"
                      value={editDaysAfterStart}
                      onChange={(e) => setEditDaysAfterStart(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      data-testid="input-edit-days"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      How many days after campaign signup to send this email
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="edit-hour">Send At Time (Optional)</Label>
                    <Select
                      value={editSendAtHour !== null ? editSendAtHour.toString() : "none"}
                      onValueChange={(value) => setEditSendAtHour(value === "none" ? null : parseInt(value))}
                    >
                      <SelectTrigger data-testid="select-edit-hour">
                        <SelectValue placeholder="Any time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Any time</SelectItem>
                        <SelectItem value="7">7:00 AM</SelectItem>
                        <SelectItem value="8">8:00 AM</SelectItem>
                        <SelectItem value="9">9:00 AM</SelectItem>
                        <SelectItem value="10">10:00 AM</SelectItem>
                        <SelectItem value="11">11:00 AM</SelectItem>
                        <SelectItem value="12">12:00 PM</SelectItem>
                        <SelectItem value="13">1:00 PM</SelectItem>
                        <SelectItem value="14">2:00 PM</SelectItem>
                        <SelectItem value="15">3:00 PM</SelectItem>
                        <SelectItem value="16">4:00 PM</SelectItem>
                        <SelectItem value="17">5:00 PM</SelectItem>
                        <SelectItem value="18">6:00 PM</SelectItem>
                        <SelectItem value="19">7:00 PM</SelectItem>
                        <SelectItem value="20">8:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Target time of day to send (e.g., 7:00 PM)
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Builder/Preview Tabs */}
              <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as 'builder' | 'preview')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="builder" data-testid="tab-builder">Build Email</TabsTrigger>
                  <TabsTrigger value="preview" data-testid="tab-preview">Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="builder" className="mt-4">
                  {editEmailBlocks.length === 0 && emailBeingEdited?.htmlBody && (
                    <div className="mb-4 p-4 bg-muted rounded-lg border">
                      <div className="flex items-start gap-2">
                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Static Template Detected</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            This email uses the original HTML format. View it in the Preview tab or start building a new version below using the visual builder.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <EmailTemplateBuilder
                    blocks={editEmailBlocks}
                    onBlocksChange={setEditEmailBlocks}
                    includeHeader={editIncludeHeader}
                    headerStyle={editHeaderStyle}
                    includeSignature={editIncludeSignature}
                    signatureStyle={editSignatureStyle}
                    onBrandingChange={(branding) => {
                      setEditIncludeHeader(branding.includeHeader);
                      setEditHeaderStyle(branding.headerStyle);
                      setEditIncludeSignature(branding.includeSignature);
                      setEditSignatureStyle(branding.signatureStyle);
                    }}
                  />
                </TabsContent>

                <TabsContent value="preview" className="mt-4">
                  {editEmailBlocks.length > 0 ? (
                    <EmailPreview
                      subject={editEmailSubject}
                      blocks={editEmailBlocks}
                      includeHeader={editIncludeHeader}
                      headerStyle={editHeaderStyle}
                      includeSignature={editIncludeSignature}
                      signatureStyle={editSignatureStyle}
                    />
                  ) : emailBeingEdited?.htmlBody ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-muted rounded border">
                        <p className="text-xs text-muted-foreground">
                          <strong>Original Template Preview:</strong> This is the static HTML version. Add blocks in the Build Email tab to create a new visual version.
                        </p>
                      </div>
                      <div className="border rounded-lg p-4 bg-white">
                        <div 
                          dangerouslySetInnerHTML={{ __html: emailBeingEdited.htmlBody || '' }}
                          className="prose prose-sm max-w-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <EmailPreview
                      subject={editEmailSubject}
                      blocks={editEmailBlocks}
                      includeHeader={editIncludeHeader}
                      headerStyle={editHeaderStyle}
                      includeSignature={editIncludeSignature}
                      signatureStyle={editSignatureStyle}
                    />
                  )}</TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updateEmailMutation.isPending}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEmail}
              disabled={updateEmailMutation.isPending || !editEmailSubject}
              data-testid="button-save-edit"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateEmailMutation.isPending ? 'Saving...' : 'Save Email'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}