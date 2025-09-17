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
import { Settings as SettingsIcon, User, Palette, Mail, Clock, Shield, Calendar, CheckCircle, XCircle, ExternalLink } from "lucide-react";
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

  const [businessName, setBusinessName] = useState((photographer as any)?.businessName || "");
  const [logoUrl, setLogoUrl] = useState((photographer as any)?.logoUrl || "");
  const [brandPrimary, setBrandPrimary] = useState((photographer as any)?.brandPrimary || "#3b82f6");
  const [brandSecondary, setBrandSecondary] = useState((photographer as any)?.brandSecondary || "#64748b");
  const [emailFromName, setEmailFromName] = useState((photographer as any)?.emailFromName || "");
  const [emailFromAddr, setEmailFromAddr] = useState((photographer as any)?.emailFromAddr || "");
  const [timezone, setTimezone] = useState((photographer as any)?.timezone || "America/New_York");

  // Google Calendar integration component
  function GoogleCalendarIntegration() {
    const { data: calendarStatus, refetch: refetchStatus } = useQuery({
      queryKey: ["/api/calendar/status"],
      enabled: !!user
    });

    const connectMutation = useMutation({
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
            const result = await refetchStatus();
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

    const disconnectMutation = useMutation({
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

    const isConnected = (calendarStatus as any)?.authenticated;
    const connectedEmail = (calendarStatus as any)?.email;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-primary" />
            <div>
              <h3 className="font-medium">Google Calendar</h3>
              <p className="text-sm text-muted-foreground">
                Sync your bookings with Google Calendar and generate Meet links
              </p>
              {isConnected && connectedEmail && (
                <p className="text-xs text-muted-foreground mt-1">
                  Connected as: {connectedEmail}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {isConnected ? (
              <>
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  data-testid="button-disconnect-calendar"
                >
                  {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center text-gray-500">
                  <XCircle className="w-4 h-4 mr-1" />
                  <span className="text-sm">Not Connected</span>
                </div>
                <Button
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending}
                  data-testid="button-connect-calendar"
                  className="flex items-center"
                >
                  {connectMutation.isPending ? (
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
        
        {isConnected && (
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
        
        {!isConnected && (
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
    );
  }

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

  const handleSaveProfile = () => {
    updatePhotographerMutation.mutate({
      businessName,
      logoUrl: logoUrl || undefined,
      emailFromName: emailFromName || undefined,
      emailFromAddr: emailFromAddr || undefined,
      timezone
    });
  };

  const handleSaveBranding = () => {
    updatePhotographerMutation.mutate({
      brandPrimary,
      brandSecondary
    });
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SidebarTrigger data-testid="button-menu-toggle" />
              <div>
                <h1 className="text-2xl font-semibold">Settings</h1>
                <p className="text-muted-foreground">Manage your account and business preferences</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
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
                      <div className="flex items-center space-x-2">
                        <Input
                          id="brandPrimary"
                          type="color"
                          value={brandPrimary}
                          onChange={(e) => setBrandPrimary(e.target.value)}
                          className="w-20"
                          data-testid="input-brand-primary"
                        />
                        <Input
                          value={brandPrimary}
                          onChange={(e) => setBrandPrimary(e.target.value)}
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brandSecondary">Secondary Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="brandSecondary"
                          type="color"
                          value={brandSecondary}
                          onChange={(e) => setBrandSecondary(e.target.value)}
                          className="w-20"
                          data-testid="input-brand-secondary"
                        />
                        <Input
                          value={brandSecondary}
                          onChange={(e) => setBrandSecondary(e.target.value)}
                          placeholder="#64748b"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-sm font-medium mb-2">Preview</p>
                    <div className="flex space-x-2">
                      <div 
                        className="w-16 h-16 rounded-lg"
                        style={{ backgroundColor: brandPrimary }}
                      ></div>
                      <div 
                        className="w-16 h-16 rounded-lg"
                        style={{ backgroundColor: brandSecondary }}
                      ></div>
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
                        placeholder="Sarah Johnson Photography"
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
                        placeholder="sarah@photography.com"
                        data-testid="input-email-from-addr"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-medium">Default Consent Settings</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Email Opt-in by Default</p>
                          <p className="text-xs text-muted-foreground">New clients automatically opt-in to email communications</p>
                        </div>
                        <Switch defaultChecked data-testid="switch-email-opt-in" />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">SMS Opt-in by Default</p>
                          <p className="text-xs text-muted-foreground">New clients automatically opt-in to SMS communications</p>
                        </div>
                        <Switch data-testid="switch-sms-opt-in" />
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSaveProfile}
                    disabled={updatePhotographerMutation.isPending}
                    data-testid="button-save-email"
                  >
                    {updatePhotographerMutation.isPending ? "Saving..." : "Save Email Settings"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="automation">
              <Card>
                <CardHeader>
                  <CardTitle>Automation Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <h3 className="font-medium">Global Quiet Hours</h3>
                    <p className="text-sm text-muted-foreground">
                      Set default quiet hours for all automations. Messages won't be sent during these times.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Select defaultValue="22">
                          <SelectTrigger data-testid="select-quiet-start">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="20">8:00 PM</SelectItem>
                            <SelectItem value="21">9:00 PM</SelectItem>
                            <SelectItem value="22">10:00 PM</SelectItem>
                            <SelectItem value="23">11:00 PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Select defaultValue="8">
                          <SelectTrigger data-testid="select-quiet-end">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="6">6:00 AM</SelectItem>
                            <SelectItem value="7">7:00 AM</SelectItem>
                            <SelectItem value="8">8:00 AM</SelectItem>
                            <SelectItem value="9">9:00 AM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <Button data-testid="button-save-automation">
                    Save Automation Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Change Password</h3>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">Current Password</Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            data-testid="input-current-password"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            data-testid="input-new-password"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm Password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            data-testid="input-confirm-password"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Button data-testid="button-change-password">
                      Change Password
                    </Button>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2 text-destructive">Danger Zone</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      These actions cannot be undone. Please be careful.
                    </p>
                    <Button variant="destructive" data-testid="button-delete-account">
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integrations">
              <Card>
                <CardHeader>
                  <CardTitle>Calendar Integration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <GoogleCalendarIntegration />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
