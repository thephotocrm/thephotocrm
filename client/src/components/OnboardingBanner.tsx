import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, Sparkles, Check } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

type OnboardingBannerProps = {
  photographer: {
    photographerName: string | null;
    logoUrl: string | null;
    brandPrimary: string | null;
    googleCalendarRefreshToken: string | null;
    stripeConnectAccountId: string | null;
    onboardingCompletedAt: Date | null;
    onboardingDismissed: boolean;
  };
  onOpenModal: () => void;
};

export default function OnboardingBanner({ photographer, onOpenModal }: OnboardingBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
    enabled: !!photographer
  });

  const dismissOnboardingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/photographers/me/dismiss-onboarding', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/photographers/me'] });
      setIsVisible(false);
    },
  });

  // Calculate completion - matches modal steps exactly
  const steps = [
    { name: 'Profile', completed: !!photographer.photographerName },
    { name: 'Branding', completed: !!photographer.logoUrl || !!photographer.brandPrimary },
    { name: 'Google', completed: !!photographer.googleCalendarRefreshToken },
    { name: 'Stripe', completed: !!photographer.stripeConnectAccountId },
    { name: 'Project', completed: projects.length > 0 },
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const totalSteps = steps.length;
  const progress = (completedSteps / totalSteps) * 100;

  if (!isVisible || photographer.onboardingDismissed || photographer.onboardingCompletedAt) {
    return null;
  }

  return (
    <div 
      className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border-b border-primary/20"
      data-testid="banner-onboarding"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm">Complete your studio setup</p>
                <span className="text-xs text-muted-foreground">
                  {completedSteps} of {totalSteps} steps complete
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={progress} className="h-1.5 flex-1 max-w-xs" />
                <div className="flex gap-1">
                  {steps.map((step, idx) => (
                    <div
                      key={idx}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        step.completed
                          ? 'bg-green-500 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                      title={step.name}
                    >
                      {step.completed ? <Check className="w-3 h-3" /> : idx + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onOpenModal}
              size="sm"
              data-testid="button-continue-setup"
            >
              Continue Setup
            </Button>
            <Button
              onClick={() => dismissOnboardingMutation.mutate()}
              size="sm"
              variant="ghost"
              data-testid="button-dismiss-banner"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
