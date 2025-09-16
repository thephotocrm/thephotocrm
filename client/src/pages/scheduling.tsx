import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, CheckCircle, Plus, CalendarDays } from "lucide-react";

export default function Scheduling() {
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

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Scheduling</h1>
              <p className="text-muted-foreground">Manage availability and client bookings</p>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" data-testid="button-set-availability">
                <Clock className="w-5 h-5 mr-2" />
                Set Availability
              </Button>
              <Button data-testid="button-add-booking">
                <Plus className="w-5 h-5 mr-2" />
                Add Booking
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">Bookings scheduled</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Slots</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">Open time slots</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">6</div>
                <p className="text-xs text-muted-foreground">Confirmed bookings</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2</div>
                <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
              </CardContent>
            </Card>
          </div>

          {/* Calendar View */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <CalendarDays className="w-5 h-5 mr-2" />
                  Calendar View
                </CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">Week</Button>
                  <Button variant="outline" size="sm">Month</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <CalendarDays className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Calendar integration coming soon</p>
                <p className="text-sm text-muted-foreground">
                  Connect with Google Calendar to sync your availability and bookings
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <div>
                      <h4 className="font-medium">Consultation - Sarah Rodriguez</h4>
                      <p className="text-sm text-muted-foreground">Tomorrow, 2:00 PM - 3:00 PM</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default">Confirmed</Badge>
                    <Button variant="outline" size="sm" data-testid="button-booking-sarah">
                      View Details
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                    <div>
                      <h4 className="font-medium">Wedding - Megan Taylor</h4>
                      <p className="text-sm text-muted-foreground">April 14, 2024 - 10:00 AM - 8:00 PM</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default">Confirmed</Badge>
                    <Button variant="outline" size="sm" data-testid="button-booking-megan">
                      View Details
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                    <div>
                      <h4 className="font-medium">Engagement Session - Katie Foster</h4>
                      <p className="text-sm text-muted-foreground">March 25, 2024 - 4:00 PM - 6:00 PM</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default">Confirmed</Badge>
                    <Button variant="outline" size="sm" data-testid="button-booking-katie">
                      View Details
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
                    <div>
                      <h4 className="font-medium">Consultation - Jennifer Moore</h4>
                      <p className="text-sm text-muted-foreground">March 20, 2024 - 1:00 PM - 2:00 PM</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Pending</Badge>
                    <Button variant="outline" size="sm" data-testid="button-booking-jennifer">
                      Confirm
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Self-Booking */}
          <Card>
            <CardHeader>
              <CardTitle>Client Self-Booking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Public Booking Link</h3>
                    <p className="text-sm text-muted-foreground">
                      Allow clients to book consultation appointments directly
                    </p>
                  </div>
                  <Button variant="outline" data-testid="button-configure-booking">
                    Configure
                  </Button>
                </div>
                
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Your booking link:</p>
                  <code className="text-sm bg-background px-2 py-1 rounded">
                    https://lazyphotog.com/book/your-studio
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
