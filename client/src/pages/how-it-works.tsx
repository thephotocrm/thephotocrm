import { Rocket, Zap, CheckCircle2, Target, TrendingUp, Users, Shield, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function HowItWorks() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen p-8" data-testid="how-it-works-page">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-full bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10">
            <Rocket className="w-8 h-8 text-purple-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">How Our Managed Advertising Works</h1>
            <p className="text-muted-foreground">
              Everything you need to know about our fully managed ad service
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Main Process */}
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-500" />
              The Simple 3-Step Process
            </CardTitle>
            <CardDescription>We handle everything so you can focus on what you do best</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-lg">1</div>
                  <h3 className="text-xl font-semibold">Set Your Budget</h3>
                </div>
                <p className="text-muted-foreground pl-15">
                  Choose your monthly ad spend between $500-$10,000. We handle all campaign setup, management, and optimization. No complicated ad accounts or credit cards needed with Google or Facebook.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-lg">2</div>
                  <h3 className="text-xl font-semibold">We Run the Ads</h3>
                </div>
                <p className="text-muted-foreground pl-15">
                  Our expert team creates and manages campaigns through our master Google Ads MCC and Facebook Business Manager accounts. We optimize targeting, bidding, and creative daily.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-lg">3</div>
                  <h3 className="text-xl font-semibold">Get Exclusive Leads</h3>
                </div>
                <p className="text-muted-foreground pl-15">
                  Leads flow directly into your CRM with all their contact info. They're yours alone - we never share or resell leads to other photographers in your area.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                100% Exclusive Leads
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">
                Every lead generated from your campaigns belongs to you and you alone. Unlike lead marketplaces that sell the same lead to 5+ photographers, your advertising budget generates contacts that go directly into your CRM.
              </p>
              <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm">No competition for the same lead - they contact you first</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                Tiered Pricing Discounts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">
                Save more as you scale your advertising. Our platform fee decreases as your monthly budget grows, making it more affordable to invest in lead generation.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-background rounded">
                  <span className="text-sm">Under $2,000/month</span>
                  <span className="font-semibold text-purple-500">25% fee</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-background rounded">
                  <span className="text-sm">$2,000 - $5,000/month</span>
                  <span className="font-semibold text-purple-500">20% fee</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-background rounded">
                  <span className="text-sm">Over $5,000/month</span>
                  <span className="font-semibold text-purple-500">15% fee</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                Expert Campaign Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">
                Our team handles all the technical complexity of running profitable ad campaigns so you don't have to learn Google Ads or Facebook Ads Manager.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                  <span className="text-sm">Keyword research and targeting optimization</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                  <span className="text-sm">Ad creative testing and refinement</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                  <span className="text-sm">Bid management and budget allocation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                  <span className="text-sm">Landing page optimization</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-500" />
                Transparent Performance Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">
                See exactly how your advertising budget is performing with real-time metrics and detailed reporting.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-500 mt-1 flex-shrink-0" />
                  <span className="text-sm">Total leads generated and cost per lead</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-500 mt-1 flex-shrink-0" />
                  <span className="text-sm">Ad impressions and click-through rates</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-500 mt-1 flex-shrink-0" />
                  <span className="text-sm">Current spend vs. monthly budget</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-500 mt-1 flex-shrink-0" />
                  <span className="text-sm">Platform-specific performance (Google vs. Facebook)</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Do I need to create my own Google Ads or Facebook account?</h4>
              <p className="text-sm text-muted-foreground">
                No! That's the beauty of our managed service. We run all campaigns through our master accounts, so you don't need to set up anything with Google or Facebook.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">How quickly will I start getting leads?</h4>
              <p className="text-sm text-muted-foreground">
                Most photographers see their first leads within 3-7 days after enabling campaigns. Google Ads typically deliver faster results, while Facebook takes a bit longer to optimize.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">What happens if I pause my campaigns?</h4>
              <p className="text-sm text-muted-foreground">
                You can pause campaigns anytime. Your settings are saved, and you can resume whenever you're ready. You're only charged for active advertising periods.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Can I adjust my budget mid-month?</h4>
              <p className="text-sm text-muted-foreground">
                Yes! You can increase or decrease your budget at any time. Changes take effect immediately, and your platform fee tier adjusts accordingly.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-2">Ready to Start Getting Exclusive Leads?</h3>
            <p className="text-muted-foreground mb-6">
              Set up your managed advertising campaigns in less than 5 minutes
            </p>
            <Button 
              size="lg" 
              className="bg-purple-500 hover:bg-purple-600"
              onClick={() => setLocation('/lead-hub')}
              data-testid="button-go-to-lead-hub"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Go to Lead Hub
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
