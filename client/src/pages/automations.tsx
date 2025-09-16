import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Zap, Clock, Mail, Smartphone, Settings } from "lucide-react";

export default function Automations() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

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
            
            <Button data-testid="button-create-automation">
              <Plus className="w-5 h-5 mr-2" />
              Create Automation
            </Button>
          </div>
        </header>

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
                    <Button variant="outline" size="sm" data-testid={`button-manage-${stage.name.toLowerCase().replace(/\s+/g, '-')}`}>
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
