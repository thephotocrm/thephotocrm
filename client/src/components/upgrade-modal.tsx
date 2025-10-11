import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, TrendingUp, Target, Zap, Heart, ImageIcon, Video } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="upgrade-modal">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-2xl">Unlock Premium Features</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Get access to powerful lead generation tools to grow your photography business faster.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Premium Features List */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-purple-500/10 mt-0.5">
                <TrendingUp className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Facebook Ads Integration</h4>
                <p className="text-sm text-muted-foreground">Run targeted ad campaigns directly from your CRM</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-blue-500/10 mt-0.5">
                <Target className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Google Ads Integration</h4>
                <p className="text-sm text-muted-foreground">Capture leads from Google Search and Display</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-pink-500/10 mt-0.5">
                <Heart className="w-4 h-4 text-pink-500" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Instagram Ads Integration</h4>
                <p className="text-sm text-muted-foreground">Reach engaged couples on Instagram</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-red-500/10 mt-0.5">
                <ImageIcon className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Pinterest Ads Integration</h4>
                <p className="text-sm text-muted-foreground">Connect with planning couples on Pinterest</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-slate-700/10 mt-0.5">
                <Video className="w-4 h-4 text-slate-700" />
              </div>
              <div>
                <h4 className="font-medium text-sm">TikTok Ads Integration</h4>
                <p className="text-sm text-muted-foreground">Reach Gen Z and millennial couples</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-green-500/10 mt-0.5">
                <Zap className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Advanced Analytics</h4>
                <p className="text-sm text-muted-foreground">Track ad performance and ROI in real-time</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-orange-500/10 mt-0.5">
                <Sparkles className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Priority Support</h4>
                <p className="text-sm text-muted-foreground">Get help when you need it most</p>
              </div>
            </div>
          </div>

          {/* Upgrade CTA */}
          <div className="pt-4 border-t">
            <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 rounded-lg p-4 mb-4">
              <p className="text-sm text-center">
                <span className="font-semibold">Special Offer:</span> Upgrade now and get your first month at{" "}
                <span className="font-bold text-purple-600">50% off</span>
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                className="flex-1"
                data-testid="upgrade-modal-close"
              >
                Maybe Later
              </Button>
              <Button 
                className="flex-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 transition-opacity"
                data-testid="upgrade-modal-upgrade"
              >
                Upgrade Now
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
