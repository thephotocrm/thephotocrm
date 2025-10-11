import { SiGoogle } from "react-icons/si";
import { Search, MapPin, TrendingUp, Target, BarChart3, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GoogleAds() {
  return (
    <div className="min-h-screen p-8" data-testid="google-ads-page">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-full bg-[#4285F4]/10">
            <SiGoogle className="w-8 h-8 text-[#4285F4]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Google Ads</h1>
            <p className="text-muted-foreground">Capture clients actively searching for photography services</p>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-blue-500/10 w-fit mb-2">
              <Search className="w-5 h-5 text-blue-500" />
            </div>
            <CardTitle className="text-lg">Search Campaigns</CardTitle>
            <CardDescription>
              Appear at the top of Google when couples search for "wedding photographer near me"
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-green-500/10 w-fit mb-2">
              <MapPin className="w-5 h-5 text-green-500" />
            </div>
            <CardTitle className="text-lg">Local Targeting</CardTitle>
            <CardDescription>
              Target specific cities, neighborhoods, or radius around your location
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-purple-500/10 w-fit mb-2">
              <Target className="w-5 h-5 text-purple-500" />
            </div>
            <CardTitle className="text-lg">Keyword Optimization</CardTitle>
            <CardDescription>
              Automatically find and bid on the most profitable keywords for your business
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-pink-500/10 w-fit mb-2">
              <TrendingUp className="w-5 h-5 text-pink-500" />
            </div>
            <CardTitle className="text-lg">Smart Bidding</CardTitle>
            <CardDescription>
              AI-powered bidding strategies to maximize conversions while controlling costs
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-orange-500/10 w-fit mb-2">
              <BarChart3 className="w-5 h-5 text-orange-500" />
            </div>
            <CardTitle className="text-lg">Performance Tracking</CardTitle>
            <CardDescription>
              Monitor ad performance, quality score, and conversion metrics in real-time
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-indigo-500/10 w-fit mb-2">
              <Zap className="w-5 h-5 text-indigo-500" />
            </div>
            <CardTitle className="text-lg">Display Network</CardTitle>
            <CardDescription>
              Reach couples browsing wedding sites with beautiful visual ads across Google's network
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Coming Soon Message */}
      <div className="max-w-4xl mx-auto">
        <Card className="border-2 border-dashed border-muted-foreground/30">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 mb-6">
              <SiGoogle className="w-8 h-8 text-[#4285F4]" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Coming Soon</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              We're developing a powerful Google Ads integration that will help you capture high-intent clients actively searching for photography services. Launching soon!
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
