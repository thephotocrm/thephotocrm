import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Users, Zap, Calculator, Info } from "lucide-react";
import { useLocation } from "wouter";

export default function BudgetEstimator() {
  const [, setLocation] = useLocation();
  const [budget, setBudget] = useState([2000]);

  const currentBudget = budget[0];

  // Calculate tiered pricing - platform fee is taken FROM budget, not added on top
  const calculatePricing = (totalBudget: number) => {
    let platformFee = 0;
    let feeRate = 0;

    if (totalBudget < 2000) {
      feeRate = 0.40; // 40% for under $2k
      platformFee = totalBudget * 0.40;
    } else if (totalBudget >= 2000 && totalBudget < 5000) {
      feeRate = 0.30; // 30% for $2k-$5k
      platformFee = totalBudget * 0.30;
    } else if (totalBudget >= 5000 && totalBudget < 10000) {
      feeRate = 0.20; // 20% for $5k-$10k
      platformFee = totalBudget * 0.20;
    } else {
      // $10k+: cap at $1,500
      platformFee = 1500;
      feeRate = platformFee / totalBudget;
    }

    const actualAdSpend = totalBudget - platformFee;

    return {
      totalBudget,
      platformFee,
      feeRate: feeRate * 100,
      actualAdSpend,
    };
  };

  const pricing = calculatePricing(currentBudget);

  // Estimate leads based on ACTUAL ad spend (rough calculation: $50-100 per lead for wedding photography)
  const estimatedLeads = Math.floor(pricing.actualAdSpend / 75);
  const minLeads = Math.floor(pricing.actualAdSpend / 100);
  const maxLeads = Math.floor(pricing.actualAdSpend / 50);

  // Estimate revenue (extremely conservative: $1500 per lead * 50% close rate)
  const estimatedRevenue = estimatedLeads * 1500 * 0.50;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Budget Estimator</h1>
        <p className="text-muted-foreground">
          Plan your advertising budget and estimate your lead volume
        </p>
      </div>

      {/* Budget Slider Card */}
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-purple-500" />
            Monthly Advertising Budget
          </CardTitle>
          <CardDescription>
            Adjust the slider to see pricing breakdown and lead estimates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Budget Amount Display */}
          <div className="text-center">
            <div className="text-5xl font-bold text-purple-600" data-testid="text-budget-amount">
              ${currentBudget.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground mt-2">total monthly budget</p>
          </div>

          {/* Slider */}
          <div className="px-4">
            <Slider
              value={budget}
              onValueChange={setBudget}
              min={500}
              max={10000}
              step={100}
              className="cursor-pointer"
              data-testid="slider-budget"
            />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>$500</span>
              <span>$10,000</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estimated Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Estimated Revenue
            </CardTitle>
            <CardDescription>
              Your potential earnings from these leads
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-lg border border-emerald-500/20">
              <div className="text-4xl font-bold text-emerald-600" data-testid="text-estimated-revenue">
                ${estimatedRevenue.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-2">potential monthly revenue</p>
            </div>

            <div className="space-y-3 mt-6">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Average Package</span>
                <span className="text-lg font-bold">$1,500</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Close Rate</span>
                <span className="text-lg font-bold">50%</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <span className="text-sm font-medium">Closed Bookings</span>
                <span className="text-lg font-bold text-emerald-600" data-testid="text-closed-bookings">
                  ~{Math.round(estimatedLeads * 0.50)}
                </span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm space-y-1">
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">Industry Average Estimate</p>
                  <p className="text-xs text-muted-foreground">
                    This calculation assumes a 50% close rate and $1,500 average package, which are industry average estimates. Many photographers achieve higher close rates with premium packages.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Estimates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Estimated Lead Volume
            </CardTitle>
            <CardDescription>
              Based on industry average cost per lead
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
              <div className="text-4xl font-bold text-blue-600" data-testid="text-estimated-leads">
                ~{estimatedLeads}
              </div>
              <p className="text-sm text-muted-foreground mt-2">estimated leads per month</p>
              <p className="text-xs text-muted-foreground mt-1">
                Range: {minLeads} - {maxLeads} leads
              </p>
            </div>

            <div className="space-y-3 mt-6">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Cost Per Lead</p>
                  <p className="text-xs text-muted-foreground">
                    ~${Math.round(pricing.actualAdSpend / estimatedLeads)} per lead
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Zap className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">100% Exclusive</p>
                  <p className="text-xs text-muted-foreground">
                    All leads belong to you alone
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-xs text-muted-foreground">
                <strong className="text-amber-700 dark:text-amber-400">Note:</strong> Lead estimates are based on industry averages. Actual results vary by location, targeting, seasonality, and ad creative quality.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Breakdown - Made smaller and less prominent */}
        <Card className="opacity-90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Budget Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                <span className="text-xs text-muted-foreground">Total Budget</span>
                <span className="font-semibold" data-testid="text-total-budget">
                  ${pricing.totalBudget.toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                <span className="text-xs text-muted-foreground">Platform Fee</span>
                <span className="font-semibold" data-testid="text-platform-fee">
                  ${pricing.platformFee.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center p-2 bg-blue-500/10 rounded border border-blue-500/20">
                <span className="text-xs font-medium">Ad Spend</span>
                <span className="font-bold text-blue-600" data-testid="text-ad-spend">
                  ${pricing.actualAdSpend.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-muted/40">
              <p className="text-xs text-muted-foreground">
                Fee scales down as you grow: 40% → 30% → 20%, capped at $1,500
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Ready to get started?</h3>
              <p className="text-sm text-muted-foreground">
                Set up your campaign budget in Lead Hub and start generating exclusive leads
              </p>
            </div>
            <Button 
              size="lg"
              onClick={() => setLocation('/lead-hub')}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-go-to-lead-hub"
            >
              Go to Lead Hub
              <TrendingUp className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
