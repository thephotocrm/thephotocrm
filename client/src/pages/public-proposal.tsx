import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Camera, 
  FileText, 
  DollarSign, 
  Calendar,
  CheckCircle,
  Pen,
  CreditCard,
  Download,
  Mail,
  Phone
} from "lucide-react";
import type { Estimate, Client, Photographer } from "@shared/schema";

interface ProposalWithRelations extends Estimate {
  items: Array<{
    id: string;
    name: string;
    description?: string;
    qty: number;
    unitCents: number;
    lineTotalCents: number;
    orderIndex: number;
  }>;
  client: Client;
  photographer: Photographer;
}

export default function PublicProposal() {
  const [, params] = useRoute("/public/proposals/:token");
  const { toast } = useToast();
  const [signedByName, setSignedByName] = useState("");
  const [signedByEmail, setSignedByEmail] = useState("");
  const [isSignatureValid, setIsSignatureValid] = useState(false);

  const { data: proposal, isLoading } = useQuery<ProposalWithRelations>({
    queryKey: [`/public/proposals/${params?.token}`],
    enabled: !!params?.token
  });

  const signProposalMutation = useMutation({
    mutationFn: async (signatureData: any) => {
      await apiRequest("POST", `/public/proposals/${params?.token}/sign`, signatureData);
    },
    onSuccess: () => {
      toast({
        title: "Proposal signed",
        description: "Your signature has been recorded successfully.",
      });
      window.location.reload();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to sign proposal. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handlePayment = async (mode: 'DEPOSIT' | 'FULL') => {
    try {
      const response = await apiRequest("POST", `/public/proposals/${params?.token}/pay`, { mode });
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSignature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignatureValid) return;

    signProposalMutation.mutate({
      signedByName,
      signedByEmail,
      signatureImageUrl: null // For simplicity, not implementing actual signature drawing
    });
  };

  useEffect(() => {
    setIsSignatureValid(signedByName.trim().length > 0 && signedByEmail.trim().length > 0);
  }, [signedByName, signedByEmail]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Proposal Not Found</h2>
            <p className="text-muted-foreground">
              The proposal you're looking for doesn't exist or may have expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: proposal.currency || 'USD'
    });
  };

  const isExpired = proposal.validUntil && new Date(proposal.validUntil) < new Date();
  const isSigned = proposal.status === 'SIGNED' || proposal.signedAt;
  const canSign = !isSigned && !isExpired;
  const canPay = isSigned && (proposal.status === 'SIGNED' || proposal.status === 'PAID_PARTIAL');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Camera className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{proposal.photographer.businessName}</h1>
                <p className="text-sm text-muted-foreground">Wedding Photography</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Proposal</p>
              <p className="text-lg font-semibold">{proposal.title}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Status Banner */}
        {isExpired && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive font-medium">
              This proposal expired on {new Date(proposal.validUntil!).toLocaleDateString()}
            </p>
          </div>
        )}

        {isSigned && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <p className="text-green-800 font-medium">
                Signed by {proposal.signedByName} on {proposal.signedAt && new Date(proposal.signedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Client Information */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Proposal For</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {proposal.client.firstName} {proposal.client.lastName}
                    </h3>
                    {proposal.client.email && (
                      <div className="flex items-center mt-2">
                        <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">{proposal.client.email}</span>
                      </div>
                    )}
                    {proposal.client.phone && (
                      <div className="flex items-center mt-1">
                        <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">{proposal.client.phone}</span>
                      </div>
                    )}
                  </div>
                  {proposal.client.weddingDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Wedding Date</p>
                      <div className="flex items-center mt-1">
                        <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="font-medium">
                          {new Date(proposal.client.weddingDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Proposal Items */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Services & Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {proposal.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start py-3 border-b border-border last:border-b-0">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Qty: {item.qty} × {formatPrice(item.unitCents)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatPrice(item.lineTotalCents)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatPrice(proposal.subtotalCents || 0)}</span>
                  </div>
                  {(proposal.discountCents || 0) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatPrice(proposal.discountCents || 0)}</span>
                    </div>
                  )}
                  {(proposal.taxCents || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatPrice(proposal.taxCents || 0)}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(proposal.totalCents || 0)}</span>
                  </div>
                  {proposal.depositCents && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Deposit ({proposal.depositPercent}%)</span>
                      <span>{formatPrice(proposal.depositCents)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {proposal.notes && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{proposal.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Proposal Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <Badge variant={proposal.status === 'SIGNED' ? 'default' : 'secondary'}>
                      {proposal.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Created</span>
                    <span className="text-sm">{proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString() : 'Unknown'}</span>
                  </div>
                  {proposal.validUntil && (
                    <div className="flex items-center justify-between">
                      <span>Valid Until</span>
                      <span className="text-sm">{new Date(proposal.validUntil).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* E-Signature */}
            {canSign && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Pen className="w-5 h-5 mr-2" />
                    Electronic Signature
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignature} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signedByName">Full Name</Label>
                      <Input
                        id="signedByName"
                        value={signedByName}
                        onChange={(e) => setSignedByName(e.target.value)}
                        placeholder="Enter your full name"
                        required
                        data-testid="input-signature-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signedByEmail">Email Address</Label>
                      <Input
                        id="signedByEmail"
                        type="email"
                        value={signedByEmail}
                        onChange={(e) => setSignedByEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                        data-testid="input-signature-email"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      By signing, you agree to the terms and pricing outlined in this proposal.
                    </div>
                    <Button 
                      type="submit"
                      className="w-full"
                      disabled={!isSignatureValid || signProposalMutation.isPending}
                      data-testid="button-sign-proposal"
                    >
                      <Pen className="w-4 h-4 mr-2" />
                      {signProposalMutation.isPending ? "Signing..." : "Sign Proposal"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Payment */}
            {canPay && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Payment Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {proposal.depositCents && (
                    <Button 
                      className="w-full"
                      onClick={() => handlePayment('DEPOSIT')}
                      data-testid="button-pay-deposit"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay Deposit ({formatPrice(proposal.depositCents)})
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => handlePayment('FULL')}
                    data-testid="button-pay-full"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay in Full ({formatPrice(proposal.totalCents || 0)})
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full" data-testid="button-download-pdf">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" className="w-full" data-testid="button-print">
                  Print Proposal
                </Button>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Questions?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Have questions about this proposal? Get in touch with us.
                </p>
                {proposal.photographer.emailFromAddr && (
                  <div className="flex items-center mb-2">
                    <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                    <a 
                      href={`mailto:${proposal.photographer.emailFromAddr}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {proposal.photographer.emailFromAddr}
                    </a>
                  </div>
                )}
                <Button variant="outline" className="w-full mt-4" data-testid="button-contact">
                  Contact Us
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}