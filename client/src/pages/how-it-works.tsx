import { 
  Rocket, 
  CheckCircle2, 
  Target, 
  TrendingUp, 
  Shield, 
  BarChart3,
  Sparkles,
  ArrowRight,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function HowItWorks() {
  const [, setLocation] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "Do I need to create my own Google Ads or Facebook account?",
      answer: "No! That's the beauty of our managed service. We run all campaigns through our master accounts, so you don't need to set up anything with Google or Facebook."
    },
    {
      question: "How quickly will I start getting leads?",
      answer: "Most photographers see their first leads within 3-7 days after enabling campaigns. Google Ads typically deliver faster results, while Facebook takes a bit longer to optimize."
    },
    {
      question: "What happens if I pause my campaigns?",
      answer: "You can pause campaigns anytime. Your settings are saved, and you can resume whenever you're ready. You're only charged for active advertising periods."
    },
    {
      question: "Can I adjust my budget mid-month?",
      answer: "Yes! You can increase or decrease your budget at any time. Changes take effect immediately, and your platform fee tier adjusts accordingly."
    }
  ];

  return (
    <div className="min-h-screen" data-testid="how-it-works-page">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-orange-500/10 border-b">
        <div className="absolute inset-0 bg-grid-white/5 bg-[size:20px_20px]" />
        <div className="relative max-w-7xl mx-auto px-8 py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Fully Managed Advertising</span>
            </div>
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              We Run the Ads.<br />You Get the Leads.
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              No complicated dashboards. No ad accounts to manage. Just exclusive, high-quality leads 
              delivered straight to your CRM while you focus on booking clients.
            </p>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              onClick={() => setLocation('/budget-estimator')}
              data-testid="button-get-started"
            >
              Get Started Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-20">
        {/* How It Works Timeline */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Process</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three steps to start generating exclusive leads for your photography business
            </p>
          </div>

          <div className="relative">
            {/* Timeline connector line - desktop only */}
            <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 opacity-20" />
            
            <div className="grid md:grid-cols-3 gap-12 relative">
              {/* Step 1 */}
              <div className="relative group" data-testid="step-1">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />
                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center transform group-hover:scale-110 transition-transform">
                      <span className="text-3xl font-bold text-white">1</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Set Your Budget</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Choose your monthly ad spend between $500-$10,000. 
                    We handle all campaign setup, management, and optimization. 
                    No Google or Facebook accounts needed.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative group" data-testid="step-2">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-pink-500 blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />
                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center transform group-hover:scale-110 transition-transform">
                      <span className="text-3xl font-bold text-white">2</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-4">We Run the Ads</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Our expert team creates and manages campaigns through our 
                    master Google Ads MCC and Facebook Business Manager accounts. 
                    Daily optimization included.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative group" data-testid="step-3">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />
                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center transform group-hover:scale-110 transition-transform">
                      <span className="text-3xl font-bold text-white">3</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Get Exclusive Leads</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Leads flow directly into your CRM with all contact info. 
                    They're 100% yours—never shared or resold to other 
                    photographers in your area.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Benefits - Bento Box Layout */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Photographers Choose Us</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to grow your business with paid advertising
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Large feature - Exclusive Leads */}
            <div className="md:row-span-2 p-8 rounded-3xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 hover:border-green-500/30 transition-colors">
              <Shield className="w-12 h-12 text-green-500 mb-6" />
              <h3 className="text-2xl font-bold mb-4">100% Exclusive Leads</h3>
              <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
                Every lead generated from your campaigns belongs to you and you alone. 
                Unlike lead marketplaces that sell the same lead to 5+ photographers, 
                your advertising budget generates contacts that go directly into your CRM.
              </p>
              <div className="inline-flex items-center gap-3 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <p className="text-sm font-medium">No competition—they contact you first</p>
              </div>
            </div>

            {/* Tiered Pricing */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/30 transition-colors">
              <TrendingUp className="w-12 h-12 text-purple-500 mb-6" />
              <h3 className="text-2xl font-bold mb-4">Tiered Pricing</h3>
              <p className="text-muted-foreground mb-4">More goes to ads as you scale</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                  <span className="text-sm">Under $2k/mo</span>
                  <span className="font-bold text-purple-500">40% fee</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                  <span className="text-sm">$2k - $5k/mo</span>
                  <span className="font-bold text-purple-500">30% fee</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                  <span className="text-sm">$5k - $10k/mo</span>
                  <span className="font-bold text-purple-500">20% fee</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                  <span className="text-sm">$10k+/mo</span>
                  <span className="font-bold text-purple-500">$1,500 cap</span>
                </div>
              </div>
            </div>

            {/* Expert Management */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 hover:border-blue-500/30 transition-colors">
              <Target className="w-12 h-12 text-blue-500 mb-6" />
              <h3 className="text-2xl font-bold mb-4">Expert Management</h3>
              <p className="text-muted-foreground mb-4">We handle all the complexity</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm">Keyword research & targeting</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm">Ad creative testing</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm">Bid management</span>
                </li>
              </ul>
            </div>

            {/* Performance Tracking - spans both columns */}
            <div className="md:col-span-2 p-8 rounded-3xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 hover:border-orange-500/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <BarChart3 className="w-12 h-12 text-orange-500 mb-6" />
                  <h3 className="text-2xl font-bold mb-4">Transparent Performance Tracking</h3>
                  <p className="text-muted-foreground mb-6 max-w-2xl">
                    See exactly how your advertising budget is performing with real-time metrics and detailed reporting.
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <span className="text-sm">Cost per lead</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <span className="text-sm">Click-through rates</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <span className="text-sm">Budget tracking</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <span className="text-sm">Platform breakdown</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section - Accordion Style */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground">Everything you need to know</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <button
                key={index}
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full text-left p-6 rounded-2xl border bg-card hover:border-purple-500/30 transition-colors"
                data-testid={`faq-item-${index}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <h4 className="font-semibold text-lg pr-8">{faq.question}</h4>
                  <ChevronDown 
                    className={cn(
                      "w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform",
                      openFaq === index && "rotate-180"
                    )}
                  />
                </div>
                {openFaq === index && (
                  <p className="mt-4 text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 p-12 text-center text-white">
          <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px]" />
          <div className="relative">
            <h3 className="text-3xl font-bold mb-4">Ready to Start Getting Exclusive Leads?</h3>
            <p className="text-purple-100 mb-8 text-lg max-w-2xl mx-auto">
              Set up your managed advertising campaigns in less than 5 minutes. 
              No credit card required to start planning.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => setLocation('/budget-estimator')}
                data-testid="button-estimate-budget"
              >
                Estimate Your Budget
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                size="lg" 
                className="bg-white text-purple-600 hover:bg-purple-50"
                onClick={() => setLocation('/lead-hub')}
                data-testid="button-go-to-lead-hub"
              >
                <Rocket className="w-4 h-4 mr-2" />
                Go to Lead Hub
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
