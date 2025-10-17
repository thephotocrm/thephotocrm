import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Camera, Palette, Calendar, CreditCard, FolderPlus, Check, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Confetti from 'react-confetti';

type OnboardingStep = 'profile' | 'branding' | 'google' | 'stripe' | 'project' | 'complete';

type PhotographerData = {
  photographerName: string | null;
  businessName: string;
  logoUrl: string | null;
  brandPrimary: string | null;
  brandSecondary: string | null;
  googleCalendarRefreshToken: string | null;
  stripeConnectAccountId: string | null;
  onboardingCompletedAt: Date | null;
};

export default function OnboardingModal({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('profile');
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();

  // Form state
  const [photographerName, setPhotographerName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [brandPrimary, setBrandPrimary] = useState('#3b82f6');
  const [brandSecondary, setBrandSecondary] = useState('#8b5cf6');

  const { data: photographer } = useQuery<PhotographerData>({
    queryKey: ['/api/photographers/me'],
  });

  // Auto-populate form when photographer data loads
  useEffect(() => {
    if (photographer) {
      setPhotographerName(photographer.photographerName || '');
      setLogoUrl(photographer.logoUrl || '');
      setBrandPrimary(photographer.brandPrimary || '#3b82f6');
      setBrandSecondary(photographer.brandSecondary || '#8b5cf6');
    }
  }, [photographer]);

  const updatePhotographerMutation = useMutation({
    mutationFn: async (data: Partial<PhotographerData>) => {
      return apiRequest('PATCH', '/api/photographers/me', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/photographers/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/photographer'] });
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/photographers/me/complete-onboarding');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/photographers/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/photographer'] });
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
        onOpenChange(false);
      }, 3000);
    },
  });

  const dismissOnboardingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/photographers/me/dismiss-onboarding');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/photographers/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/photographer'] });
      onOpenChange(false);
    },
  });

  // Google Calendar connection
  const connectCalendarMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/google-calendar", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to get auth URL");
      const data = await response.json();
      return data;
    }
  });

  const handleConnectCalendar = () => {
    // Pre-open popup synchronously from user click (mobile-safe)
    const popup = window.open('', '_blank', 'width=500,height=600');
    
    connectCalendarMutation.mutate(undefined, {
      onSuccess: (data) => {
        if (data.authUrl && popup) {
          popup.location.href = data.authUrl;
          
          // Poll for connection status
          const pollInterval = setInterval(async () => {
            const result = await queryClient.refetchQueries({ 
              queryKey: ['/api/photographers/me'] 
            });
            const photographerData = result[0]?.data as PhotographerData | undefined;
            
            if (photographerData?.googleCalendarRefreshToken) {
              clearInterval(pollInterval);
              if (popup && !popup.closed) {
                popup.close();
              }
              toast({
                title: "Google Calendar Connected!",
                description: "Your calendar integration is now active.",
              });
            }
          }, 2000);
          
          // Stop polling after 5 minutes
          setTimeout(() => {
            clearInterval(pollInterval);
            if (popup && !popup.closed) {
              popup.close();
            }
          }, 5 * 60 * 1000);
        } else if (popup) {
          popup.close();
        }
      },
      onError: () => {
        if (popup && !popup.closed) {
          popup.close();
        }
        toast({
          title: "Connection Failed",
          description: "Failed to connect Google Calendar. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  const handleSaveProfile = async () => {
    await updatePhotographerMutation.mutateAsync({
      photographerName: photographerName || null,
    });
    toast({ title: "Profile saved!" });
    setCurrentStep('branding');
  };

  const handleSaveBranding = async () => {
    await updatePhotographerMutation.mutateAsync({
      logoUrl: logoUrl || null,
      brandPrimary: brandPrimary || null,
      brandSecondary: brandSecondary || null,
    });
    toast({ title: "Branding saved!" });
    setCurrentStep('google');
  };

  const handleSkipToComplete = () => {
    setCurrentStep('complete');
  };

  const handleCompleteOnboarding = async () => {
    await completeOnboardingMutation.mutateAsync();
  };

  const handleDismiss = async () => {
    await dismissOnboardingMutation.mutateAsync();
  };

  const steps: { key: OnboardingStep; label: string; icon: any }[] = [
    { key: 'profile', label: 'Profile', icon: Camera },
    { key: 'branding', label: 'Branding', icon: Palette },
    { key: 'google', label: 'Google', icon: Calendar },
    { key: 'stripe', label: 'Payments', icon: CreditCard },
    { key: 'project', label: 'First Project', icon: FolderPlus },
  ];

  const stepIndex = steps.findIndex(s => s.key === currentStep);
  const progress = currentStep === 'complete' ? 100 : ((stepIndex + 1) / steps.length) * 100;

  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
    enabled: !!photographer
  });

  const isProfileComplete = !!photographer?.photographerName;
  const isBrandingComplete = !!(photographer?.logoUrl || photographer?.brandPrimary);
  const isGoogleComplete = !!photographer?.googleCalendarRefreshToken;
  const isStripeComplete = !!photographer?.stripeConnectAccountId;
  const isProjectComplete = projects.length > 0;

  return (
    <>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
        />
      )}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-onboarding">
          <DialogTitle className="sr-only">Onboarding Wizard</DialogTitle>
          <DialogDescription className="sr-only">Complete your photographer studio setup</DialogDescription>
          {currentStep !== 'complete' ? (
            <>
              {/* Header */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold" data-testid="text-onboarding-title">
                    Welcome to ThePhotoCRM! 🎉
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleDismiss}
                    data-testid="button-dismiss-onboarding"
                  >
                    Skip for now
                  </Button>
                </div>
                <p className="text-muted-foreground" data-testid="text-onboarding-subtitle">
                  Let's get your studio set up so you can book your next client in minutes.
                </p>
                <Progress value={progress} className="h-2" data-testid="progress-onboarding" />
                
                {/* Step indicators */}
                <div className="flex justify-between items-center gap-2">
                  {steps.map((step, idx) => {
                    const Icon = step.icon;
                    const isActive = step.key === currentStep;
                    const isPast = idx < stepIndex;
                    let isComplete = false;
                    
                    if (step.key === 'profile') isComplete = isProfileComplete;
                    if (step.key === 'branding') isComplete = isBrandingComplete;
                    if (step.key === 'google') isComplete = isGoogleComplete;
                    if (step.key === 'stripe') isComplete = isStripeComplete;
                    if (step.key === 'project') isComplete = isProjectComplete;
                    
                    return (
                      <div 
                        key={step.key} 
                        className={`flex flex-col items-center gap-1 flex-1 ${isActive ? 'opacity-100' : 'opacity-50'}`}
                        data-testid={`step-indicator-${step.key}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isComplete ? 'bg-green-500 text-white' :
                          isActive ? 'bg-primary text-primary-foreground' : 
                          isPast ? 'bg-muted text-muted-foreground' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {isComplete ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                        </div>
                        <span className="text-xs text-center">{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t pt-6 mt-6">
                {/* Profile Step */}
                {currentStep === 'profile' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2" data-testid="text-step-profile-title">Tell us about yourself</h3>
                      <p className="text-sm text-muted-foreground">This personalizes your automated messages to clients.</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="photographerName">Your Name</Label>
                        <Input
                          id="photographerName"
                          placeholder="e.g., Sarah Johnson"
                          value={photographerName}
                          onChange={(e) => setPhotographerName(e.target.value)}
                          data-testid="input-photographer-name"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Used in email signatures and automated messages
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSaveProfile}
                          disabled={!photographerName.trim()}
                          className="flex-1"
                          data-testid="button-save-profile"
                        >
                          Continue
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => setCurrentStep('branding')}
                          data-testid="button-skip-profile"
                        >
                          Skip
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Branding Step */}
                {currentStep === 'branding' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2" data-testid="text-step-branding-title">Make it yours</h3>
                      <p className="text-sm text-muted-foreground">Add your logo and brand colors to personalize your client experience.</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="logoUrl">Logo URL (optional)</Label>
                        <Input
                          id="logoUrl"
                          placeholder="https://example.com/logo.png"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          data-testid="input-logo-url"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="brandPrimary">Primary Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="brandPrimary"
                              type="color"
                              value={brandPrimary}
                              onChange={(e) => setBrandPrimary(e.target.value)}
                              className="w-16 h-10 p-1 cursor-pointer"
                              data-testid="input-brand-primary"
                            />
                            <Input
                              value={brandPrimary}
                              onChange={(e) => setBrandPrimary(e.target.value)}
                              placeholder="#3b82f6"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="brandSecondary">Secondary Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="brandSecondary"
                              type="color"
                              value={brandSecondary}
                              onChange={(e) => setBrandSecondary(e.target.value)}
                              className="w-16 h-10 p-1 cursor-pointer"
                              data-testid="input-brand-secondary"
                            />
                            <Input
                              value={brandSecondary}
                              onChange={(e) => setBrandSecondary(e.target.value)}
                              placeholder="#8b5cf6"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSaveBranding}
                          className="flex-1"
                          data-testid="button-save-branding"
                        >
                          Continue
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => setCurrentStep('google')}
                          data-testid="button-skip-branding"
                        >
                          Skip
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Google Integration Step */}
                {currentStep === 'google' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2" data-testid="text-step-google-title">Connect Google Calendar</h3>
                      <p className="text-sm text-muted-foreground">Sync your calendar and enable email sending through Gmail.</p>
                    </div>
                    <div className="bg-muted p-4 rounded-lg space-y-3">
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">Benefits of connecting:</p>
                          <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                            <li>• Automatic calendar syncing</li>
                            <li>• Send emails through Gmail</li>
                            <li>• Create Google Meet links</li>
                            <li>• Track client appointments</li>
                          </ul>
                        </div>
                      </div>
                      {isGoogleComplete ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <Check className="w-5 h-5" />
                          <span className="font-medium">Google Calendar connected!</span>
                        </div>
                      ) : (
                        <Button 
                          onClick={handleConnectCalendar}
                          variant="outline"
                          className="w-full"
                          data-testid="button-connect-google"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Connect Google Calendar
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => setCurrentStep('stripe')}
                        className="flex-1"
                        data-testid="button-continue-google"
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                )}

                {/* Stripe Integration Step */}
                {currentStep === 'stripe' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2" data-testid="text-step-stripe-title">Connect Stripe Payments</h3>
                      <p className="text-sm text-muted-foreground">Accept payments and deposits from clients seamlessly.</p>
                    </div>
                    <div className="bg-muted p-4 rounded-lg space-y-3">
                      <div className="flex items-start gap-3">
                        <CreditCard className="w-5 h-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">Benefits of connecting:</p>
                          <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                            <li>• Accept credit card payments</li>
                            <li>• Automated invoicing & receipts</li>
                            <li>• Track deposits & balances</li>
                            <li>• Secure payment processing</li>
                          </ul>
                        </div>
                      </div>
                      {isStripeComplete ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <Check className="w-5 h-5" />
                          <span className="font-medium">Stripe connected!</span>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => window.location.href = '/api/stripe/connect'}
                          variant="outline"
                          className="w-full"
                          data-testid="button-connect-stripe"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Connect Stripe
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => setCurrentStep('project')}
                        className="flex-1"
                        data-testid="button-continue-stripe"
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                )}

                {/* First Project Step */}
                {currentStep === 'project' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2" data-testid="text-step-project-title">You're almost done!</h3>
                      <p className="text-sm text-muted-foreground">Ready to add your first client and start managing projects?</p>
                    </div>
                    <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 p-6 rounded-lg space-y-3 text-center">
                      <FolderPlus className="w-12 h-12 mx-auto text-primary" />
                      <p className="font-medium">Your CRM is ready to use!</p>
                      <p className="text-sm text-muted-foreground">
                        Head to the Projects page to add your first client, or explore the dashboard to see all features.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSkipToComplete}
                        className="flex-1"
                        data-testid="button-finish-onboarding"
                      >
                        Finish Setup
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Completion Screen
            <div className="py-12 text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold" data-testid="text-completion-title">
                  You're all set! 🎉
                </h2>
                <p className="text-muted-foreground text-lg">
                  Your photography CRM is ready to help you book more clients and streamline your workflow.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={() => window.location.href = '/projects'}
                  size="lg"
                  data-testid="button-add-first-client"
                >
                  <FolderPlus className="w-5 h-5 mr-2" />
                  Add Your First Client
                </Button>
                <Button 
                  onClick={handleCompleteOnboarding}
                  variant="outline"
                  size="lg"
                  data-testid="button-explore-dashboard"
                >
                  Explore Dashboard
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
