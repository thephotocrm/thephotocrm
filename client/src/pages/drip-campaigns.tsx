import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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


export default function DripCampaigns() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedEmailPreview, setSelectedEmailPreview] = useState<'text' | 'html'>('html');
  const [selectedProjectType, setSelectedProjectType] = useState<string>("WEDDING");
  const [selectedEmailForPreview, setSelectedEmailForPreview] = useState<any>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
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
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedProjectType.charAt(0) + selectedProjectType.slice(1).toLowerCase()} Email Campaign
                        <Badge variant="secondary">24 Professional Emails</Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Research-backed email sequence designed for {selectedProjectType.toLowerCase()} photography clients
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
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
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 flex-1">
                              {/* Email Toggle */}
                              <input
                                type="checkbox"
                                id={emailKey}
                                checked={isEnabled}
                                onChange={(e) => setEmailToggles(prev => ({
                                  ...prev,
                                  [emailKey]: e.target.checked
                                }))}
                                className="w-4 h-4"
                                data-testid={`toggle-email-${index}`}
                              />
                              
                              {/* Email Info */}
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Email {index + 1}</span>
                                  <Badge variant="outline" className="text-xs">
                                    Day {email.daysAfterStart}
                                  </Badge>
                                </div>
                                <h4 className="font-medium mt-1 text-sm">{email.subject}</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Sent {email.daysAfterStart === 0 ? 'immediately' : `${email.daysAfterStart} days after signup`}
                                </p>
                              </div>
                            </div>
                            
                            {/* Preview Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedEmailForPreview(email);
                                setPreviewDialogOpen(true);
                              }}
                              data-testid={`button-preview-email-${index}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
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
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Preview: {selectedEmailForPreview.subject}
                <Badge variant="outline">Day {selectedEmailForPreview.daysAfterStart}</Badge>
              </DialogTitle>
              <DialogDescription>
                Preview of {selectedProjectType.toLowerCase()} photography email content
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 h-[70vh]">
              {/* Email Content Display */}
              <div className="h-full">
                <div className="flex gap-4 mb-4">
                  <Button
                    size="sm"
                    variant={selectedEmailPreview === 'html' ? 'default' : 'outline'}
                    onClick={() => setSelectedEmailPreview('html')}
                    data-testid="button-preview-html"
                  >
                    HTML Preview
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedEmailPreview === 'text' ? 'default' : 'outline'}
                    onClick={() => setSelectedEmailPreview('text')}
                    data-testid="button-preview-text"
                  >
                    Text Version
                  </Button>
                </div>
                <ScrollArea className="h-[calc(100%-60px)] border rounded-lg">
                  <div className="p-4">
                    {selectedEmailPreview === 'html' ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: selectedEmailForPreview.htmlBody || '' }}
                        className="prose prose-sm max-w-none"
                      />
                    ) : (
                      <div className="whitespace-pre-wrap font-mono text-sm">
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
    </div>
  );
}