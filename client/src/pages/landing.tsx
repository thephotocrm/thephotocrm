import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  ArrowDown,
  Target,
  BarChart,
  Shield,
  Heart,
  MessageSquare,
  FileText,
  BookOpen,
  Smartphone,
  Send,
  Wallet,
  Globe
} from "lucide-react";
import pipelineImage from "@assets/ChatGPT Image Oct 3, 2025, 03_42_16 PM_1759524152837.png";
import communicationImage from "@assets/ChatGPT Image Oct 3, 2025, 03_45_04 PM_1759524321494.png";
import proposalImage from "@assets/ChatGPT Image Oct 3, 2025, 03_49_31 PM_1759524583669.png";
import schedulingImage from "@assets/E7BF17EC-8882-4E01-BAD7-DE7BEB23322B_1759526130481.png";
import smsImage from "@assets/3D55A8ED-E647-49A1-943C-420BD0096F6E_1759528182642.png";
import questionnaireImage from "@assets/D80061BD-D8EF-4249-9B60-3EF75FA04DD6_1759528934938.png";
import templatesImage from "@assets/27748FBD-CFCF-4C6D-8905-E877732DDE1B_1759529204307.png";
import reportsImage from "@assets/BF61BA78-E366-4F99-A4B7-09A688E2C3E7_1759531405412.png";
import { SiGmail, SiStripe, SiQuickbooks, SiFacebook, SiGooglecalendar, SiZapier, SiSlack, SiMailchimp, SiDropbox, SiInstagram, SiTwilio } from "react-icons/si";

function MobileIntegrationSlideshow() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = [
    [
      { icon: SiGmail, name: "Gmail" },
      { icon: SiStripe, name: "Stripe" },
      { icon: SiGooglecalendar, name: "Calendar" },
    ],
    [
      { icon: SiQuickbooks, name: "QuickBooks" },
      { icon: SiZapier, name: "Zapier" },
      { icon: SiSlack, name: "Slack" },
    ],
    [
      { icon: SiMailchimp, name: "Mailchimp" },
      { icon: SiDropbox, name: "Dropbox" },
      { icon: SiInstagram, name: "Instagram" },
    ],
    [
      { icon: SiFacebook, name: "Facebook" },
      { icon: SiTwilio, name: "Twilio" },
    ],
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="relative h-16 overflow-hidden">
      {slides.map((slide, slideIndex) => (
        <div
          key={slideIndex}
          className={`absolute inset-0 flex items-center justify-center gap-8 transition-all duration-500 ${
            slideIndex === currentSlide
              ? "opacity-100 translate-y-0"
              : slideIndex < currentSlide
              ? "opacity-0 -translate-y-8"
              : "opacity-0 translate-y-8"
          }`}
        >
          {slide.map((integration, index) => (
            <div
              key={index}
              className="flex items-center gap-3 text-slate-700 dark:text-slate-300"
            >
              <integration.icon className="h-10 w-10 flex-shrink-0" />
              <span className="text-base font-medium">{integration.name}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [photographerCount, setPhotographerCount] = useState<number | null>(null);
  const [currentProjectType, setCurrentProjectType] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const [expandedStage, setExpandedStage] = useState<number | null>(0);
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [visibleFeatures, setVisibleFeatures] = useState(window.innerWidth >= 1024 ? 6 : 4);

  useEffect(() => {
    const checkDesktop = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop && visibleFeatures === 4) {
        setVisibleFeatures(6);
      } else if (!desktop && visibleFeatures === 6) {
        setVisibleFeatures(4);
      }
    };
    
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, [visibleFeatures]);
  
  const projectTypes = ["Wedding", "Portrait", "Commercial"];
  const { toast } = useToast();

  // Demo booking form schema
  const demoFormSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    email: z.string().email("Invalid email address"),
    date: z.string().min(1, "Preferred date is required"),
    time: z.string().min(1, "Preferred time is required"),
  });

  const demoForm = useForm<z.infer<typeof demoFormSchema>>({
    resolver: zodResolver(demoFormSchema),
    defaultValues: {
      firstName: "",
      email: "",
      date: "",
      time: "",
    },
  });

  const demoMutation = useMutation({
    mutationFn: async (data: z.infer<typeof demoFormSchema>) => {
      return await apiRequest("POST", "/api/demo-request", data);
    },
    onSuccess: () => {
      toast({
        title: "Demo request sent!",
        description: "You'll need a free account for the demo. Let's create one now!",
      });
      setDemoDialogOpen(false);
      demoForm.reset();
      // Redirect to registration after brief delay
      setTimeout(() => {
        setLocation("/register");
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send demo request. Please try again.",
        variant: "destructive",
      });
    },
  });
  
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
      screenshot: pipelineImage
    },
    {
      title: "Automated Communication",
      description: "Set it once, never touch it again. Personalized email sequences run on autopilot—dynamically inserting client names, wedding dates, and project details at exactly the right moment.",
      screenshot: communicationImage
    },
    {
      title: "Proposals & Payments",
      description: "Beautiful proposals with instant Stripe payouts. Clients sign & pay in one click.",
      screenshot: proposalImage
    },
    {
      title: "Smart Scheduling",
      description: "Share your calendar link. Clients book consults when it works for both of you—syncs with Google Calendar.",
      screenshot: schedulingImage
    },
    {
      title: "Two-Way SMS",
      description: "Text clients right from the CRM. Keep all conversations in one place—no more switching apps.",
      screenshot: smsImage
    },
    {
      title: "Client Questionnaires",
      description: "Collect wedding details automatically. Custom forms assigned based on package type, then responses help you prep for every shoot.",
      screenshot: questionnaireImage
    },
    {
      title: "Reusable Templates",
      description: "Save your best emails, proposals, and workflows. Reuse them with one click for every new client.",
      screenshot: templatesImage
    },
    {
      title: "Reports & Insights",
      description: "Track bookings, revenue, and conversion rates. Know exactly what's working in your business.",
      screenshot: reportsImage
    }
  ];

  // Mobile features: Show only the 3 most powerful features
  const mobileFeatures = [
    features[0], // Smart Client Pipeline
    features[1], // Automated Communication
    features[2]  // Proposals & Payments
  ];

  // Journey stages with automation details
  const journeyStages = [
    {
      icon: Mail,
      iconColor: "text-blue-600",
      title: "First Inquiry",
      automations: [
        "✨ Auto-email sent via Gmail within seconds with pricing guide",
        "📱 Day 2: AI-powered follow-up SMS check-in",
        "📧 Day 5: Personalized email with availability + calendar link"
      ]
    },
    {
      icon: Calendar,
      iconColor: "text-green-600",
      title: "Consult Booked",
      automations: [
        "📅 Auto-calendar invite synced to Google Calendar",
        "📝 Pre-consult questionnaire automatically assigned",
        "⏰ Reminder emails sent 24 hours before meeting"
      ]
    },
    {
      icon: DollarSign,
      iconColor: "text-emerald-600",
      title: "Proposal Signed",
      automations: [
        "💰 Stripe payment link sent immediately",
        "📬 Welcome email sequence triggers automatically",
        "📄 Contract stored and tracked in your CRM"
      ]
    },
    {
      icon: CheckCircle2,
      iconColor: "text-purple-600",
      title: "Questionnaire Sent",
      automations: [
        "📝 Custom form auto-assigned based on package type",
        "🎯 Responses populate your shoot prep checklist",
        "🔔 Reminder if not completed within 3 days"
      ]
    },
    {
      icon: Camera,
      iconColor: "text-pink-600",
      title: "Shoot Day Reminder",
      automations: [
        "📸 7 days before: Location + timeline reminder email",
        "🌤️ 2 days before: SMS weather check & preparation tips",
        "💪 Day-of: Good luck text with final details"
      ]
    },
    {
      icon: Zap,
      iconColor: "text-yellow-600",
      title: "Editing Updates",
      automations: [
        "🎨 Auto-email: 'Your photos are being edited!'",
        "📊 Weekly progress updates keep clients excited",
        "👀 Sneak peek delivery with 2-3 highlight photos"
      ]
    },
    {
      icon: TrendingUp,
      iconColor: "text-indigo-600",
      title: "Gallery Delivered",
      automations: [
        "🎉 Gallery link sent via email + SMS simultaneously",
        "💾 Download instructions and expiration reminder",
        "📱 Social media sharing guide for easy tagging"
      ]
    },
    {
      icon: Sparkles,
      iconColor: "text-orange-600",
      title: "Review Request",
      automations: [
        "⭐ 7 days after delivery: Auto-testimonial request",
        "💝 30 days: Referral incentive email campaign",
        "🎁 90 days: Anniversary photo reminder"
      ]
    }
  ];

  const allFeatures = [
    { testid: "card-feature-payment", Icon: DollarSign, iconBg: "bg-blue-100 dark:bg-blue-900", iconColor: "text-blue-600 dark:text-blue-400", title: "Automated Payment Collection", description: "Stop chasing clients for deposits and final payments. Stripe integration handles it automatically with payment reminders" },
    { testid: "card-feature-quickbooks", Icon: BarChart, iconBg: "bg-green-100 dark:bg-green-900", iconColor: "text-green-600 dark:text-green-400", title: "QuickBooks Sync", description: "Every payment, fee, and payout automatically syncs to QuickBooks. Tax season becomes painless" },
    { testid: "card-feature-pipeline", Icon: Target, iconBg: "bg-purple-100 dark:bg-purple-900", iconColor: "text-purple-600 dark:text-purple-400", title: "Lead Pipeline Management", description: "Visual board shows exactly where every potential client is and how much revenue is in your pipeline" },
    { testid: "card-feature-followup", Icon: Send, iconBg: "bg-orange-100 dark:bg-orange-900", iconColor: "text-orange-600 dark:text-orange-400", title: "Automated Follow-Up System", description: "Never lose a lead to \"forgot to follow up.\" System handles it 24/7 while you sleep" },
    { testid: "card-feature-proposals", Icon: FileText, iconBg: "bg-pink-100 dark:bg-pink-900", iconColor: "text-pink-600 dark:text-pink-400", title: "Professional Proposal System", description: "Send branded proposals that make you look like a $10k+ photographer, not someone emailing price lists" },
    { testid: "card-feature-communication", Icon: MessageSquare, iconBg: "bg-cyan-100 dark:bg-cyan-900", iconColor: "text-cyan-600 dark:text-cyan-400", title: "Two-Way Client Communication", description: "All emails, texts, and updates logged in one place. No more \"wait, did I tell them about the venue change?\"" },
    { testid: "card-feature-revenue", Icon: Wallet, iconBg: "bg-indigo-100 dark:bg-indigo-900", iconColor: "text-indigo-600 dark:text-indigo-400", title: "Revenue Tracking & Earnings Dashboard", description: "See real-time income, outstanding payments, and monthly revenue at a glance" },
    { testid: "card-feature-automation", Icon: Clock, iconBg: "bg-yellow-100 dark:bg-yellow-900", iconColor: "text-yellow-600 dark:text-yellow-400", title: "Time-Saving Automation", description: "Reclaim 10-15 hours per week by automating questionnaires, reminders, and check-ins" },
    { testid: "card-feature-gmail", Icon: Mail, iconBg: "bg-red-100 dark:bg-red-900", iconColor: "text-red-600 dark:text-red-400", title: "Personal Email Sending (Gmail)", description: "Automated emails send from YOUR address, keeping relationships personal and authentic" },
    { testid: "card-feature-calendar", Icon: Calendar, iconBg: "bg-teal-100 dark:bg-teal-900", iconColor: "text-teal-600 dark:text-teal-400", title: "Online Booking Calendar", description: "Clients self-schedule consultations without the \"when are you free?\" email tennis" },
    { testid: "card-feature-nurture", Icon: TrendingUp, iconBg: "bg-violet-100 dark:bg-violet-900", iconColor: "text-violet-600 dark:text-violet-400", title: "Long-Term Nurture Campaigns", description: "Turn \"not ready yet\" leads into bookings 6-12 months later without manual effort" },
    { testid: "card-feature-mobile", Icon: Smartphone, iconBg: "bg-lime-100 dark:bg-lime-900", iconColor: "text-lime-600 dark:text-lime-400", title: "Mobile Business Access", description: "Check client details, shot lists, and venue info from your phone during shoots" },
    { testid: "card-feature-questionnaire", Icon: CheckCircle2, iconBg: "bg-emerald-100 dark:bg-emerald-900", iconColor: "text-emerald-600 dark:text-emerald-400", title: "Client Questionnaire Automation", description: "Get shot lists and details before the shoot, not scrambling day-of" },
    { testid: "card-feature-wedding-dates", Icon: Zap, iconBg: "bg-rose-100 dark:bg-rose-900", iconColor: "text-rose-600 dark:text-rose-400", title: "Wedding Date Workflows", description: "Automations trigger based on the actual event date (30 days before, 7 days before, etc.)" },
    { testid: "card-feature-templates", Icon: BookOpen, iconBg: "bg-amber-100 dark:bg-amber-900", iconColor: "text-amber-600 dark:text-amber-400", title: "Template Library", description: "Save your best-performing emails, packages, and workflows to reuse and scale" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 pb-20 md:pb-0">
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
          <div className="flex items-center gap-3">
            <Button
              className="hidden md:inline-flex bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
              onClick={() => setLocation("/register")}
              data-testid="button-start-trial-header"
            >
              Start 14 Day Trial
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/login")}
              data-testid="button-login"
            >
              Log In
            </Button>
          </div>
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
      <section className="py-8 px-4 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs text-slate-500 dark:text-slate-500 text-center mb-6 uppercase tracking-wider">
            Integrates with
          </p>
          
          {/* Mobile: Rotating slideshow */}
          <div className="md:hidden">
            <MobileIntegrationSlideshow />
            <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-4">
              and much more
            </p>
          </div>

          {/* Desktop: Scrolling carousel */}
          <div className="relative hidden md:block">
            <style>{`
              @keyframes scroll {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              .animate-scroll {
                animation: scroll 30s linear infinite;
              }
              .animate-scroll:hover {
                animation-play-state: paused;
              }
            `}</style>
            <div className="flex items-center animate-scroll">
              {[...Array(2)].map((_, duplicateIndex) => (
                <div key={duplicateIndex} className="flex items-center gap-12 px-6">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <SiGmail className="h-8 w-8 flex-shrink-0" />
                    <span className="text-sm font-medium">Gmail</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <SiStripe className="h-8 w-8 flex-shrink-0" />
                    <span className="text-sm font-medium">Stripe</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <SiGooglecalendar className="h-8 w-8 flex-shrink-0" />
                    <span className="text-sm font-medium">Google Calendar</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <SiQuickbooks className="h-8 w-8 flex-shrink-0" />
                    <span className="text-sm font-medium">QuickBooks</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <SiZapier className="h-8 w-8 flex-shrink-0" />
                    <span className="text-sm font-medium">Zapier</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <SiSlack className="h-8 w-8 flex-shrink-0" />
                    <span className="text-sm font-medium">Slack</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <SiMailchimp className="h-8 w-8 flex-shrink-0" />
                    <span className="text-sm font-medium">Mailchimp</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <SiDropbox className="h-8 w-8 flex-shrink-0" />
                    <span className="text-sm font-medium">Dropbox</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <SiInstagram className="h-8 w-8 flex-shrink-0" />
                    <span className="text-sm font-medium">Instagram</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <SiFacebook className="h-8 w-8 flex-shrink-0" />
                    <span className="text-sm font-medium">Facebook</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <SiTwilio className="h-8 w-8 flex-shrink-0" />
                    <span className="text-sm font-medium">Twilio</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-0 overflow-hidden">
              <CardContent className="p-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Target className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2">Book 2x more clients</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No more lost leads. Automated follow-ups keep you top of mind.
                </p>
              </CardContent>
            </Card>
            
            <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-0 overflow-hidden">
              <CardContent className="p-6">
                <div className="bg-gradient-to-br from-green-500 to-green-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <DollarSign className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2">Get paid instantly</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Clients sign & pay on the spot. Money hits your account same day.
                </p>
              </CardContent>
            </Card>
            
            <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-0 overflow-hidden">
              <CardContent className="p-6">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Clock className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2">Save 10+ hours per week</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Stop copy-pasting emails. Automations handle the busywork for you.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-0 overflow-hidden">
              <CardContent className="p-6">
                <div className="bg-gradient-to-br from-pink-500 to-pink-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Heart className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2">Delight clients after booking</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Automated questionnaires, shoot reminders, and gallery delivery emails keep couples excited from contract to final photo.
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
              Everything you need for photography—built in
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Stop switching between 5 tools. Run your studio from one place.
            </p>
          </div>
          
          {/* Desktop: Tabs */}
          <div className="hidden md:block">
            <Tabs defaultValue="0" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-8 h-auto">
                {features.map((feature, index) => (
                  <TabsTrigger 
                    key={index} 
                    value={index.toString()}
                    className="text-sm py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                    data-testid={`tab-feature-${index}`}
                  >
                    {feature.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              {features.map((feature, index) => (
                <TabsContent key={index} value={index.toString()} className="mt-0">
                  <Card className="border-2">
                    <CardContent className="p-0">
                      <div className="bg-slate-200 dark:bg-slate-800 aspect-video flex items-center justify-center overflow-hidden">
                        <img 
                          src={feature.screenshot} 
                          alt={feature.title} 
                          loading="lazy" 
                          className="w-full h-full object-cover"
                          data-testid={`img-feature-${index}`}
                        />
                      </div>
                      <div className="p-6">
                        <h3 className="font-bold text-2xl mb-3">{feature.title}</h3>
                        <p className="text-base text-slate-600 dark:text-slate-400">
                          {feature.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Mobile: Condensed Grid (3 key features) */}
          <div className="grid md:hidden grid-cols-1 gap-8">
            {mobileFeatures.map((feature, index) => (
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

      {/* Complete Client Journey */}
      <section className="py-16 px-4 bg-white dark:bg-slate-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Personalized Automation for Every Client Journey
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Streamline leads, bookings, and delivery — all while keeping it personal.
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-4 md:p-8 border-2 border-blue-100 dark:border-slate-700">
            <div className="text-center mb-8">
              <p className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">
                👆 Tap any stage to see the automation magic
              </p>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
                Every automation flow is fully customizable to match your brand and workflow
              </p>
            </div>
            
            {/* Mobile: Vertical Stack */}
            <div className="flex flex-col items-center gap-3 sm:hidden">
              {journeyStages.map((stage, index) => {
                const Icon = stage.icon;
                const isExpanded = expandedStage === index;
                return (
                  <div key={index} className="w-full max-w-xs">
                    <button
                      onClick={() => setExpandedStage(isExpanded ? null : index)}
                      className={`flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-3 rounded-lg shadow-sm w-full transition-all duration-200 ${
                        isExpanded ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
                      }`}
                      data-testid={`button-stage-${index}`}
                    >
                      <Icon className={`h-6 w-6 ${stage.iconColor}`} />
                      <span className="font-semibold text-base">{stage.title}</span>
                    </button>
                    {isExpanded && (
                      <div className="mt-2 ml-6 bg-white dark:bg-slate-900 rounded-lg shadow-md overflow-hidden animate-in slide-in-from-top-2 duration-200">
                        <div className="bg-blue-600 text-white px-4 py-2 font-semibold text-sm">
                          Automations Example
                        </div>
                        <div className="p-4 border-l-4 border-blue-500">
                          <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                            {stage.automations.map((automation, i) => (
                              <li key={i}>{automation}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                    {index < journeyStages.length - 1 && (
                      <ArrowDown className="h-5 w-5 text-slate-400 mx-auto my-2" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop: Horizontal Wrap */}
            <div className="hidden sm:block">
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm md:text-base mb-4">
                {journeyStages.map((stage, index) => {
                  const Icon = stage.icon;
                  const isExpanded = expandedStage === index;
                  return (
                    <div key={index} className="flex items-center">
                      <button
                        onClick={() => setExpandedStage(isExpanded ? null : index)}
                        className={`flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-lg shadow-sm transition-all duration-200 ${
                          isExpanded ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
                        }`}
                        data-testid={`button-stage-${index}`}
                      >
                        <Icon className={`h-5 w-5 ${stage.iconColor}`} />
                        <span className="font-semibold">{stage.title}</span>
                      </button>
                      {index < journeyStages.length - 1 && (
                        <ArrowRight className="h-5 w-5 text-slate-400 mx-2" />
                      )}
                    </div>
                  );
                })}
              </div>
              {expandedStage !== null && (
                <div className="ml-8 bg-white dark:bg-slate-900 rounded-lg shadow-lg overflow-hidden animate-in slide-in-from-top-4 duration-300">
                  <div className="bg-blue-600 text-white px-6 py-3 font-semibold flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Automations Example
                  </div>
                  <div className="p-6 border-l-4 border-blue-500">
                    <h4 className="font-bold text-lg mb-3">
                      {journeyStages[expandedStage].title}
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                      {journeyStages[expandedStage].automations.map((automation, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span>{automation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
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
                    alt="Dillon P." 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-bold">Dillon P.</h3>
                    <p className="text-sm text-slate-500">Wedding Photographer • Dallas, TX</p>
                  </div>
                </div>
                <div className="flex mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Sparkles key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" aria-hidden="true" />
                  ))}
                </div>
                <p className="text-slate-700 dark:text-slate-300">
                  "I was drowning in spreadsheets and missed follow-ups. Now automations handle everything from inquiry to gallery delivery while I shoot. Booked 8 more weddings this season!"
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-xl transition-all">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <img 
                    src="https://i.pravatar.cc/150?img=12" 
                    alt="Eddie G." 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-bold">Eddie G.</h3>
                    <p className="text-sm text-slate-500">Wedding Photographer • Austin, TX</p>
                  </div>
                </div>
                <div className="flex mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Sparkles key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" aria-hidden="true" />
                  ))}
                </div>
                <p className="text-slate-700 dark:text-slate-300">
                  "The questionnaire automation alone saves me 2 hours per wedding. Couples fill out details before the shoot, and the delivery reminders even get couples to leave reviews without me asking!"
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Leads Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Content */}
            <div>
              <div className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold mb-6">
                OPTIONAL ADD-ON
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="text-amber-600 dark:text-amber-500">NEED LEADS?</span>
                <br />
                <span className="text-slate-900 dark:text-white">JUST FLIP THE SWITCH</span>
              </h2>
              
              {/* Steps */}
              <div className="space-y-8">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center">
                      <Target className="w-8 h-8 text-amber-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Turn on exclusive leads when ready</h3>
                    <p className="text-slate-700 dark:text-slate-300">
                      Already running your own ads? Perfect. Need more bookings? Just activate our lead service and receive high-quality leads sent directly to your CRM.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center">
                      <Zap className="w-8 h-8 text-amber-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Automate follow-up</h3>
                    <p className="text-slate-700 dark:text-slate-300">
                      Powerful automations instantly respond with personalized emails, SMS messages, and proposals—so you never miss an opportunity.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center">
                      <DollarSign className="w-8 h-8 text-amber-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Close more deals</h3>
                    <p className="text-slate-700 dark:text-slate-300">
                      With instant proposals, automated follow-ups, and integrated payments, leads convert faster—all while you focus on your craft.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="mt-10">
                <Button
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all text-lg px-8 py-6"
                  size="lg"
                  onClick={() => setLocation("/how-it-works")}
                  data-testid="button-learn-leads"
                >
                  Learn How It Works
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Right Side - Visual/Stats */}
            <div className="relative">
              <Card className="bg-white dark:bg-slate-800 shadow-2xl border-4 border-amber-400 dark:border-amber-600">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full mb-4">
                      <TrendingUp className="h-5 w-5" />
                      <span className="font-semibold">Real Results</span>
                    </div>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="text-center p-4 bg-amber-50 dark:bg-slate-700 rounded-lg">
                      <div className="text-3xl font-bold text-amber-600 dark:text-amber-500 mb-1">3x</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">More Leads</div>
                    </div>
                    <div className="text-center p-4 bg-amber-50 dark:bg-slate-700 rounded-lg">
                      <div className="text-3xl font-bold text-amber-600 dark:text-amber-500 mb-1">2x</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Conversion Rate</div>
                    </div>
                    <div className="text-center p-4 bg-amber-50 dark:bg-slate-700 rounded-lg">
                      <div className="text-3xl font-bold text-amber-600 dark:text-amber-500 mb-1">24/7</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Auto-Response</div>
                    </div>
                    <div className="text-center p-4 bg-amber-50 dark:bg-slate-700 rounded-lg">
                      <div className="text-3xl font-bold text-amber-600 dark:text-amber-500 mb-1">$0</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Lost Leads</div>
                    </div>
                  </div>

                  {/* Testimonial snippet */}
                  <div className="border-t border-amber-200 dark:border-slate-600 pt-6">
                    <p className="text-slate-700 dark:text-slate-300 italic text-sm mb-3">
                      "The automated lead system filled my calendar in 2 weeks. Game changer!"
                    </p>
                    <div className="flex items-center gap-3">
                      <img 
                        src="https://i.pravatar.cc/150?img=68" 
                        alt="Photographer" 
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="font-semibold text-sm">Sarah M.</div>
                        <div className="text-xs text-slate-500">Wedding Photographer</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full shadow-lg font-semibold text-sm transform rotate-12">
                ✓ No Setup Fees
              </div>
            </div>
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

      {/* Full Feature List */}
      <section className="py-16 px-4 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Everything You Need to Run Your Photography Business
            </h2>
            <p className="text-xl text-blue-50">
              15 powerful features built specifically for wedding photographers
            </p>
          </div>

          {/* Mobile: Progressive Disclosure */}
          <div className="grid grid-cols-2 gap-6 lg:hidden">
            {allFeatures.slice(0, visibleFeatures).map((feature) => (
              <div 
                key={feature.testid} 
                className="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105" 
                data-testid={feature.testid}
              >
                <div className={`${feature.iconBg} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <feature.Icon className={`h-6 w-6 ${feature.iconColor}`} />
                </div>
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop: Progressive Disclosure */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-6">
            {allFeatures.slice(0, visibleFeatures).map((feature) => (
              <div 
                key={feature.testid} 
                className="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105" 
                data-testid={feature.testid}
              >
                <div className={`${feature.iconBg} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <feature.Icon className={`h-6 w-6 ${feature.iconColor}`} />
                </div>
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Show More Button */}
          {visibleFeatures < allFeatures.length && (
            <div className="mt-8 text-center">
              <Button
                onClick={() => setVisibleFeatures(prev => Math.min(prev + (isDesktop ? 6 : 4), allFeatures.length))}
                className="bg-white text-blue-600 hover:bg-blue-50"
                size="lg"
                data-testid="button-show-more-features"
              >
                Show More Features
              </Button>
            </div>
          )}
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
                How fast can I actually get this set up?
              </AccordionTrigger>
              <AccordionContent>
                Most photographers are sending automated emails the same day they sign up. Connect your email in 2 clicks, set up Stripe in 5 minutes, and we have pre-built automation templates for wedding workflows. No steep learning curve like Dubsado.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left">
                How much time will this actually save me?
              </AccordionTrigger>
              <AccordionContent>
                Wedding photographers save 10-15 hours per week on admin tasks. Automations handle inquiry responses, contract reminders, payment follow-ups, questionnaires 30 days before weddings, and post-wedding review requests. You set it once, it runs forever—even while you sleep.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left">
                Will automated emails feel robotic or still sound like me?
              </AccordionTrigger>
              <AccordionContent>
                Every automation personalizes with client names, wedding dates, package details, and venue info—so it feels handwritten, not robotic. Plus they're sent from YOUR Gmail address (not a generic no-reply email), keeping your relationships authentic and personal.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left">
                What automations run without me touching anything?
              </AccordionTrigger>
              <AccordionContent>
                Once set up: inquiry auto-responses, follow-up sequences, payment reminders, contract deadline alerts, pre-wedding questionnaires (triggered 30 days before), shoot-day reminders, gallery delivery notifications, and review requests. They trigger based on client actions, stage changes, or wedding dates—100% hands-free.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left">
                How do payments work? Can clients pay me directly?
              </AccordionTrigger>
              <AccordionContent>
                Yes. Clients pay via Stripe (credit card or ACH), money goes straight to your bank in 2 days. We take a 5% platform fee, you keep 95%. Automated payment reminders mean you never chase late deposits again—the system handles it for you.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger className="text-left">
                How do contracts and gallery delivery work?
              </AccordionTrigger>
              <AccordionContent>
                Clients sign contracts digitally right in the proposal (no printing or scanning). Store all signed contracts in the CRM. For galleries, send delivery links via automated email + SMS when ready. Track when clients view and download their photos.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7">
              <AccordionTrigger className="text-left">
                I'm not tech-savvy. Will I actually be able to use this?
              </AccordionTrigger>
              <AccordionContent>
                If you can send an email, you can use this. Everything is drag-and-drop with visual editors. We have video tutorials for every feature, and most photographers who've never used a CRM are confidently running automations within their first day.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8">
              <AccordionTrigger className="text-left">
                What makes this different from HoneyBook or Dubsado?
              </AccordionTrigger>
              <AccordionContent>
                We're built specifically for the photography workflow—not generic service businesses. Your automations trigger based on wedding dates and project milestones automatically. Plus we're $4.95/month (founder pricing) vs. $16-32/month for competitors. And we send from your personal Gmail, not a branded domain.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-9">
              <AccordionTrigger className="text-left">
                Can I access client info on my phone during shoots?
              </AccordionTrigger>
              <AccordionContent>
                Yes. Full mobile access means you can quickly look up client details, venue addresses, shot lists, and special requests right from the venue. Everything syncs in real-time across all your devices.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-10">
              <AccordionTrigger className="text-left">
                Is my client data secure? What about privacy?
              </AccordionTrigger>
              <AccordionContent>
                Your data is encrypted and stored securely on enterprise-grade servers. We never sell or share client information. You own your data—export everything anytime. Stripe handles all payment processing with bank-level security.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-11">
              <AccordionTrigger className="text-left">
                Can I cancel anytime or am I locked into a contract?
              </AccordionTrigger>
              <AccordionContent>
                No contracts, no cancellation fees. Cancel with one click anytime. Your data is yours—export everything before you go. We believe in earning your business every month, not locking you in.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-12">
              <AccordionTrigger className="text-left">
                What if I get stuck or need help?
              </AccordionTrigger>
              <AccordionContent>
                Every feature has step-by-step video tutorials. Plus you can email support and we'll help you set things up. Most questions get answered same-day. We want you succeeding, not struggling.
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

      {/* Mobile Sticky CTA Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 shadow-lg z-50">
        <div className="h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
        <div className="bg-white dark:bg-slate-900 px-4 py-3">
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              onClick={() => setLocation("/register")}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
              data-testid="button-mobile-trial"
            >
              Start Free 14-Day Trial
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setDemoDialogOpen(true)}
              className="w-full"
              data-testid="button-book-demo"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Book Demo
            </Button>
          </div>
        </div>
      </div>

      {/* Demo Booking Dialog */}
      <Dialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Book a Demo</DialogTitle>
            <DialogDescription>
              Schedule a personalized demo of The Photo CRM. We'll show you how to automate your workflow and close more clients.
            </DialogDescription>
          </DialogHeader>
          <Form {...demoForm}>
            <form onSubmit={demoForm.handleSubmit((data) => demoMutation.mutate(data))} className="space-y-4">
              <FormField
                control={demoForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} data-testid="input-demo-firstname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={demoForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} data-testid="input-demo-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={demoForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-demo-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={demoForm.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} data-testid="input-demo-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={demoMutation.isPending} data-testid="button-submit-demo">
                {demoMutation.isPending ? "Sending..." : "Request Demo"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
