import { SiInstagram } from "react-icons/si";
import { TrendingUp, Target, DollarSign, Users, BarChart3, Heart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function InstagramAds() {
  return (
    <div className="min-h-screen p-8" data-testid="instagram-ads-page">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-full bg-[#E4405F]/10">
            <SiInstagram className="w-8 h-8 text-[#E4405F]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Instagram Ads</h1>
            <p className="text-muted-foreground">Reach engaged couples on Instagram with stunning visual ads</p>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-pink-500/10 w-fit mb-2">
              <Heart className="w-5 h-5 text-pink-500" />
            </div>
            <CardTitle className="text-lg">Visual Storytelling</CardTitle>
            <CardDescription>
              Showcase your best photography work with Stories, Reels, and feed ads that capture attention
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-purple-500/10 w-fit mb-2">
              <Target className="w-5 h-5 text-purple-500" />
            </div>
            <CardTitle className="text-lg">Engaged Audience</CardTitle>
            <CardDescription>
              Target recently engaged couples actively browsing wedding inspiration on Instagram
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-blue-500/10 w-fit mb-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <CardTitle className="text-lg">Story & Reel Ads</CardTitle>
            <CardDescription>
              Run high-converting ads in Stories and Reels where couples spend most of their time
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-green-500/10 w-fit mb-2">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <CardTitle className="text-lg">Cost-Effective</CardTitle>
            <CardDescription>
              Lower CPMs than other platforms with highly engaged audiences for wedding vendors
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-orange-500/10 w-fit mb-2">
              <Users className="w-5 h-5 text-orange-500" />
            </div>
            <CardTitle className="text-lg">Lead Forms</CardTitle>
            <CardDescription>
              Capture leads directly in Instagram without leaving the app for seamless conversions
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-indigo-500/10 w-fit mb-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
            </div>
            <CardTitle className="text-lg">Performance Insights</CardTitle>
            <CardDescription>
              Track engagement, reach, and lead quality with Instagram's powerful analytics
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Coming Soon Message */}
      <div className="max-w-4xl mx-auto">
        <Card className="border-2 border-dashed border-muted-foreground/30">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 mb-6">
              <SiInstagram className="w-8 h-8 text-[#E4405F]" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Coming Soon</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              We're building an amazing Instagram Ads integration that will help you reach engaged couples with stunning visual campaigns. Stay tuned!
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
