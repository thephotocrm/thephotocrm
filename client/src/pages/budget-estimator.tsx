import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, ArrowRight, Calculator, Info } from "lucide-react";
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
  
  // Close rate and package price
  const closeRate = 0.50;
  const avgPackagePrice = 1500;
  const closedBookings = Math.round(estimatedLeads * closeRate);
  const estimatedRevenue = closedBookings * avgPackagePrice;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Budget Estimator</h1>
        <p className="text-muted-foreground">
          See how your advertising budget converts to revenue
        </p>
      </div>

      {/* Budget Slider Card */}
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-purple-500" />
            Set Your Monthly Budget
          </CardTitle>
          <CardDescription>
            Adjust the slider to see your potential return
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Budget Amount Display */}
          <div className="text-center">
            <div className="text-5xl font-bold text-purple-600" data-testid="text-budget-amount">
              ${currentBudget.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground mt-2">monthly advertising budget</p>
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

      {/* Consolidated Revenue Calculator */}
      <Card className="border-emerald-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Your Potential Return
          </CardTitle>
          <CardDescription>
            Here's how your budget translates to revenue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sequential Flow */}
          <div className="space-y-4">
            {/* Step 1: Ad Spend */}
            <div className="flex items-center gap-4">
              <div className="flex-1 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-xs text-muted-foreground mb-1">Ad Spend</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-ad-spend">
                  ${pricing.actualAdSpend.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">going to ads</p>
              </div>
              <ArrowRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />
              
              {/* Step 2: Leads */}
              <div className="flex-1 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <p className="text-xs text-muted-foreground mb-1">Leads Generated</p>
                <p className="text-2xl font-bold text-purple-600" data-testid="text-estimated-leads">
                  ~{estimatedLeads}
                </p>
                <p className="text-xs text-muted-foreground mt-1">exclusive leads</p>
              </div>
            </div>

            {/* Arrow down */}
            <div className="flex justify-center">
              <div className="rotate-90">
                <ArrowRight className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>

            {/* Step 3: Close Rate */}
            <div className="flex items-center gap-4">
              <div className="flex-1 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="text-xs text-muted-foreground mb-1">50% Close Rate</p>
                <p className="text-2xl font-bold text-amber-600" data-testid="text-closed-bookings">
                  {closedBookings}
                </p>
                <p className="text-xs text-muted-foreground mt-1">bookings closed</p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                <span className="text-2xl">×</span>
              </div>
              
              {/* Step 4: Package Price */}
              <div className="flex-1 p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <p className="text-xs text-muted-foreground mb-1">Avg Package</p>
                <p className="text-2xl font-bold text-indigo-600">
                  ${avgPackagePrice.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">per booking</p>
              </div>
            </div>

            {/* Arrow down */}
            <div className="flex justify-center">
              <div className="rotate-90">
                <ArrowRight className="w-6 h-6 text-emerald-500" />
              </div>
            </div>

            {/* Final Result: Revenue */}
            <div className="p-6 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-lg border-2 border-emerald-500/30">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Potential Monthly Revenue</p>
                <p className="text-5xl font-bold text-emerald-600" data-testid="text-estimated-revenue">
                  ${estimatedRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  That's a {Math.round((estimatedRevenue / currentBudget) * 10) / 10}x return on your investment
                </p>
              </div>
            </div>
          </div>

          {/* Industry Average Note */}
          <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-emerald-700 dark:text-emerald-300">Based on Industry Averages</p>
                <p className="text-xs text-muted-foreground">
                  Calculations use 50% close rate and $1,500 average package. Cost per lead ranges from ${minLeads > 0 ? Math.round(pricing.actualAdSpend / maxLeads) : 0}-${minLeads > 0 ? Math.round(pricing.actualAdSpend / minLeads) : 0} depending on market and targeting.
                </p>
              </div>
            </div>
          </div>

          {/* Fee Breakdown - Fine Print */}
          <div className="pt-4 border-t">
            <details className="group">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                <span>Budget breakdown & platform fees</span>
                <ArrowRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
              </summary>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Total Budget</span>
                  <span className="font-semibold" data-testid="text-total-budget">
                    ${pricing.totalBudget.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Platform Fee ({pricing.feeRate.toFixed(1)}%)</span>
                  <span className="font-semibold" data-testid="text-platform-fee">
                    ${pricing.platformFee.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2 bg-blue-500/10 rounded border border-blue-500/20">
                  <span className="font-medium">Actual Ad Spend</span>
                  <span className="font-bold text-blue-600">
                    ${pricing.actualAdSpend.toLocaleString()}
                  </span>
                </div>

                <p className="text-[10px] text-muted-foreground pt-2 italic">
                  Platform fee scales down as you grow: 40% under $2k → 30% at $2k-$5k → 20% at $5k-$10k → capped at $1,500 for $10k+
                </p>
              </div>
            </details>
          </div>
        </CardContent>
      </Card>

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
