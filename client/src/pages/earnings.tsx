import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  CreditCard, 
  Clock, 
  TrendingUp, 
  Zap, 
  Download,
  AlertCircle,
  CheckCircle,
  XCircle 
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function formatCurrency(cents: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(cents / 100);
}

function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function getStatusBadge(status: string) {
  const variants: Record<string, { variant: any; icon: any; text: string }> = {
    pending: { variant: "secondary", icon: Clock, text: "Pending" },
    transferred: { variant: "default", icon: CheckCircle, text: "Transferred" },
    paid: { variant: "default", icon: CheckCircle, text: "Paid" },
    failed: { variant: "destructive", icon: XCircle, text: "Failed" },
    cancelled: { variant: "outline", icon: XCircle, text: "Cancelled" },
  };
  
  const config = variants[status] || variants.pending;
  const Icon = config.icon;
  
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {config.text}
    </Badge>
  );
}

export default function Earnings() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("standard");

  // Redirect to login if not authenticated
  if (!loading && !user) {
    setLocation("/login");
    return null;
  }

  // Prevent flash of protected content
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Fetch balance data
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ["/api/stripe-connect/balance"],
    enabled: !!user
  });

  // Fetch earnings history
  const { data: earnings, isLoading: earningsLoading } = useQuery({
    queryKey: ["/api/stripe-connect/earnings"],
    enabled: !!user
  });

  // Fetch payout history
  const { data: payouts, isLoading: payoutsLoading } = useQuery({
    queryKey: ["/api/stripe-connect/payouts"],
    enabled: !!user
  });

  // Fetch Stripe Connect status
  const { data: stripeStatus } = useQuery({
    queryKey: ["/api/stripe-connect/account-status"],
    enabled: !!user
  });

  // Create payout mutation
  const createPayoutMutation = useMutation({
    mutationFn: async (data: { amountCents: number; method: string }) => {
      return await apiRequest("POST", "/api/stripe-connect/create-payout", data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe-connect/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stripe-connect/payouts"] });
      setPayoutDialogOpen(false);
      setPayoutAmount("");
      toast({
        title: "Payout Created",
        description: data.message || "Your payout has been initiated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Payout Failed",
        description: error.message || "Failed to create payout. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleCreatePayout = () => {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payout amount.",
        variant: "destructive"
      });
      return;
    }

    const amountCents = Math.round(amount * 100);
    const availableCents = balance?.availableCents || 0;

    if (amountCents > availableCents) {
      toast({
        title: "Insufficient Balance",
        description: `You can only request up to ${formatCurrency(availableCents)}.`,
        variant: "destructive"
      });
      return;
    }

    createPayoutMutation.mutate({
      amountCents,
      method: payoutMethod
    });
  };

  const isStripeReady = stripeStatus?.onboardingCompleted && stripeStatus?.payoutEnabled;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="bg-card border-b border-border px-4 md:px-6 py-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SidebarTrigger 
                data-testid="button-menu-toggle" 
                className="absolute top-4 right-4 z-10 h-10 w-10 bg-primary/10 border border-primary/20 md:relative md:top-auto md:right-auto md:z-auto md:h-7 md:w-7 md:bg-transparent md:border-0" 
              />
              <div className="pr-12 md:pr-0">
                <h1 className="text-xl md:text-2xl font-semibold">Earnings</h1>
                <p className="text-sm md:text-base text-muted-foreground">Track your payments and request payouts</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stripe Connection Status */}
          {!isStripeReady && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Stripe Connect Setup Required
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Complete your Stripe Connect setup to start receiving payments. 
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-yellow-700 dark:text-yellow-300 underline ml-1"
                        onClick={() => setLocation("/settings?tab=integrations")}
                      >
                        Set up now
                      </Button>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-available-balance">
                  {balanceLoading ? "..." : formatCurrency(balance?.availableCents || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ready for payout
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Earnings</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-pending-balance">
                  {balanceLoading ? "..." : formatCurrency(balance?.pendingCents || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Being processed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Request Payout</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full" 
                      disabled={!isStripeReady || (balance?.availableCents || 0) === 0}
                      data-testid="button-request-payout"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Request Payout
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request Payout</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={payoutAmount}
                          onChange={(e) => setPayoutAmount(e.target.value)}
                          data-testid="input-payout-amount"
                        />
                        <p className="text-xs text-muted-foreground">
                          Available: {formatCurrency(balance?.availableCents || 0)}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Payout Method</Label>
                        <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                          <SelectTrigger data-testid="select-payout-method">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">
                              Standard (2-3 business days, no fee)
                            </SelectItem>
                            <SelectItem value="instant">
                              <div className="flex items-center">
                                <Zap className="w-4 h-4 mr-2" />
                                Instant (within minutes, 1% fee)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setPayoutDialogOpen(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreatePayout}
                          disabled={createPayoutMutation.isPending}
                          className="flex-1"
                          data-testid="button-confirm-payout"
                        >
                          {createPayoutMutation.isPending ? "Creating..." : "Create Payout"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <Tabs defaultValue="earnings" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="earnings" data-testid="tab-earnings">Earnings</TabsTrigger>
              <TabsTrigger value="payouts" data-testid="tab-payouts">Payouts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="earnings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Earnings History</CardTitle>
                </CardHeader>
                <CardContent>
                  {earningsLoading ? (
                    <div className="text-center py-8">Loading earnings...</div>
                  ) : !earnings || earnings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No earnings yet. Your payment history will appear here.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Platform Fee</TableHead>
                          <TableHead>Your Earnings</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(earnings as any[]).map((earning: any) => (
                          <TableRow key={earning.id}>
                            <TableCell>{formatDate(earning.createdAt)}</TableCell>
                            <TableCell>{formatCurrency(earning.totalAmountCents)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              -{formatCurrency(earning.platformFeeCents)}
                            </TableCell>
                            <TableCell className="font-medium text-green-600">
                              {formatCurrency(earning.photographerEarningsCents)}
                            </TableCell>
                            <TableCell>{getStatusBadge(earning.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="payouts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payout History</CardTitle>
                </CardHeader>
                <CardContent>
                  {payoutsLoading ? (
                    <div className="text-center py-8">Loading payouts...</div>
                  ) : !payouts || payouts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No payouts yet. Your payout history will appear here.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Fee</TableHead>
                          <TableHead>Arrival Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(payouts as any[]).map((payout: any) => (
                          <TableRow key={payout.id}>
                            <TableCell>{formatDate(payout.createdAt)}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(payout.amountCents)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {payout.isInstant && <Zap className="w-4 h-4 mr-1 text-yellow-500" />}
                                {payout.isInstant ? "Instant" : "Standard"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {payout.feeCents > 0 ? formatCurrency(payout.feeCents) : "—"}
                            </TableCell>
                            <TableCell>
                              {payout.arrivalDate ? formatDate(payout.arrivalDate) : "—"}
                            </TableCell>
                            <TableCell>{getStatusBadge(payout.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}