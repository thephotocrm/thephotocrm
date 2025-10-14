import { Rocket, TrendingUp, Target, DollarSign, Users, BarChart3, Zap } from "lucide-react";
import { SiFacebook, SiGoogle, SiInstagram, SiPinterest, SiTiktok } from "react-icons/si";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LeadHub() {
  const platforms = [
    {
      name: "Facebook Ads",
      icon: SiFacebook,
      color: "text-[#1877F2]",
      bgColor: "bg-[#1877F2]/10",
      description: "Target couples planning weddings with precise demographic and interest-based targeting",
      status: "In Development"
    },
    {
      name: "Google Ads",
      icon: SiGoogle,
      color: "text-[#4285F4]",
      bgColor: "bg-[#4285F4]/10",
      description: "Capture high-intent searches from couples actively looking for photographers",
      status: "In Development"
    },
    {
      name: "Instagram Ads",
      icon: SiInstagram,
      color: "text-[#E4405F]",
      bgColor: "bg-[#E4405F]/10",
      description: "Showcase your portfolio to engaged couples scrolling through visual content",
      status: "In Development"
    },
    {
      name: "Pinterest Ads",
      icon: SiPinterest,
      color: "text-[#E60023]",
      bgColor: "bg-[#E60023]/10",
      description: "Reach couples in the early wedding planning stage while they're gathering inspiration",
      status: "In Development"
    },
    {
      name: "TikTok Ads",
      icon: SiTiktok,
      color: "text-white",
      bgColor: "bg-black/10",
      description: "Connect with younger couples through engaging short-form video content",
      status: "In Development"
    }
  ];

  const features = [
    {
      icon: Target,
      title: "Precise Targeting",
      description: "Reach your ideal clients with advanced demographic, geographic, and interest-based targeting across all platforms",
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-500"
    },
    {
      icon: DollarSign,
      title: "Budget Control",
      description: "Set daily and lifetime budgets for each platform to control your ad spend and maximize ROI",
      bgColor: "bg-green-500/10",
      iconColor: "text-green-500"
    },
    {
      icon: BarChart3,
      title: "Real-Time Analytics",
      description: "Track impressions, clicks, and lead conversions with comprehensive analytics across all advertising channels",
      bgColor: "bg-purple-500/10",
      iconColor: "text-purple-500"
    },
    {
      icon: TrendingUp,
      title: "Campaign Optimization",
      description: "A/B test ad creatives and automatically optimize campaigns for best performance",
      bgColor: "bg-pink-500/10",
      iconColor: "text-pink-500"
    },
    {
      icon: Users,
      title: "Lead Integration",
      description: "Automatically capture leads from all advertising platforms and add them to your CRM pipeline",
      bgColor: "bg-orange-500/10",
      iconColor: "text-orange-500"
    },
    {
      icon: Zap,
      title: "Retargeting",
      description: "Re-engage website visitors and past clients with custom retargeting campaigns across multiple platforms",
      bgColor: "bg-indigo-500/10",
      iconColor: "text-indigo-500"
    }
  ];

  return (
    <div className="min-h-screen p-8" data-testid="lead-hub-page">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-full bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10">
            <Rocket className="w-8 h-8 text-purple-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Lead Hub</h1>
            <p className="text-muted-foreground">
              Centralized advertising platform management for all your lead generation needs
            </p>
          </div>
        </div>
      </div>

      {/* Advertising Platforms */}
      <div className="max-w-7xl mx-auto mb-12">
        <h2 className="text-2xl font-bold mb-6">Advertising Platforms</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <Card key={platform.name} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className={`p-3 rounded-full ${platform.bgColor} w-fit mb-3`}>
                    <Icon className={`w-6 h-6 ${platform.color}`} />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                    <Badge variant="outline" className="ml-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-1.5" />
                      {platform.status}
                    </Badge>
                  </div>
                  <CardDescription>{platform.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Key Features */}
      <div className="max-w-7xl mx-auto mb-12">
        <h2 className="text-2xl font-bold mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <CardHeader>
                  <div className={`p-2 rounded-md ${feature.bgColor} w-fit mb-2`}>
                    <Icon className={`w-5 h-5 ${feature.iconColor}`} />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Coming Soon Message */}
      <div className="max-w-4xl mx-auto">
        <Card className="border-2 border-dashed border-muted-foreground/30">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 mb-6">
              <Rocket className="w-8 h-8 text-purple-500" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Coming Soon</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              We're building an amazing multi-platform advertising hub that will help you generate quality leads 
              across Facebook, Google, Instagram, Pinterest, and TikTok. Stay tuned!
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
