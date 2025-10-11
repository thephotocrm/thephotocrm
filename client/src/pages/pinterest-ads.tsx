import { SiPinterest } from "react-icons/si";
import { TrendingUp, Target, DollarSign, Search, BarChart3, Image } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PinterestAds() {
  return (
    <div className="min-h-screen p-8" data-testid="pinterest-ads-page">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-full bg-[#E60023]/10">
            <SiPinterest className="w-8 h-8 text-[#E60023]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Pinterest Ads</h1>
            <p className="text-muted-foreground">Capture couples in the inspiration phase with Pinterest advertising</p>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-red-500/10 w-fit mb-2">
              <Search className="w-5 h-5 text-red-500" />
            </div>
            <CardTitle className="text-lg">Intent-Based Discovery</CardTitle>
            <CardDescription>
              Reach couples actively searching for wedding inspiration and photographer portfolios
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-pink-500/10 w-fit mb-2">
              <Image className="w-5 h-5 text-pink-500" />
            </div>
            <CardTitle className="text-lg">Visual Portfolio Ads</CardTitle>
            <CardDescription>
              Showcase your best wedding photography work where couples are planning their big day
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-purple-500/10 w-fit mb-2">
              <Target className="w-5 h-5 text-purple-500" />
            </div>
            <CardTitle className="text-lg">Long-Lasting Visibility</CardTitle>
            <CardDescription>
              Pins continue driving traffic for months, giving you extended value from each ad
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-green-500/10 w-fit mb-2">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <CardTitle className="text-lg">High ROI Platform</CardTitle>
            <CardDescription>
              Pinterest users are 85% more likely to make purchases than other social platforms
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-orange-500/10 w-fit mb-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
            </div>
            <CardTitle className="text-lg">Shopping Features</CardTitle>
            <CardDescription>
              Use shoppable pins to drive traffic directly to your packages and pricing pages
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-md bg-indigo-500/10 w-fit mb-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
            </div>
            <CardTitle className="text-lg">Detailed Analytics</CardTitle>
            <CardDescription>
              Track saves, clicks, and outbound traffic to measure ad performance and optimize
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Coming Soon Message */}
      <div className="max-w-4xl mx-auto">
        <Card className="border-2 border-dashed border-muted-foreground/30">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 mb-6">
              <SiPinterest className="w-8 h-8 text-[#E60023]" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Coming Soon</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              We're building an amazing Pinterest Ads integration that will help you reach couples during their wedding planning journey. Stay tuned!
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
