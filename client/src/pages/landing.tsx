import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Zap,
  Mail,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
  Sparkles,
  ArrowRight
} from "lucide-react";

export default function Landing() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [photographerCount, setPhotographerCount] = useState<number | null>(null);
  
  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  // Fetch current photographer count for spots remaining
  useEffect(() => {
    fetch("/api/photographer-count")
      .then(res => res.json())
      .then(data => setPhotographerCount(data.count))
      .catch(() => setPhotographerCount(null));
  }, []);

  const spotsRemaining = photographerCount !== null ? Math.max(0, 100 - photographerCount) : null;

  const features = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Automated Follow-ups",
      description: "Never miss a lead. Smart email sequences nurture clients automatically."
    },
    {
      icon: <DollarSign className="h-6 w-6" />,
      title: "Fast Payments",
      description: "Get paid instantly with built-in Stripe integration and professional invoices."
    },
    {
      icon: <Mail className="h-6 w-6" />,
      title: "Email Tracking",
      description: "See when clients open your emails and proposals. Follow up at the perfect time."
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Smart Scheduling",
      description: "Share your booking calendar. Let clients book consultations automatically."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Pipeline Management",
      description: "Visual client pipeline shows exactly where every lead stands."
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Professional Proposals",
      description: "Send beautiful proposals with e-signatures and instant acceptance."
    }
  ];

  const benefits = [
    "Book more clients with automated follow-ups",
    "Get paid faster with instant invoicing",
    "Save 10+ hours per week on admin work",
    "Look professional to every client",
    "Track every interaction automatically",
    "Never lose a lead in your inbox again"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Founder Pricing Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm md:text-base font-medium">
          <Sparkles className="h-5 w-5 animate-pulse" />
          <span>
            <strong>Founder's Price: $4.95/month</strong> - Only for the First 100 Users
            {spotsRemaining !== null && (
              <> • <span className="font-bold">{spotsRemaining} spots left!</span></>
            )}
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 text-sm">
            <Camera className="h-3 w-3 mr-1" />
            Built for Wedding Photographers
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Run Your Wedding Photography Business Like a Pro
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto">
            All-in-one CRM built for photographers. Automate follow-ups, send proposals, and get paid faster.
            Everything you need to book more clients and save hours every week.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={() => setLocation("/register")}
              className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
              data-testid="button-start-trial-hero"
            >
              Start Your Free 14-Day Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 px-4 bg-slate-100 dark:bg-slate-900/50">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">
            Tired of juggling spreadsheets, lost emails, and chasing payments?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-red-500 mb-4">
                  <Clock className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="font-semibold mb-2">Missing Follow-ups = Lost Bookings</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Clients slip through the cracks when you're busy shooting weddings
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-red-500 mb-4">
                  <DollarSign className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="font-semibold mb-2">Manual Invoicing Takes Hours</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Creating proposals and chasing payments eats your creative time
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-red-500 mb-4">
                  <Mail className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="font-semibold mb-2">Disorganized Client Communication</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Important emails get buried. You forget who you contacted when
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need in one place
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Stop switching between 5 different tools. Get it all in one CRM.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="text-blue-600 dark:text-blue-400 mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 bg-slate-100 dark:bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What you get when you join
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-700 dark:text-slate-300">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-4 bg-amber-500 hover:bg-amber-600 text-white">
              Limited Time Offer
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Lock in Founder's Pricing
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Join the first 100 photographers and lock in this special rate
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Founder Price */}
            <Card className="border-4 border-blue-600 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 text-sm font-semibold">
                Best Value
              </div>
              <CardContent className="pt-8 text-center">
                <h3 className="text-2xl font-bold mb-2">Founder's Price</h3>
                <div className="mb-4">
                  <span className="text-5xl font-bold">$4.95</span>
                  <span className="text-slate-600 dark:text-slate-400">/month</span>
                </div>
                <Badge variant="secondary" className="mb-4">
                  Only {spotsRemaining !== null ? spotsRemaining : "limited"} spots left
                </Badge>
                <ul className="text-left space-y-2 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Lock in this rate by joining now</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">14-day free trial included</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">All features unlocked</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Cancel anytime</span>
                  </li>
                </ul>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                  onClick={() => setLocation("/register")}
                  data-testid="button-claim-founder-spot"
                >
                  Claim Your Founder Spot
                </Button>
              </CardContent>
            </Card>
            
            {/* Regular Price */}
            <Card className="opacity-75">
              <CardContent className="pt-8 text-center">
                <h3 className="text-2xl font-bold mb-2">Regular Price</h3>
                <div className="mb-4">
                  <span className="text-5xl font-bold line-through text-slate-400">$9.95</span>
                  <span className="text-slate-600 dark:text-slate-400">/month</span>
                </div>
                <Badge variant="outline" className="mb-4">
                  After 100 founders
                </Badge>
                <ul className="text-left space-y-2 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-500">All features unlocked</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-500">14-day free trial included</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-500">Cancel anytime</span>
                  </li>
                </ul>
                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled
                >
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Join {photographerCount !== null ? photographerCount : "photographers"} already inside
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Start your free trial today. No credit card required.
          </p>
          <Button
            size="lg"
            onClick={() => setLocation("/register")}
            className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-slate-100"
            data-testid="button-start-trial-footer"
          >
            Start Your Free 14-Day Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="mt-4 text-sm text-blue-100">
            Lock in founder's pricing while spots last
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-slate-900 text-slate-400 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} The Photo CRM. All rights reserved.</p>
      </footer>
    </div>
  );
}
