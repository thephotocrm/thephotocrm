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
  ArrowRight,
  Target,
  BarChart,
  Shield
} from "lucide-react";

export default function Landing() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [photographerCount, setPhotographerCount] = useState<number | null>(null);
  const [currentProjectType, setCurrentProjectType] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  
  const projectTypes = ["Wedding", "Portrait", "Commercial"];
  
  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  // Fetch current photographer count for spots remaining
  useEffect(() => {
    fetch("/api/stats/photographer-count")
      .then(res => res.json())
      .then(data => setPhotographerCount(data.count))
      .catch(() => setPhotographerCount(null));
  }, []);

  // Rotate through project types every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRotating(true);
      setTimeout(() => {
        setCurrentProjectType((prev) => (prev + 1) % projectTypes.length);
        setIsRotating(false);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const spotsRemaining = photographerCount !== null ? Math.max(0, 100 - photographerCount) : null;

  const features = [
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Automated Follow-ups",
      description: "Never miss a lead. Smart email sequences nurture clients automatically.",
      gradient: "from-yellow-500 to-orange-500"
    },
    {
      icon: <DollarSign className="h-8 w-8" />,
      title: "Fast Payments",
      description: "Get paid instantly with built-in Stripe integration and professional invoices.",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: <Mail className="h-8 w-8" />,
      title: "Email Tracking",
      description: "See when clients open your emails and proposals. Follow up at the perfect time.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: "Smart Scheduling",
      description: "Share your booking calendar. Let clients book consultations automatically.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Pipeline Management",
      description: "Visual client pipeline shows exactly where every lead stands.",
      gradient: "from-indigo-500 to-blue-500"
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: "Professional Proposals",
      description: "Send beautiful proposals with e-signatures and instant acceptance.",
      gradient: "from-rose-500 to-red-500"
    }
  ];

  const benefits = [
    {
      text: "Book more clients with automated follow-ups",
      icon: <Target className="h-5 w-5" />,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      text: "Get paid faster with instant invoicing",
      icon: <DollarSign className="h-5 w-5" />,
      gradient: "from-green-500 to-emerald-500"
    },
    {
      text: "Save 10+ hours per week on admin work",
      icon: <Clock className="h-5 w-5" />,
      gradient: "from-purple-500 to-pink-500"
    },
    {
      text: "Look professional to every client",
      icon: <Shield className="h-5 w-5" />,
      gradient: "from-orange-500 to-red-500"
    },
    {
      text: "Track every interaction automatically",
      icon: <BarChart className="h-5 w-5" />,
      gradient: "from-indigo-500 to-blue-500"
    },
    {
      text: "Never lose a lead in your inbox again",
      icon: <Sparkles className="h-5 w-5" />,
      gradient: "from-yellow-500 to-orange-500"
    }
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
            Built for Photographers
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              Run Your{" "}
            </span>
            <span className={`inline-block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent transition-all duration-300 ${isRotating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
              {projectTypes[currentProjectType]}
            </span>
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              {" "}Photography Business Like a Pro
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto">
            All-in-one CRM built for photographers. Automate follow-ups, send proposals, and get paid faster.
            Everything you need to book more clients and save hours every week.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={() => setLocation("/register")}
              className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg hover:shadow-xl transition-all hover:scale-105"
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
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="text-red-500 mb-4 group-hover:scale-110 transition-transform">
                  <Clock className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="font-semibold mb-2">Missing Follow-ups = Lost Bookings</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Clients slip through the cracks when you're busy shooting weddings
                </p>
              </CardContent>
            </Card>
            
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="text-red-500 mb-4 group-hover:scale-110 transition-transform">
                  <DollarSign className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="font-semibold mb-2">Manual Invoicing Takes Hours</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Creating proposals and chasing payments eats your creative time
                </p>
              </CardContent>
            </Card>
            
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="text-red-500 mb-4 group-hover:scale-110 transition-transform">
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

      {/* Features Section - Alternating Layout */}
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
          
          <div className="space-y-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`flex flex-col md:flex-row gap-6 items-center ${
                  index % 2 === 1 ? 'md:flex-row-reverse' : ''
                }`}
              >
                <div className={`flex-1 bg-gradient-to-br ${feature.gradient} p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all group hover:scale-105`}>
                  <div className="text-white">
                    <div className="mb-4 group-hover:scale-110 transition-transform">
                      {feature.icon}
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-white">{feature.title}</h3>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-lg text-slate-600 dark:text-slate-400">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section - Bento Grid */}
      <section className="py-16 px-4 bg-slate-100 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What you get when you join
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className={`group bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ${
                  index === 0 ? 'lg:col-span-2' : ''
                } ${
                  index === benefits.length - 1 ? 'lg:col-span-2 lg:col-start-2' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`bg-gradient-to-br ${benefit.gradient} p-3 rounded-lg text-white group-hover:scale-110 transition-transform`}>
                    {benefit.icon}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 flex-1 text-lg font-medium">
                    {benefit.text}
                  </p>
                </div>
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
            <Card className="border-4 border-blue-600 relative overflow-hidden hover:shadow-2xl transition-all hover:scale-105">
              <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 text-sm font-semibold">
                Best Value
              </div>
              <CardContent className="pt-8 text-center">
                <h3 className="text-2xl font-bold mb-2">Founder's Price</h3>
                <div className="mb-4">
                  <span className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">$4.95</span>
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
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                  onClick={() => setLocation("/register")}
                  data-testid="button-claim-founder-spot"
                >
                  Claim Your Founder Spot
                </Button>
              </CardContent>
            </Card>
            
            {/* Regular Price */}
            <Card className="opacity-75 hover:opacity-90 transition-opacity">
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
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
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
            className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-slate-100 shadow-lg hover:shadow-xl transition-all hover:scale-105"
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
