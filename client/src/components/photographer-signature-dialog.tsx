import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileSignature, Loader2 } from "lucide-react";
import { SignaturePad } from "./signature-pad";
import { parseContractVariables } from "@shared/contractVariables";
import { useToast } from "@/hooks/use-toast";

interface PhotographerSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectSmartFileId: string;
  contractPage: any;
  projectData: {
    clientName: string;
    photographerName: string;
    projectTitle: string;
    projectType: string;
    eventDate?: string | null;
    selectedPackages?: string;
    selectedAddOns?: string;
    totalAmount?: string;
    depositAmount?: string;
    depositPercent?: string;
  };
  onSignatureComplete: () => void;
}

export function PhotographerSignatureDialog({
  open,
  onOpenChange,
  projectId,
  projectSmartFileId,
  contractPage,
  projectData,
  onSignatureComplete
}: PhotographerSignatureDialogProps) {
  const { toast } = useToast();
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const signMutation = useMutation({
    mutationFn: async (signatureDataUrl: string) => {
      await apiRequest(
        "POST",
        `/api/projects/${projectId}/smart-files/${projectSmartFileId}/photographer-sign`,
        { photographerSignatureUrl: signatureDataUrl }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "smart-files"] });
      toast({
        title: "Contract Signed",
        description: "Your signature has been saved successfully.",
      });
      onSignatureComplete();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save signature. Please try again.",
        variant: "destructive"
      });
    }
  });

  const parsedContract = parseContractVariables(
    contractPage?.content?.contractTemplate || '',
    {
      client_name: projectData.clientName,
      photographer_name: projectData.photographerName,
      project_date: projectData.eventDate || 'TBD',
      project_type: projectData.projectType,
      selected_packages: projectData.selectedPackages || 'Not selected',
      selected_addons: projectData.selectedAddOns || 'None',
      total_amount: projectData.totalAmount || '$0.00',
      deposit_amount: projectData.depositAmount || '$0.00',
      deposit_percent: projectData.depositPercent || '50%',
    }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <FileSignature className="w-6 h-6 text-primary" />
            <div>
              <DialogTitle>Sign Contract Before Sending</DialogTitle>
              <DialogDescription>
                This Smart File requires your signature before it can be sent to the client.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Contract Preview */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Contract Preview</h3>
            <Card>
              <CardContent className="p-6">
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                  {parsedContract}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Signature Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Your Signature</h3>
            {showSignaturePad ? (
              <SignaturePad
                onSave={(dataUrl) => signMutation.mutate(dataUrl)}
                onCancel={() => setShowSignaturePad(false)}
                label="Sign below"
              />
            ) : (
              <Button
                onClick={() => setShowSignaturePad(true)}
                variant="outline"
                className="w-full"
                data-testid="button-show-signature-pad"
              >
                <FileSignature className="w-4 h-4 mr-2" />
                Add Signature
              </Button>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={signMutation.isPending}
              data-testid="button-cancel-signing"
            >
              Cancel
            </Button>
          </div>

          {signMutation.isPending && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving signature...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
