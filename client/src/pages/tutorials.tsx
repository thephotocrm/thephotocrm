import { 
  Play, 
  CheckCircle2, 
  Clock,
  Rocket,
  Settings as SettingsIcon,
  Users,
  FolderOpen,
  Layers,
  Zap,
  FileText,
  MessageSquare,
  Package,
  ShoppingBag,
  Calendar,
  TrendingUp,
  BarChart3,
  Workflow,
  X
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  videoId?: string; // YouTube video ID placeholder
  icon: any;
  completed?: boolean;
}

export default function Tutorials() {
  const [completedTutorials, setCompletedTutorials] = useState<Set<string>>(new Set());
  const [watchingTutorial, setWatchingTutorial] = useState<Tutorial | null>(null);

  const setupTutorials: Tutorial[] = [
    {
      id: "setup-account",
      title: "Initial Account Setup",
      description: "Configure your profile, business information, and timezone settings",
      duration: "4 min",
      icon: SettingsIcon,
    },
    {
      id: "setup-calendar",
      title: "Connect Google Calendar",
      description: "Integrate Google Calendar for seamless appointment scheduling",
      duration: "3 min",
      icon: Calendar,
    },
    {
      id: "setup-stripe",
      title: "Connect Stripe for Payments",
      description: "Set up Stripe Connect to accept payments from clients",
      duration: "5 min",
      icon: TrendingUp,
    },
    {
      id: "setup-branding",
      title: "Configure Branding & Email",
      description: "Customize your brand colors and email sending settings",
      duration: "3 min",
      icon: SettingsIcon,
    },
    {
      id: "setup-pipeline",
      title: "Create Your First Stage Pipeline",
      description: "Set up your custom project stages and workflow",
      duration: "6 min",
      icon: FolderOpen,
    },
  ];

  const perPageTutorials: Tutorial[] = [
    {
      id: "page-dashboard",
      title: "Dashboard Overview",
      description: "Navigate your business metrics, quick actions, and recent activity",
      duration: "5 min",
      icon: BarChart3,
    },
    {
      id: "page-contacts",
      title: "Contact Management",
      description: "Organize leads and clients in your contact pipeline",
      duration: "7 min",
      icon: Users,
    },
    {
      id: "page-projects",
      title: "Stage-Based Projects",
      description: "Master the horizontal pipeline and project management",
      duration: "8 min",
      icon: FolderOpen,
    },
    {
      id: "page-smart-files",
      title: "Smart Files Builder",
      description: "Create stunning proposals, invoices, and contracts",
      duration: "12 min",
      icon: Layers,
    },
    {
      id: "page-automations",
      title: "Marketing Automations",
      description: "Set up automated emails, SMS, and Smart File delivery",
      duration: "10 min",
      icon: Zap,
    },
    {
      id: "page-lead-forms",
      title: "Lead Capture Forms",
      description: "Build and embed forms to capture leads on your website",
      duration: "6 min",
      icon: FileText,
    },
    {
      id: "page-inbox",
      title: "SMS Inbox",
      description: "Two-way SMS communication with your clients",
      duration: "5 min",
      icon: MessageSquare,
    },
    {
      id: "page-packages",
      title: "Packages & Add-ons",
      description: "Create global packages and add-ons for Smart Files",
      duration: "7 min",
      icon: Package,
    },
    {
      id: "page-templates",
      title: "Email & SMS Templates",
      description: "Build reusable templates for client communication",
      duration: "6 min",
      icon: MessageSquare,
    },
    {
      id: "page-lead-hub",
      title: "Budget Estimator & Lead Hub",
      description: "Plan advertising budget and track generated leads",
      duration: "8 min",
      icon: TrendingUp,
    },
  ];

  const workflowTutorials: Tutorial[] = [
    {
      id: "workflow-inquiry",
      title: "Inquiry to Booking Workflow",
      description: "Complete process: Lead capture → Contact → Proposal → Contract → Payment",
      duration: "15 min",
      icon: Workflow,
    },
    {
      id: "workflow-wedding",
      title: "Automated Wedding Workflow",
      description: "Set up stage-based automation for wedding photography clients",
      duration: "18 min",
      icon: Rocket,
    },
    {
      id: "workflow-leads",
      title: "Lead Generation System",
      description: "Forms → Managed Ads → Lead Hub → Contact Conversion",
      duration: "20 min",
      icon: TrendingUp,
    },
  ];

  const toggleComplete = (id: string) => {
    setCompletedTutorials(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const TutorialCard = ({ tutorial, category }: { tutorial: Tutorial; category: string }) => {
    const isCompleted = completedTutorials.has(tutorial.id);
    const Icon = tutorial.icon;
    
    return (
      <div 
        className={cn(
          "group relative p-6 rounded-2xl border transition-all hover:shadow-lg",
          isCompleted 
            ? "bg-green-500/5 border-green-500/30" 
            : "bg-card border-border hover:border-purple-500/30"
        )}
        data-testid={`tutorial-${tutorial.id}`}
      >
        {/* Completion Badge */}
        {isCompleted && (
          <div className="absolute top-4 right-4">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          </div>
        )}

        <div className="flex items-start gap-4 mb-4">
          <div className={cn(
            "p-3 rounded-xl transition-colors",
            isCompleted 
              ? "bg-green-500/10" 
              : "bg-purple-500/10 group-hover:bg-purple-500/20"
          )}>
            <Icon className={cn(
              "w-6 h-6",
              isCompleted ? "text-green-500" : "text-purple-500"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1">{tutorial.title}</h3>
            <p className="text-sm text-muted-foreground mb-3">{tutorial.description}</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{tutorial.duration}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setWatchingTutorial(tutorial)}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2",
              isCompleted
                ? "bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20"
                : "bg-purple-500 text-white hover:bg-purple-600"
            )}
            data-testid={`button-watch-${tutorial.id}`}
          >
            <Play className="w-4 h-4" />
            <span>Watch Tutorial</span>
          </button>
          <button
            onClick={() => toggleComplete(tutorial.id)}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors",
              isCompleted
                ? "bg-background border border-border hover:bg-muted"
                : "bg-background border border-border hover:bg-muted"
            )}
            data-testid={`button-mark-${tutorial.id}`}
          >
            {isCompleted ? "Unmark" : "Mark Complete"}
          </button>
        </div>
      </div>
    );
  };

  const calculateProgress = (tutorials: Tutorial[]) => {
    const completed = tutorials.filter(t => completedTutorials.has(t.id)).length;
    return Math.round((completed / tutorials.length) * 100);
  };

  return (
    <div className="min-h-screen p-8" data-testid="tutorials-page">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-full bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10">
            <Rocket className="w-8 h-8 text-purple-500" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Video Tutorials</h1>
            <p className="text-lg text-muted-foreground">
              Learn how to master every feature of your CRM
            </p>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Your Learning Progress</h3>
            <span className="text-sm text-muted-foreground">
              {completedTutorials.size} of {setupTutorials.length + perPageTutorials.length + workflowTutorials.length} completed
            </span>
          </div>
          <div className="w-full h-3 bg-background rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ 
                width: `${Math.round((completedTutorials.size / (setupTutorials.length + perPageTutorials.length + workflowTutorials.length)) * 100)}%` 
              }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-16">
        {/* Setup Tutorials */}
        <section>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-bold">1. Setup Tutorials</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-24 h-2 bg-background rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${calculateProgress(setupTutorials)}%` }}
                  />
                </div>
                <span>{calculateProgress(setupTutorials)}%</span>
              </div>
            </div>
            <p className="text-muted-foreground">Get your account configured and ready to use</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {setupTutorials.map(tutorial => (
              <TutorialCard key={tutorial.id} tutorial={tutorial} category="setup" />
            ))}
          </div>
        </section>

        {/* Per-Page Tutorials */}
        <section>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-bold">2. Feature Deep-Dives</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-24 h-2 bg-background rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${calculateProgress(perPageTutorials)}%` }}
                  />
                </div>
                <span>{calculateProgress(perPageTutorials)}%</span>
              </div>
            </div>
            <p className="text-muted-foreground">Master each feature with dedicated tutorials</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {perPageTutorials.map(tutorial => (
              <TutorialCard key={tutorial.id} tutorial={tutorial} category="feature" />
            ))}
          </div>
        </section>

        {/* Workflow Tutorials */}
        <section>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-bold">3. Complete Workflows</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-24 h-2 bg-background rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-500"
                    style={{ width: `${calculateProgress(workflowTutorials)}%` }}
                  />
                </div>
                <span>{calculateProgress(workflowTutorials)}%</span>
              </div>
            </div>
            <p className="text-muted-foreground">End-to-end processes and best practices</p>
          </div>
          <div className="grid md:grid-cols-1 gap-6">
            {workflowTutorials.map(tutorial => (
              <TutorialCard key={tutorial.id} tutorial={tutorial} category="workflow" />
            ))}
          </div>
        </section>

        {/* Help Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 p-12 text-center text-white">
          <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px]" />
          <div className="relative">
            <h3 className="text-3xl font-bold mb-4">Need More Help?</h3>
            <p className="text-purple-100 mb-8 text-lg max-w-2xl mx-auto">
              Can't find what you're looking for? Our support team is here to help you succeed.
            </p>
            <button 
              className="px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
              data-testid="button-contact-support"
            >
              Contact Support
            </button>
          </div>
        </section>
      </div>

      {/* Video Modal */}
      <Dialog open={!!watchingTutorial} onOpenChange={(open) => !open && setWatchingTutorial(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{watchingTutorial?.title}</DialogTitle>
            <DialogDescription>{watchingTutorial?.description}</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {watchingTutorial?.videoId ? (
              <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${watchingTutorial.videoId}`}
                  title={watchingTutorial.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg"
                />
              </div>
            ) : (
              <div className="aspect-video bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg flex flex-col items-center justify-center border border-purple-500/20">
                <Play className="w-16 h-16 text-purple-500 mb-4" />
                <h4 className="text-lg font-semibold mb-2">Video Coming Soon</h4>
                <p className="text-muted-foreground text-center max-w-md">
                  This tutorial video is currently being produced. Check back soon for the full walkthrough!
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
