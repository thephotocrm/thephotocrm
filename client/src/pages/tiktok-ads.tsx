import { SiTiktok } from "react-icons/si";
import { TrendingUp, Target, DollarSign, Users, BarChart3, Video } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TikTokAds() {
  return (
    <div className="min-h-screen p-8" data-testid="tiktok-ads-page">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-full bg-black/80">
            <SiTiktok className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">TikTok Ads</h1>
            <p className="text-muted-foreground">Connect with Gen Z and millennial couples on the fastest-growing platform</p>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-pink-500/10 w-fit mb-2">
              <Video className="w-5 h-5 text-pink-500" />
            </div>
            <CardTitle className="text-lg">Video-First Ads</CardTitle>
            <CardDescription>
              Create engaging short-form video ads that showcase your photography style and personality
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-purple-500/10 w-fit mb-2">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <CardTitle className="text-lg">Younger Demographic</CardTitle>
            <CardDescription>
              Reach millennial and Gen Z couples who are getting married and actively browsing wedding content
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-blue-500/10 w-fit mb-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <CardTitle className="text-lg">Viral Potential</CardTitle>
            <CardDescription>
              Leverage TikTok's algorithm to reach millions with creative content that resonates
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-green-500/10 w-fit mb-2">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <CardTitle className="text-lg">Competitive Pricing</CardTitle>
            <CardDescription>
              Lower advertising costs compared to Facebook and Instagram for reaching younger audiences
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-orange-500/10 w-fit mb-2">
              <Target className="w-5 h-5 text-orange-500" />
            </div>
            <CardTitle className="text-lg">Precise Targeting</CardTitle>
            <CardDescription>
              Target by interests, behaviors, and demographics to reach engaged couples in your area
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-indigo-500/10 w-fit mb-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
            </div>
            <CardTitle className="text-lg">Real-Time Metrics</CardTitle>
            <CardDescription>
              Track video views, engagement, and conversions with TikTok's comprehensive analytics
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Coming Soon Message */}
      <div className="max-w-4xl mx-auto">
        <Card className="border-2 border-dashed border-muted-foreground/30">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 mb-6">
              <SiTiktok className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Coming Soon</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              We're building an amazing TikTok Ads integration that will help you reach the next generation of couples. Stay tuned!
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
