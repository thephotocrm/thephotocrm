import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InvalidPortal() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full px-6 py-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-3">
          Invalid Portal URL
        </h1>
        
        <p className="text-muted-foreground mb-6">
          The base portal domain cannot be accessed directly. Please use your photographer's specific portal link.
        </p>
        
        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-muted-foreground mb-2">
            Portal links look like this:
          </p>
          <code className="text-sm font-mono bg-background px-3 py-1 rounded border">
            yourphotographer.tpcportal.co
          </code>
        </div>
        
        <Button 
          onClick={() => window.location.href = 'https://thephotocrm.com'}
          data-testid="button-home"
        >
          Go to thePhotoCrm.com
        </Button>
      </div>
    </div>
  );
}
