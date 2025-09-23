import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, User, Palette, Mail, Clock, Shield, Calendar, CheckCircle, XCircle, ExternalLink, CreditCard, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL LOGIC
  const { data: photographer } = useQuery({
    queryKey: ["/api/photographer"],
    enabled: !!user
  });

  // Stripe Connect queries and mutations
  const { data: stripeStatus, refetch: refetchStripeStatus } = useQuery({
    queryKey: ["/api/stripe-connect/account-status"],
    enabled: !!user
  });

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/stripe-connect/create-account");
    },
    onSuccess: () => {
      refetchStripeStatus();
      toast({
        title: "Stripe Account Created",
        description: "Your Stripe Connect account has been created. Complete onboarding to start receiving payments.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Account Creation Failed",
        description: error.message || "Failed to create Stripe account. Please try again.",
        variant: "destructive"
      });
    }
  });

  const createOnboardingLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe-connect/create-onboarding-link", {
        returnUrl: `${window.location.origin}/settings?tab=integrations&stripe=success`,
        refreshUrl: `${window.location.origin}/settings?tab=integrations&stripe=refresh`
      });
      return response;
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.open(data.url, '_blank', 'width=800,height=700');
        // Poll for connection status after opening onboarding window
        const pollInterval = setInterval(async () => {
          const result = await refetchStripeStatus();
          if ((result.data as any)?.onboardingCompleted) {
            clearInterval(pollInterval);
            toast({
              title: "Stripe Connected!",
              description: "Your Stripe account is ready to receive payments.",
            });
          }
        }, 3000);
        
        // Stop polling after 10 minutes
        setTimeout(() => clearInterval(pollInterval), 10 * 60 * 1000);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Onboarding Failed",
        description: error.message || "Failed to start onboarding. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Google Calendar queries and mutations
  const { data: calendarStatus, refetch: refetchCalendarStatus } = useQuery({
    queryKey: ["/api/calendar/status"],
    enabled: !!user
  });

  const connectCalendarMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/google-calendar", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to get auth URL");
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        window.open(data.authUrl, '_blank', 'width=500,height=600');
        // Poll for connection status after opening auth window
        const pollInterval = setInterval(async () => {
          const result = await refetchCalendarStatus();
          if ((result.data as any)?.authenticated) {
            clearInterval(pollInterval);
            toast({
              title: "Google Calendar Connected!",
              description: "Your calendar integration is now active.",
            });
          }
        }, 2000);
        
        // Stop polling after 5 minutes
        setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
      }
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Google Calendar. Please try again.",
        variant: "destructive"
      });
    }
  });

  const disconnectCalendarMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/calendar/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/status"] });
      toast({
        title: "Calendar Disconnected",
        description: "Your Google Calendar has been disconnected.",
      });
    },
    onError: () => {
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect calendar. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updatePhotographerMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", "/api/photographer", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photographer"] });
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive"
      });
    }
  });

  // ALL useState hooks MUST be called before any conditional returns
  const [businessName, setBusinessName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [brandPrimary, setBrandPrimary] = useState("#3b82f6");
  const [brandSecondary, setBrandSecondary] = useState("#64748b");
  const [emailFromName, setEmailFromName] = useState("");
  const [emailFromAddr, setEmailFromAddr] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [defaultEmailOptIn, setDefaultEmailOptIn] = useState(true);
  const [defaultSmsOptIn, setDefaultSmsOptIn] = useState(false);

  // Update state when photographer data loads
  useEffect(() => {
    if (photographer) {
      const p = photographer as any;
      setBusinessName(p.businessName || "");
      setLogoUrl(p.logoUrl || "");
      setBrandPrimary(p.brandPrimary || "#3b82f6");
      setBrandSecondary(p.brandSecondary || "#64748b");
      setEmailFromName(p.emailFromName || "");
      setEmailFromAddr(p.emailFromAddr || "");
      setTimezone(p.timezone || "America/New_York");
      setDefaultEmailOptIn(p.defaultEmailOptIn ?? true);
      setDefaultSmsOptIn(p.defaultSmsOptIn ?? false);
    }
  }, [photographer]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  // Prevent flash of protected content
  if (!loading && !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Handler functions
  const handleSaveProfile = () => {
    updatePhotographerMutation.mutate({
      businessName,
      logoUrl: logoUrl || undefined,
      emailFromName: emailFromName || undefined,
      emailFromAddr: emailFromAddr || undefined,
      timezone,
      defaultEmailOptIn,
      defaultSmsOptIn
    });
  };

  const handleSaveBranding = () => {
    updatePhotographerMutation.mutate({
      brandPrimary,
      brandSecondary
    });
  };

  // Stripe status helpers
  const hasStripeAccount = (stripeStatus as any)?.hasAccount;
  const onboardingCompleted = (stripeStatus as any)?.onboardingCompleted;
  const payoutEnabled = (stripeStatus as any)?.payoutEnabled;
  const accountStatus = (stripeStatus as any)?.status;

  const getStripeStatusDisplay = () => {
    if (!hasStripeAccount) {
      return { icon: XCircle, text: "Not Connected", color: "text-gray-500" };
    }
    if (onboardingCompleted && payoutEnabled) {
      return { icon: CheckCircle, text: "Active", color: "text-green-600" };
    }
    if (hasStripeAccount && !onboardingCompleted) {
      return { icon: AlertCircle, text: "Setup Required", color: "text-yellow-600" };
    }
    return { icon: XCircle, text: "Incomplete", color: "text-red-600" };
  };

  // Calendar status helpers
  const isCalendarConnected = (calendarStatus as any)?.authenticated;
  const connectedEmail = (calendarStatus as any)?.email;

  const stripeStatusInfo = getStripeStatusDisplay();
  const StripeStatusIcon = stripeStatusInfo.icon;

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
            <h1 className="text-xl md:text-2xl font-semibold">Settings</h1>
            <p className="text-sm md:text-base text-muted-foreground">Manage your account and business preferences</p>
          </div>
        </header>

        <div className="p-6">
          <Tabs defaultValue="profile" className="space-y-6">
            {/* Desktop tabs */}
            <TabsList className="hidden md:grid w-full grid-cols-6">
              <TabsTrigger value="profile" className="flex items-center">
                <User className="w-4 h-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="branding" className="flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="automation" className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Automation
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Integrations
              </TabsTrigger>
            </TabsList>
            
            {/* Mobile dropdown - need to add state management */}
            <div className="md:hidden">
              <Select defaultValue="profile">
                <SelectTrigger data-testid="select-settings-section">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profile">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </div>
                  </SelectItem>
                  <SelectItem value="branding">
                    <div className="flex items-center">
                      <Palette className="w-4 h-4 mr-2" />
                      Branding
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="automation">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Automation
                    </div>
                  </SelectItem>
                  <SelectItem value="security">
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      Security
                    </div>
                  </SelectItem>
                  <SelectItem value="integrations">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Integrations
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Business Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        data-testid="input-business-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger data-testid="select-timezone">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <Input
                      id="logoUrl"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      data-testid="input-logo-url"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleSaveProfile}
                    disabled={updatePhotographerMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    {updatePhotographerMutation.isPending ? "Saving..." : "Save Profile"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="branding">
              <Card>
                <CardHeader>
                  <CardTitle>Brand Colors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brandPrimary">Primary Color</Label>
                      <Input
                        id="brandPrimary"
                        type="color"
                        value={brandPrimary}
                        onChange={(e) => setBrandPrimary(e.target.value)}
                        data-testid="input-brand-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brandSecondary">Secondary Color</Label>
                      <Input
                        id="brandSecondary"
                        type="color"
                        value={brandSecondary}
                        onChange={(e) => setBrandSecondary(e.target.value)}
                        data-testid="input-brand-secondary"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSaveBranding}
                    disabled={updatePhotographerMutation.isPending}
                    data-testid="button-save-branding"
                  >
                    {updatePhotographerMutation.isPending ? "Saving..." : "Save Branding"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Email Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="emailFromName">From Name</Label>
                        <Input
                          id="emailFromName"
                          value={emailFromName}
                          onChange={(e) => setEmailFromName(e.target.value)}
                          placeholder="Your Business Name"
                          data-testid="input-email-from-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emailFromAddr">From Email</Label>
                        <Input
                          id="emailFromAddr"
                          type="email"
                          value={emailFromAddr}
                          onChange={(e) => setEmailFromAddr(e.target.value)}
                          placeholder="hello@yourbusiness.com"
                          data-testid="input-email-from-addr"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-lg font-medium">Default Opt-in Settings</h3>
                      <p className="text-sm text-muted-foreground">
                        These settings control the default opt-in status when clients submit your widget form without explicitly choosing opt-in preferences.
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="defaultEmailOptIn">Default Email Opt-in</Label>
                          <p className="text-sm text-muted-foreground">
                            New clients will be opted into email communications by default
                          </p>
                        </div>
                        <Switch
                          id="defaultEmailOptIn"
                          checked={defaultEmailOptIn}
                          onCheckedChange={setDefaultEmailOptIn}
                          data-testid="switch-default-email-opt-in"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="defaultSmsOptIn">Default SMS Opt-in</Label>
                          <p className="text-sm text-muted-foreground">
                            New clients will be opted into SMS communications by default
                          </p>
                        </div>
                        <Switch
                          id="defaultSmsOptIn"
                          checked={defaultSmsOptIn}
                          onCheckedChange={setDefaultSmsOptIn}
                          data-testid="switch-default-sms-opt-in"
                        />
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleSaveProfile}
                      disabled={updatePhotographerMutation.isPending}
                      data-testid="button-save-email-settings"
                    >
                      {updatePhotographerMutation.isPending ? "Saving..." : "Save Email Settings"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="integrations">
              <div className="space-y-6">
                {/* Stripe Connect Integration */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Processing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <CreditCard className="w-8 h-8 text-primary" />
                          <div>
                            <h3 className="font-medium">Stripe Connect</h3>
                            <p className="text-sm text-muted-foreground">
                              Accept payments and receive instant payouts to your bank account
                            </p>
                            {hasStripeAccount && accountStatus && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Account status: {accountStatus}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className={`flex items-center ${stripeStatusInfo.color}`}>
                            <StripeStatusIcon className="w-4 h-4 mr-1" />
                            <span className="text-sm font-medium">{stripeStatusInfo.text}</span>
                          </div>
                          {!hasStripeAccount ? (
                            <Button
                              onClick={() => createAccountMutation.mutate()}
                              disabled={createAccountMutation.isPending}
                              data-testid="button-create-stripe-account"
                              className="flex items-center"
                            >
                              {createAccountMutation.isPending ? (
                                "Creating..."
                              ) : (
                                <>
                                  Connect Stripe
                                  <ExternalLink className="w-4 h-4 ml-1" />
                                </>
                              )}
                            </Button>
                          ) : !onboardingCompleted ? (
                            <Button
                              onClick={() => createOnboardingLinkMutation.mutate()}
                              disabled={createOnboardingLinkMutation.isPending}
                              data-testid="button-complete-stripe-onboarding"
                              className="flex items-center"
                            >
                              {createOnboardingLinkMutation.isPending ? (
                                "Opening..."
                              ) : (
                                <>
                                  Complete Setup
                                  <ExternalLink className="w-4 h-4 ml-1" />
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => createOnboardingLinkMutation.mutate()}
                              disabled={createOnboardingLinkMutation.isPending}
                              data-testid="button-manage-stripe-account"
                              className="flex items-center"
                            >
                              {createOnboardingLinkMutation.isPending ? (
                                "Opening..."
                              ) : (
                                <>
                                  Manage Account
                                  <ExternalLink className="w-4 h-4 ml-1" />
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {onboardingCompleted && payoutEnabled && (
                        <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-green-800 dark:text-green-200">Payments enabled</p>
                              <p className="text-green-700 dark:text-green-300 mt-1">
                                You can now accept payments and receive instant payouts. Visit your earnings page to request payouts.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {hasStripeAccount && !onboardingCompleted && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-yellow-800 dark:text-yellow-200">Setup required</p>
                              <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                                Complete your Stripe onboarding to start accepting payments and receiving payouts
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {!hasStripeAccount && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <CreditCard className="w-4 h-4 text-blue-600 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-blue-800 dark:text-blue-200">Connect Stripe for payments</p>
                              <p className="text-blue-700 dark:text-blue-300 mt-1">
                                Create a Stripe Connect account to accept client payments and receive instant payouts (within minutes for a 1% fee)
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Google Calendar Integration */}
                <Card>
                  <CardHeader>
                    <CardTitle>Calendar Integration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-8 h-8 text-primary" />
                          <div>
                            <h3 className="font-medium">Google Calendar</h3>
                            <p className="text-sm text-muted-foreground">
                              Sync your bookings with Google Calendar and generate Meet links
                            </p>
                            {isCalendarConnected && connectedEmail && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Connected as: {connectedEmail}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {isCalendarConnected ? (
                            <>
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                <span className="text-sm font-medium">Connected</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => disconnectCalendarMutation.mutate()}
                                disabled={disconnectCalendarMutation.isPending}
                                data-testid="button-disconnect-calendar"
                              >
                                {disconnectCalendarMutation.isPending ? "Disconnecting..." : "Disconnect"}
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center text-gray-500">
                                <XCircle className="w-4 h-4 mr-1" />
                                <span className="text-sm">Not Connected</span>
                              </div>
                              <Button
                                onClick={() => connectCalendarMutation.mutate()}
                                disabled={connectCalendarMutation.isPending}
                                data-testid="button-connect-calendar"
                                className="flex items-center"
                              >
                                {connectCalendarMutation.isPending ? (
                                  "Connecting..."
                                ) : (
                                  <>
                                    Connect
                                    <ExternalLink className="w-4 h-4 ml-1" />
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {isCalendarConnected && (
                        <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-green-800 dark:text-green-200">Calendar integration active</p>
                              <p className="text-green-700 dark:text-green-300 mt-1">
                                New bookings will automatically create calendar events with Google Meet links
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {!isCalendarConnected && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <Calendar className="w-4 h-4 text-blue-600 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-blue-800 dark:text-blue-200">Connect your calendar</p>
                              <p className="text-blue-700 dark:text-blue-300 mt-1">
                                Connect Google Calendar to automatically create events and Generate Meet links for client bookings
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="automation">
              <Card>
                <CardHeader>
                  <CardTitle>Automation Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Automation settings coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Security settings coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}