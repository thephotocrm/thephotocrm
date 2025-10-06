import { useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Camera } from "lucide-react";

export default function SmartFileSuccess() {
  const [, params] = useRoute("/smart-file/:token/success");

  const { data, isLoading } = useQuery<any>({
    queryKey: [`/api/public/smart-files/${params?.token}`],
    enabled: !!params?.token
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="loading-state">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full" data-testid="card-success">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-500" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl" data-testid="text-title">
            Payment Successful!
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-muted-foreground" data-testid="text-message">
              Thank you for your payment. Your deposit has been processed successfully.
            </p>
            <p className="text-muted-foreground">
              {data?.photographer?.businessName} will be in touch soon with next steps for your {data?.project?.projectType?.toLowerCase()} project.
            </p>
          </div>

          {data?.project && (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Project Details
              </h3>
              <div className="text-left space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project:</span>
                  <span className="font-medium" data-testid="text-project-title">
                    {data.project.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium" data-testid="text-project-type">
                    {data.project.projectType}
                  </span>
                </div>
                {data.projectSmartFile?.depositCents && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deposit Paid:</span>
                    <span className="font-medium text-green-600 dark:text-green-500" data-testid="text-deposit-amount">
                      ${(data.projectSmartFile.depositCents / 100).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              You'll receive a confirmation email shortly with your payment receipt and next steps.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Camera className="w-4 h-4" />
              <span data-testid="text-photographer-name">
                {data?.photographer?.businessName}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
