import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Rocket, TrendingUp, Target, DollarSign, Users, BarChart3, Zap, CreditCard, AlertCircle, CheckCircle2 } from "lucide-react";
import { SiFacebook, SiGoogle } from "react-icons/si";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AdCampaign {
  id: string;
  platform: "GOOGLE" | "FACEBOOK";
  status: string;
  monthlyBudgetCents: number;
  markupPercent: number;
  currentSpendCents: number;
  totalLeadsGenerated: number;
}

interface PaymentMethod {
  id: string;
  cardBrand: string;
  cardLast4: string;
  cardExpMonth: number;
  cardExpYear: number;
  isDefault: boolean;
}

export default function LeadHub() {
  const { toast } = useToast();
  const [budget, setBudget] = useState(1000);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [facebookEnabled, setFacebookEnabled] = useState(false);

  // Fetch existing campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<AdCampaign[]>({
    queryKey: ['/api/ad-campaigns']
  });

  // Fetch payment methods
  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ['/api/ad-payment-methods']
  });

  const googleCampaign = campaigns.find(c => c.platform === 'GOOGLE');
  const facebookCampaign = campaigns.find(c => c.platform === 'FACEBOOK');
  const hasPaymentMethod = paymentMethods.length > 0;

  // Initialize budget and state from existing campaigns
  useEffect(() => {
    if (googleCampaign && googleCampaign.monthlyBudgetCents > 0) {
      setBudget(googleCampaign.monthlyBudgetCents / 100);
      setGoogleEnabled(googleCampaign.status === 'ACTIVE');
    }
    if (facebookCampaign && facebookCampaign.monthlyBudgetCents > 0) {
      setBudget(facebookCampaign.monthlyBudgetCents / 100);
      setFacebookEnabled(facebookCampaign.status === 'ACTIVE');
    }
  }, [campaigns]);

  // Calculate tiered pricing
  const calculateMarkup = (budgetAmount: number) => {
    if (budgetAmount < 2000) return 25;
    if (budgetAmount < 5000) return 20;
    return 15;
  };

  const markupPercent = calculateMarkup(budget);
  const platformCost = budget;
  const ourFee = (budget * markupPercent) / 100;
  const totalCost = platformCost + ourFee;
  
  // Estimate leads (rough industry average: $50-100 per lead for wedding photography)
  const estimatedLeadsMin = Math.floor(budget / 100);
  const estimatedLeadsMax = Math.floor(budget / 50);

  // Toggle campaign mutation
  const toggleCampaignMutation = useMutation({
    mutationFn: async ({ platform, enabled }: { platform: "GOOGLE" | "FACEBOOK"; enabled: boolean }) => {
      const campaign = platform === 'GOOGLE' ? googleCampaign : facebookCampaign;
      
      if (enabled) {
        // If campaign exists, activate it. Otherwise, create new one.
        if (campaign) {
          return await apiRequest(`/api/ad-campaigns/${campaign.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ 
              status: 'ACTIVE',
              monthlyBudgetCents: budget * 100,
              markupPercent: markupPercent
            })
          });
        } else {
          return await apiRequest(`/api/ad-campaigns`, {
            method: 'POST',
            body: JSON.stringify({
              platform,
              monthlyBudgetCents: budget * 100,
              markupPercent: markupPercent
            })
          });
        }
      } else {
        if (campaign) {
          return await apiRequest(`/api/ad-campaigns/${campaign.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'PAUSED' })
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ad-campaigns'] });
      toast({
        title: "Campaign updated",
        description: "Your advertising campaign has been updated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update campaign. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleGoogleToggle = (enabled: boolean) => {
    if (enabled && !hasPaymentMethod) {
      toast({
        title: "Payment method required",
        description: "Please add a payment method before enabling ads.",
        variant: "destructive"
      });
      return;
    }
    setGoogleEnabled(enabled);
    toggleCampaignMutation.mutate({ platform: "GOOGLE", enabled });
  };

  const handleFacebookToggle = (enabled: boolean) => {
    if (enabled && !hasPaymentMethod) {
      toast({
        title: "Payment method required",
        description: "Please add a payment method before enabling ads.",
        variant: "destructive"
      });
      return;
    }
    setFacebookEnabled(enabled);
    toggleCampaignMutation.mutate({ platform: "FACEBOOK", enabled });
  };

  const handleAddPaymentMethod = async () => {
    // This will be implemented with Stripe Elements
    toast({
      title: "Coming soon",
      description: "Payment method integration will be available shortly."
    });
  };

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
              Fully managed advertising that delivers exclusive leads directly to your CRM
            </p>
          </div>
        </div>
      </div>

      {/* Payment Method Alert */}
      {!hasPaymentMethod && (
        <div className="max-w-7xl mx-auto mb-6">
          <Alert>
            <CreditCard className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Add a payment method to start running ads</span>
              <Button size="sm" onClick={handleAddPaymentMethod} data-testid="button-add-payment">
                Add Payment Method
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Platform Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ad Platforms */}
          <Card>
            <CardHeader>
              <CardTitle>Advertising Platforms</CardTitle>
              <CardDescription>Enable the platforms where you want to run ads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Google Ads */}
              <div className="flex items-center justify-between p-4 bg-black/20 border border-gray-400 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-[#4285F4]/10">
                    <SiGoogle className="w-6 h-6 text-[#4285F4]" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Google Ads</h3>
                    <p className="text-sm text-muted-foreground">
                      Capture high-intent searches from couples looking for photographers
                    </p>
                    {googleCampaign && (
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {googleCampaign.totalLeadsGenerated} leads
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          ${(googleCampaign.currentSpendCents / 100).toFixed(2)} spent
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                <Switch
                  checked={googleEnabled || googleCampaign?.status === 'ACTIVE'}
                  onCheckedChange={handleGoogleToggle}
                  disabled={!hasPaymentMethod || toggleCampaignMutation.isPending}
                  data-testid="switch-google-ads"
                />
              </div>

              {/* Facebook Ads */}
              <div className="flex items-center justify-between p-4 bg-black/20 border border-gray-400 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-[#1877F2]/10">
                    <SiFacebook className="w-6 h-6 text-[#1877F2]" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Facebook & Instagram Ads</h3>
                    <p className="text-sm text-muted-foreground">
                      Reach engaged couples with visual storytelling
                    </p>
                    {facebookCampaign && (
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {facebookCampaign.totalLeadsGenerated} leads
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          ${(facebookCampaign.currentSpendCents / 100).toFixed(2)} spent
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                <Switch
                  checked={facebookEnabled || facebookCampaign?.status === 'ACTIVE'}
                  onCheckedChange={handleFacebookToggle}
                  disabled={!hasPaymentMethod || toggleCampaignMutation.isPending}
                  data-testid="switch-facebook-ads"
                />
              </div>
            </CardContent>
          </Card>

          {/* Budget Control */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Budget</CardTitle>
              <CardDescription>Set your total monthly advertising budget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-bold">${budget.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">per month</span>
                </div>
                <Slider
                  value={[budget]}
                  onValueChange={(value) => setBudget(value[0])}
                  min={500}
                  max={10000}
                  step={100}
                  className="mb-2"
                  data-testid="slider-budget"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>$500</span>
                  <span>$10,000</span>
                </div>
              </div>

              <Separator />

              {/* Pricing Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform ad spend</span>
                  <span className="font-medium">${platformCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Our fee ({markupPercent}%)
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {budget < 2000 ? "Standard" : budget < 5000 ? "Growth" : "Enterprise"}
                    </Badge>
                  </span>
                  <span className="font-medium">${ourFee.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Total monthly cost</span>
                  <span className="text-xl font-bold">${totalCost.toLocaleString()}</span>
                </div>
              </div>

              <Alert className="bg-blue-500/10 border-blue-500/20">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-sm">
                  <strong>Higher budgets = better rates!</strong> Get 15% fee on budgets over $5,000/month
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Stats & Info */}
        <div className="space-y-6">
          {/* Lead Estimates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Estimated Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="text-4xl font-bold mb-2">
                  {estimatedLeadsMin}-{estimatedLeadsMax}
                </div>
                <p className="text-sm text-muted-foreground">leads per month</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Based on ${budget.toLocaleString()} budget
                </p>
              </div>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost per lead</span>
                  <span className="font-medium">$50-$100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected CTR</span>
                  <span className="font-medium">2-4%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Features */}
          <Card>
            <CardHeader>
              <CardTitle>What's Included</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Professional Campaign Management</p>
                  <p className="text-xs text-muted-foreground">We handle everything for you</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Automatic Lead Capture</p>
                  <p className="text-xs text-muted-foreground">Leads added to your CRM instantly</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Performance Tracking</p>
                  <p className="text-xs text-muted-foreground">Real-time analytics dashboard</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Budget Protection</p>
                  <p className="text-xs text-muted-foreground">Auto-pause at monthly limit</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          {hasPaymentMethod && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMethods.map((pm) => (
                  <div key={pm.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-background rounded">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{pm.cardBrand.toUpperCase()} •••• {pm.cardLast4}</p>
                        <p className="text-xs text-muted-foreground">
                          Expires {pm.cardExpMonth}/{pm.cardExpYear}
                        </p>
                      </div>
                    </div>
                    {pm.isDefault && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
