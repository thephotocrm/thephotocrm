import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, DollarSign, Users, Calendar, FileText, Download } from "lucide-react";

export default function Reports() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL LOGIC
  const { data: reportData } = useQuery<{
    revenueYTD?: number;
    totalProjects?: number;
    bookedThisMonth?: number;
    outstandingBalance?: number;
  }>({
    queryKey: ["/api/reports/summary"],
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

  return (
    <div>
        {/* Header */}
        <header className="bg-card border-b border-border px-4 md:px-6 py-4 relative">
          <div className="flex items-center justify-between">
            <div>
                <h1 className="text-xl md:text-2xl font-semibold">Reports & Analytics</h1>
                <p className="text-sm md:text-base text-muted-foreground">Track your business performance and contact metrics</p>
              </div>
            
            <Button data-testid="button-export-report">
              <Download className="w-5 h-5 mr-2" />
              Export Report
            </Button>
          </div>
        </header>

        <div className="p-3 sm:p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-total-revenue">
                  ${reportData?.revenueYTD?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Year-to-date revenue from completed projects
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-total-clients">
                  {reportData?.totalProjects || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total active projects across all types
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projects This Month</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-conversion-rate">
                  {reportData?.bookedThisMonth || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  New projects created this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-outstanding-balance">
                  ${reportData?.outstandingBalance?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">From signed proposals awaiting payment</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Revenue Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Revenue chart visualization coming soon</p>
                <p className="text-sm text-muted-foreground">
                  Track monthly revenue, bookings, and payment trends
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Conversion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Pipeline analytics coming soon</p>
                  <p className="text-sm text-muted-foreground">
                    Track conversion rates between stages
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Package Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Package analytics coming soon</p>
                  <p className="text-sm text-muted-foreground">
                    Track which packages perform best
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Monthly Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Monthly analytics coming soon</p>
                <p className="text-sm text-muted-foreground">
                  Track monthly inquiries, consultations, and bookings
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Automation Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Automation Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Automation analytics coming soon</p>
                <p className="text-sm text-muted-foreground">
                  Track email and SMS automation performance
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
