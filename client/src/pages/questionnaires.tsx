import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ClipboardList, Users, CheckCircle, Clock } from "lucide-react";

export default function Questionnaires() {
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

  const { data: questionnaires } = useQuery({
    queryKey: ["/api/questionnaire-templates"],
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
              <h1 className="text-2xl font-semibold">Questionnaires</h1>
              <p className="text-muted-foreground">Create questionnaires and assign them to clients</p>
            </div>
            
            <Button data-testid="button-create-questionnaire">
              <Plus className="w-5 h-5 mr-2" />
              Create Questionnaire
            </Button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Templates</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4</div>
                <p className="text-xs text-muted-foreground">Active templates</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assigned</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">18</div>
                <p className="text-xs text-muted-foreground">To clients</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">67% completion rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">6</div>
                <p className="text-xs text-muted-foreground">Awaiting response</p>
              </CardContent>
            </Card>
          </div>

          {/* Questionnaire Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Questionnaire Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Sample templates */}
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h3 className="font-medium">Wedding Day Details</h3>
                    <p className="text-sm text-muted-foreground">8 questions about wedding timeline, venue, and special moments</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">8 questions</Badge>
                    <Button variant="outline" size="sm" data-testid="button-edit-wedding-details">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" data-testid="button-assign-wedding-details">
                      Assign
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h3 className="font-medium">Photography Preferences</h3>
                    <p className="text-sm text-muted-foreground">6 questions about style, must-have shots, and preferences</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">6 questions</Badge>
                    <Button variant="outline" size="sm" data-testid="button-edit-photo-preferences">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" data-testid="button-assign-photo-preferences">
                      Assign
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h3 className="font-medium">Contact Information</h3>
                    <p className="text-sm text-muted-foreground">5 questions about key contacts and emergency information</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">5 questions</Badge>
                    <Button variant="outline" size="sm" data-testid="button-edit-contact-info">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" data-testid="button-assign-contact-info">
                      Assign
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h3 className="font-medium">Reception Details</h3>
                    <p className="text-sm text-muted-foreground">7 questions about reception timeline and special events</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">7 questions</Badge>
                    <Button variant="outline" size="sm" data-testid="button-edit-reception-details">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" data-testid="button-assign-reception-details">
                      Assign
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Responses */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium">Emily & James Peterson</h4>
                    <p className="text-sm text-muted-foreground">Completed "Wedding Day Details" questionnaire</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default">Completed</Badge>
                    <Button variant="outline" size="sm" data-testid="button-view-response-emily">
                      View Response
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium">Sarah & Tom Rodriguez</h4>
                    <p className="text-sm text-muted-foreground">Completed "Photography Preferences" questionnaire</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default">Completed</Badge>
                    <Button variant="outline" size="sm" data-testid="button-view-response-sarah">
                      View Response
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium">Jennifer & Alex Moore</h4>
                    <p className="text-sm text-muted-foreground">Pending "Wedding Day Details" questionnaire</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Pending</Badge>
                    <Button variant="outline" size="sm" data-testid="button-remind-jennifer">
                      Send Reminder
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
