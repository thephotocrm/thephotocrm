import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
    let timeout: NodeJS.Timeout;
    const interval = setInterval(() => {
      setIsRotating(true);
      timeout = setTimeout(() => {
        setCurrentProjectType((prev) => (prev + 1) % projectTypes.length);
        setIsRotating(false);
      }, 300);
    }, 3000);
    return () => {
      clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const spotsRemaining = photographerCount !== null ? Math.max(0, 100 - photographerCount) : null;

  const features = [
    {
      title: "Smart Client Pipeline",
      description: "Drag-and-drop cards through stages from inquiry to booking. See your entire sales funnel at a glance.",
      screenshot: "https://picsum.photos/seed/pipeline/800/500"
    },
    {
      title: "Automated Communication",
      description: "Set it once, never touch it again. Email sequences run on autopilot based on client stage.",
      screenshot: "https://picsum.photos/seed/email/800/500"
    },
    {
      title: "Proposals & Payments",
      description: "Beautiful proposals with instant Stripe payouts. Clients sign & pay in one click.",
      screenshot: "https://picsum.photos/seed/proposal/800/500"
    },
    {
      title: "Smart Scheduling",
      description: "Share your calendar link. Clients book consults when it works for both of you—syncs with Google Calendar.",
      screenshot: "https://picsum.photos/seed/calendar/800/500"
    },
    {
      title: "Two-Way SMS",
      description: "Text clients right from the CRM. Keep all conversations in one place—no more switching apps.",
      screenshot: "https://picsum.photos/seed/sms/800/500"
    },
    {
      title: "Client Questionnaires",
      description: "Collect wedding details automatically. Custom forms for every package you offer.",
      screenshot: "https://picsum.photos/seed/forms/800/500"
    },
    {
      title: "Reusable Templates",
      description: "Save your best emails, proposals, and workflows. Reuse them with one click for every new client.",
      screenshot: "https://picsum.photos/seed/templates/800/500"
    },
    {
      title: "Reports & Insights",
      description: "Track bookings, revenue, and conversion rates. Know exactly what's working in your business.",
      screenshot: "https://picsum.photos/seed/analytics/800/500"
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

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold">The Photo CRM</span>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/login")}
            data-testid="button-login"
          >
            Log In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 text-sm">
            <Camera className="h-3 w-3 mr-1" />
            Built for Photographers
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              Run Your
            </span>
            <br />
            <span className={`inline-block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent transition-all duration-300 ${isRotating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
              {projectTypes[currentProjectType]}
            </span>
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              {" "}Photography Business
            </span>
            <br className="md:hidden" />
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              {" "}Like a Pro
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
              Start Free 14-Day Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Proof Bar */}
      <section className="py-4 px-4 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Integrates with <span className="font-semibold">Gmail</span> • <span className="font-semibold">Stripe</span> • <span className="font-semibold">Google Calendar</span>
          </p>
        </div>
      </section>

      {/* Stop losing bookings to busywork */}
      <section className="py-16 px-4 bg-slate-100 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Stop losing bookings to busywork
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              See what happens when you automate the boring stuff
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-0">
                <div className="bg-slate-200 dark:bg-slate-800 aspect-video flex items-center justify-center">
                  <img src="https://placehold.co/600x400/e2e8f0/64748b?text=Pipeline+View" alt="Smart client pipeline view" loading="lazy" className="w-full h-full object-cover" />
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-lg mb-2">Book 2x more clients</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No more lost leads. Automated follow-ups keep you top of mind.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-0">
                <div className="bg-slate-200 dark:bg-slate-800 aspect-video flex items-center justify-center">
                  <img src="https://placehold.co/600x400/e2e8f0/64748b?text=Proposal+Screenshot" alt="Professional proposal with payment" loading="lazy" className="w-full h-full object-cover" />
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-lg mb-2">Get paid instantly</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Clients sign & pay on the spot. Money hits your account same day.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-0">
                <div className="bg-slate-200 dark:bg-slate-800 aspect-video flex items-center justify-center">
                  <img src="https://placehold.co/600x400/e2e8f0/64748b?text=Calendar+Booking" alt="Automated calendar booking" loading="lazy" className="w-full h-full object-cover" />
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-lg mb-2">Save 10+ hours per week</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Stop copy-pasting emails. Automations handle the busywork for you.
                  </p>
                </div>
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
              Everything you need for weddings—built in
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Stop switching between 5 tools. Run your studio from one place.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-0">
                  <div className="bg-slate-200 dark:bg-slate-800 aspect-video flex items-center justify-center overflow-hidden">
                    <img 
                      src={feature.screenshot} 
                      alt={feature.title} 
                      loading="lazy" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-xl mb-2">{feature.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-slate-100 dark:bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Three steps to running your studio on autopilot
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-bold text-lg mb-2">Import & set stages</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Add your contacts from Gmail. Customize your pipeline stages to match your workflow.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-bold text-lg mb-2">Turn on automations</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Set up email sequences once. They run automatically when clients move through stages.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-bold text-lg mb-2">Shoot more, stress less</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                The CRM handles follow-ups, booking, and payments while you focus on your craft.
              </p>
            </div>
          </div>
          
          <div className="text-center border-t border-slate-300 dark:border-slate-700 pt-8">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Integrates seamlessly with <span className="font-semibold">Gmail</span> • <span className="font-semibold">Stripe</span> • <span className="font-semibold">Google Calendar</span> • <span className="font-semibold">Twilio SMS</span>
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-4 bg-white dark:bg-slate-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Photographers love The Photo CRM
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Join hundreds of wedding photographers saving time and booking more clients
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="hover:shadow-xl transition-all">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <img 
                    src="https://i.pravatar.cc/150?img=47" 
                    alt="Jasmine K." 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-bold">Jasmine K.</h3>
                    <p className="text-sm text-slate-500">Wedding Photographer • Dallas, TX</p>
                  </div>
                </div>
                <div className="flex mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Sparkles key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" aria-hidden="true" />
                  ))}
                </div>
                <p className="text-slate-700 dark:text-slate-300">
                  "I was drowning in spreadsheets and missed follow-ups. Now automations handle everything while I shoot. Booked 8 more weddings this season just from better follow-up timing!"
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-xl transition-all">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <img 
                    src="https://i.pravatar.cc/150?img=12" 
                    alt="Mateo R." 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-bold">Mateo R.</h3>
                    <p className="text-sm text-slate-500">Wedding Photographer • Austin, TX</p>
                  </div>
                </div>
                <div className="flex mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Sparkles key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" aria-hidden="true" />
                  ))}
                </div>
                <p className="text-slate-700 dark:text-slate-300">
                  "The Stripe integration is a game changer. Clients pay deposits instantly instead of ghosting after I send a proposal. I get paid same-day and it looks so professional."
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4 bg-slate-100 dark:bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-4 bg-amber-500 hover:bg-amber-600 text-white">
              Limited Time Offer
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Lock in Founder's Pricing
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              14-day free trial, no card required. Cancel anytime.
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
                    <span className="text-sm">Unlimited clients & bookings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Email & SMS automation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Proposals with Stripe payouts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Google Calendar sync</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Lock in $4.95/mo forever</span>
                  </li>
                </ul>
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                  onClick={() => setLocation("/register")}
                  data-testid="button-start-trial-pricing"
                >
                  Start Free 14-Day Trial
                </Button>
                <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3">
                  83 / 100 founder spots claimed
                </p>
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
                    <span className="text-sm text-slate-500">Unlimited clients & bookings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-500">Email & SMS automation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-500">Proposals with Stripe payouts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-500">Google Calendar sync</span>
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

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-white dark:bg-slate-900">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently asked questions
            </h2>
          </div>
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left">
                Does this work with my Gmail account?
              </AccordionTrigger>
              <AccordionContent>
                Yes! The Photo CRM connects directly to Gmail. You can send emails from your own address, track opens, and all replies show up in the CRM automatically.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left">
                How does SMS work? Do I need a separate phone number?
              </AccordionTrigger>
              <AccordionContent>
                We provide a dedicated business number through Twilio. Clients can text you, and you reply right from the CRM. All conversations are saved with the client's card.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left">
                When do I get paid after a client books?
              </AccordionTrigger>
              <AccordionContent>
                Stripe deposits funds directly to your bank account within 2 business days (sometimes same-day). You keep 100% of your rate—we don't take a cut of your bookings.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left">
                I'm not tech-savvy. Is this hard to set up?
              </AccordionTrigger>
              <AccordionContent>
                Not at all. Connect your Gmail and Stripe in under 5 minutes. We have video tutorials for every feature, and most photographers are up and running the same day they sign up.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left">
                Can I cancel anytime?
              </AccordionTrigger>
              <AccordionContent>
                Absolutely. No contracts, no cancellation fees. If you decide it's not for you, cancel with one click. Your data stays yours—you can export everything before you go.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Take back your weekends
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Automate the busywork and focus on creating beautiful images
          </p>
          <Button
            size="lg"
            onClick={() => setLocation("/register")}
            className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-slate-100 shadow-lg hover:shadow-xl transition-all hover:scale-105"
            data-testid="button-start-trial-footer"
          >
            Start Free 14-Day Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="mt-4 text-sm text-blue-100">
            No credit card • Cancel anytime
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
