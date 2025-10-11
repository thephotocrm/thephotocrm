import { SiFacebook } from "react-icons/si";
import { TrendingUp, Target, DollarSign, Users, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function FacebookAds() {
  return (
    <div className="min-h-screen p-8" data-testid="facebook-ads-page">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-full bg-[#1877F2]/10">
            <SiFacebook className="w-8 h-8 text-[#1877F2]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Facebook Ads</h1>
            <p className="text-muted-foreground">Run targeted ad campaigns to attract your ideal clients</p>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-blue-500/10 w-fit mb-2">
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <CardTitle className="text-lg">Precise Targeting</CardTitle>
            <CardDescription>
              Reach couples planning weddings in your area with advanced demographic and interest-based targeting
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-green-500/10 w-fit mb-2">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <CardTitle className="text-lg">Budget Control</CardTitle>
            <CardDescription>
              Set daily and lifetime budgets to control your ad spend and maximize ROI
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-purple-500/10 w-fit mb-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
            </div>
            <CardTitle className="text-lg">Real-Time Analytics</CardTitle>
            <CardDescription>
              Track impressions, clicks, and lead conversions with comprehensive analytics dashboard
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-pink-500/10 w-fit mb-2">
              <TrendingUp className="w-5 h-5 text-pink-500" />
            </div>
            <CardTitle className="text-lg">Campaign Optimization</CardTitle>
            <CardDescription>
              A/B test ad creatives and automatically optimize for best performance
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-orange-500/10 w-fit mb-2">
              <Users className="w-5 h-5 text-orange-500" />
            </div>
            <CardTitle className="text-lg">Lead Integration</CardTitle>
            <CardDescription>
              Automatically capture leads from Facebook ads and add them to your CRM pipeline
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-indigo-500/10 w-fit mb-2">
              <SiFacebook className="w-5 h-5 text-indigo-500" />
            </div>
            <CardTitle className="text-lg">Retargeting</CardTitle>
            <CardDescription>
              Re-engage website visitors and past clients with custom retargeting campaigns
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Coming Soon Message */}
      <div className="max-w-4xl mx-auto">
        <Card className="border-2 border-dashed border-muted-foreground/30">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 mb-6">
              <SiFacebook className="w-8 h-8 text-[#1877F2]" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Coming Soon</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              We're building an amazing Facebook Ads integration that will help you generate quality leads and grow your photography business. Stay tuned!
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">In Development</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
