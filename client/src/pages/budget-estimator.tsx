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

  // Calculate tiered pricing
  const calculatePricing = (amount: number) => {
    let markup = 0;
    let markupRate = 0;

    if (amount < 2000) {
      markupRate = 0.25;
      markup = amount * 0.25;
    } else if (amount >= 2000 && amount < 5000) {
      markupRate = 0.20;
      markup = amount * 0.20;
    } else {
      markupRate = 0.15;
      markup = amount * 0.15;
    }

    return {
      adSpend: amount,
      markup,
      markupRate: markupRate * 100,
      total: amount + markup,
    };
  };

  const pricing = calculatePricing(currentBudget);

  // Estimate leads (rough calculation: $50-100 per lead for wedding photography)
  const estimatedLeads = Math.floor(currentBudget / 75);
  const minLeads = Math.floor(currentBudget / 100);
  const maxLeads = Math.floor(currentBudget / 50);

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
            <p className="text-sm text-muted-foreground mt-2">per month</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pricing Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Pricing Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Ad Spend</span>
                <span className="text-lg font-bold" data-testid="text-ad-spend">
                  ${pricing.adSpend.toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <span className="text-sm font-medium">Platform Fee ({pricing.markupRate}%)</span>
                <span className="text-lg font-bold text-purple-600" data-testid="text-platform-fee">
                  ${pricing.markup.toLocaleString()}
                </span>
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold">Total Monthly Cost</span>
                  <span className="text-2xl font-bold text-green-600" data-testid="text-total-cost">
                    ${pricing.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Tiered Pricing Info */}
            <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-blue-700 dark:text-blue-300">Tiered Pricing Benefits</p>
                  <div className="space-y-1 text-muted-foreground">
                    <p>• Under $2k/month: 25% platform fee</p>
                    <p>• $2k - $5k/month: 20% platform fee</p>
                    <p>• Over $5k/month: 15% platform fee</p>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Save more as you scale your advertising!
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
                    ~${Math.round(currentBudget / estimatedLeads)} per lead
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
