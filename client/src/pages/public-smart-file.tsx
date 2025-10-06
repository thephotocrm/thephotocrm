import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Camera, 
  FileText, 
  DollarSign,
  CheckCircle,
  Loader2,
  Plus,
  Minus,
  CreditCard,
  Package as PackageIcon
} from "lucide-react";

interface SmartFilePage {
  id: string;
  pageType: "TEXT" | "PACKAGE" | "ADDON" | "PAYMENT";
  pageOrder: number;
  displayTitle: string;
  content: any;
}

interface SmartFileData {
  projectSmartFile: {
    id: string;
    status: string;
    token: string;
    depositPercent?: number;
    selectedPackages?: any;
    selectedAddOns?: any;
  };
  smartFile: {
    id: string;
    name: string;
    description?: string;
    defaultDepositPercent?: number;
    allowFullPayment?: boolean;
    pages: SmartFilePage[];
  };
  project: {
    id: string;
    title: string;
    projectType: string;
  };
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  photographer: {
    id: string;
    businessName: string;
    email?: string;
    phone?: string;
  };
}

interface SelectedPackage {
  pageId: string;
  packageId: string;
  name: string;
  priceCents: number;
}

interface SelectedAddOn {
  pageId: string;
  addOnId: string;
  name: string;
  priceCents: number;
  quantity: number;
}

export default function PublicSmartFile() {
  const [, params] = useRoute("/smart-file/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [selectedPackage, setSelectedPackage] = useState<SelectedPackage | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<Map<string, SelectedAddOn>>(new Map());
  const [selectionsRehydrated, setSelectionsRehydrated] = useState(false);

  const { data, isLoading, error } = useQuery<SmartFileData>({
    queryKey: [`/api/public/smart-files/${params?.token}`],
    enabled: !!params?.token,
    onSuccess: (data) => {
      // Rehydrate selections from database if already accepted
      if (!selectionsRehydrated && data.projectSmartFile.selectedPackages) {
        const pkgs = Array.isArray(data.projectSmartFile.selectedPackages) 
          ? data.projectSmartFile.selectedPackages 
          : JSON.parse(data.projectSmartFile.selectedPackages || '[]');
        
        if (pkgs.length > 0) {
          setSelectedPackage(pkgs[0]);
        }

        if (data.projectSmartFile.selectedAddOns) {
          const addOns = Array.isArray(data.projectSmartFile.selectedAddOns)
            ? data.projectSmartFile.selectedAddOns
            : JSON.parse(data.projectSmartFile.selectedAddOns || '[]');
          
          const addOnsMap = new Map<string, SelectedAddOn>();
          addOns.forEach((addOn: SelectedAddOn) => {
            const key = `${addOn.pageId}-${addOn.addOnId}`;
            addOnsMap.set(key, addOn);
          });
          setSelectedAddOns(addOnsMap);
        }

        setSelectionsRehydrated(true);
      }
    }
  });

  const acceptMutation = useMutation({
    mutationFn: async (acceptanceData: any) => {
      // First, accept the Smart File
      await apiRequest("PATCH", `/api/public/smart-files/${params?.token}/accept`, acceptanceData);
      
      // Then, create checkout session
      const response = await apiRequest("POST", `/api/public/smart-files/${params?.token}/create-checkout`, {});
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Smart File Accepted",
        description: "Your selections have been saved. Redirecting to checkout...",
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/public/smart-files/${params?.token}`] });
      
      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to proceed to checkout. Please try again.",
        variant: "destructive"
      });
    }
  });

  const { subtotal, depositAmount, total } = useMemo(() => {
    let subtotalCents = 0;
    
    if (selectedPackage) {
      subtotalCents += selectedPackage.priceCents;
    }
    
    selectedAddOns.forEach((addOn) => {
      subtotalCents += addOn.priceCents * addOn.quantity;
    });

    // Use nullish coalescing to respect 0% deposit configuration
    const depositPercent = data?.smartFile.defaultDepositPercent ?? data?.projectSmartFile.depositPercent ?? 50;
    const depositCents = Math.round(subtotalCents * (depositPercent / 100));

    return {
      subtotal: subtotalCents,
      depositAmount: depositCents,
      total: subtotalCents
    };
  }, [selectedPackage, selectedAddOns, data]);

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  };

  const handlePackageSelect = (page: SmartFilePage, pkg: any) => {
    setSelectedPackage({
      pageId: page.id,
      packageId: pkg.id,
      name: pkg.name,
      priceCents: pkg.priceCents
    });
  };

  const handleAddOnToggle = (page: SmartFilePage, addOn: any, checked: boolean) => {
    const key = `${page.id}-${addOn.id}`;
    const newAddOns = new Map(selectedAddOns);
    
    if (checked) {
      newAddOns.set(key, {
        pageId: page.id,
        addOnId: addOn.id,
        name: addOn.name,
        priceCents: addOn.priceCents,
        quantity: 1
      });
    } else {
      newAddOns.delete(key);
    }
    
    setSelectedAddOns(newAddOns);
  };

  const handleAddOnQuantityChange = (page: SmartFilePage, addOn: any, delta: number) => {
    const key = `${page.id}-${addOn.id}`;
    const newAddOns = new Map(selectedAddOns);
    const current = newAddOns.get(key);
    
    if (current) {
      const newQuantity = Math.max(1, Math.min(10, current.quantity + delta));
      newAddOns.set(key, { ...current, quantity: newQuantity });
      setSelectedAddOns(newAddOns);
    }
  };

  const handleAccept = () => {
    // Prevent duplicate submissions if already accepted
    if (isAccepted) {
      toast({
        title: "Already Accepted",
        description: "This Smart File has already been accepted.",
        variant: "default"
      });
      return;
    }

    if (!selectedPackage) {
      toast({
        title: "Package Required",
        description: "Please select a package before proceeding.",
        variant: "destructive"
      });
      return;
    }

    const selectedAddOnsArray = Array.from(selectedAddOns.values());

    acceptMutation.mutate({
      selectedPackages: [selectedPackage],
      selectedAddOns: selectedAddOnsArray,
      subtotalCents: subtotal,
      totalCents: total,
      depositCents: depositAmount
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="loading-state">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Smart File...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="error-state">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Smart File Not Found</h2>
            <p className="text-muted-foreground">
              This Smart File could not be found or may have expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedPages = [...(data.smartFile.pages || [])].sort((a, b) => a.pageOrder - b.pageOrder);
  const isAccepted = data.projectSmartFile.status === 'ACCEPTED';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Camera className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold" data-testid="text-photographer-name">
                  {data.photographer.businessName}
                </h1>
                <p className="text-sm text-muted-foreground">Photography Proposal</p>
              </div>
            </div>
            <Badge 
              variant={data.projectSmartFile.status === 'ACCEPTED' ? 'default' : 'secondary'}
              className="w-fit"
              data-testid={`badge-status-${data.projectSmartFile.status.toLowerCase()}`}
            >
              {data.projectSmartFile.status}
            </Badge>
          </div>
          
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-lg font-medium" data-testid="text-client-greeting">
              Hi {data.client.firstName}!
            </p>
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-project-title">
              {data.project.projectType} Proposal - {data.project.title}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {sortedPages.map((page, index) => (
              <div key={page.id} data-testid={`page-${page.pageType.toLowerCase()}-${index}`}>
                {/* TEXT Page */}
                {page.pageType === "TEXT" && (
                  <Card>
                    <CardHeader>
                      <CardTitle data-testid={`text-page-title-${index}`}>{page.displayTitle}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-muted-foreground" data-testid={`text-page-content-${index}`}>
                        {page.content.content || page.content.text}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* PACKAGE Page */}
                {page.pageType === "PACKAGE" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PackageIcon className="w-5 h-5" />
                        {page.displayTitle}
                      </CardTitle>
                      {page.content.description && (
                        <CardDescription>{page.content.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <RadioGroup
                        value={selectedPackage?.packageId || ""}
                        onValueChange={() => {}}
                        disabled={isAccepted}
                        className="space-y-4"
                      >
                        {page.content.packages?.map((pkg: any) => (
                          <div key={pkg.id} data-testid={`card-package-${pkg.id}`}>
                            <label
                              className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                selectedPackage?.packageId === pkg.id
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              } ${isAccepted ? 'cursor-not-allowed opacity-60' : ''}`}
                              onClick={() => !isAccepted && handlePackageSelect(page, pkg)}
                            >
                              <RadioGroupItem 
                                value={pkg.id} 
                                id={pkg.id}
                                disabled={isAccepted}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-base" data-testid={`text-package-name-${pkg.id}`}>
                                      {pkg.name}
                                    </h4>
                                    {pkg.description && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {pkg.description}
                                      </p>
                                    )}
                                    {pkg.features && pkg.features.length > 0 && (
                                      <ul className="mt-3 space-y-1">
                                        {pkg.features.map((feature: string, idx: number) => (
                                          <li key={idx} className="text-sm flex items-start gap-2">
                                            <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                            <span>{feature}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="font-semibold text-lg" data-testid={`text-package-price-${pkg.id}`}>
                                      {formatPrice(pkg.priceCents)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </label>
                          </div>
                        ))}
                      </RadioGroup>
                    </CardContent>
                  </Card>
                )}

                {/* ADDON Page */}
                {page.pageType === "ADDON" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        {page.displayTitle}
                      </CardTitle>
                      {page.content.description && (
                        <CardDescription>{page.content.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {page.content.addOns?.map((addOn: any) => {
                        const key = `${page.id}-${addOn.id}`;
                        const isSelected = selectedAddOns.has(key);
                        const quantity = selectedAddOns.get(key)?.quantity || 1;

                        return (
                          <div 
                            key={addOn.id} 
                            className={`p-4 rounded-lg border-2 transition-all ${
                              isSelected ? 'border-primary bg-primary/5' : 'border-border'
                            } ${isAccepted ? 'opacity-60' : ''}`}
                            data-testid={`card-addon-${addOn.id}`}
                          >
                            <div className="flex items-start gap-4">
                              <Checkbox
                                id={addOn.id}
                                checked={isSelected}
                                onCheckedChange={(checked) => 
                                  !isAccepted && handleAddOnToggle(page, addOn, checked as boolean)
                                }
                                disabled={isAccepted}
                                className="mt-1"
                                data-testid={`checkbox-addon-${addOn.id}`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <Label htmlFor={addOn.id} className="font-semibold text-base cursor-pointer">
                                      {addOn.name}
                                    </Label>
                                    {addOn.description && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {addOn.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="font-semibold" data-testid={`text-addon-price-${addOn.id}`}>
                                      {formatPrice(addOn.priceCents)}
                                    </p>
                                    {isSelected && (
                                      <p className="text-xs text-muted-foreground">
                                        each
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {isSelected && (
                                  <div className="flex items-center gap-2 mt-3">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAddOnQuantityChange(page, addOn, -1)}
                                      disabled={isAccepted || quantity <= 1}
                                      data-testid={`button-decrease-quantity-${addOn.id}`}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </Button>
                                    <Input
                                      type="number"
                                      value={quantity}
                                      readOnly
                                      className="w-16 text-center"
                                      data-testid={`input-quantity-${addOn.id}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAddOnQuantityChange(page, addOn, 1)}
                                      disabled={isAccepted || quantity >= 10}
                                      data-testid={`button-increase-quantity-${addOn.id}`}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                    <span className="text-sm text-muted-foreground ml-2">
                                      = {formatPrice(addOn.priceCents * quantity)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* PAYMENT Page */}
                {page.pageType === "PAYMENT" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        {page.displayTitle}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {page.content.terms && (
                        <div>
                          <h4 className="font-medium mb-2">Payment Terms</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {page.content.terms}
                          </p>
                        </div>
                      )}
                      
                      {page.content.depositInfo && (
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-medium mb-2">Deposit Information</h4>
                          <p className="text-sm text-muted-foreground">
                            {page.content.depositInfo}
                          </p>
                        </div>
                      )}

                      {page.content.acceptOnlinePayments !== undefined && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className={`w-5 h-5 ${page.content.acceptOnlinePayments ? 'text-green-600' : 'text-muted-foreground'}`} />
                          <span className="text-sm">
                            {page.content.acceptOnlinePayments 
                              ? 'Online payments accepted' 
                              : 'Contact for payment options'}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </div>

          {/* Price Calculator Sidebar - Desktop */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Price Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedPackage && (
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">Selected Package</p>
                          <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-selected-package">
                            {selectedPackage.name}
                          </p>
                        </div>
                        <p className="font-medium" data-testid="text-selected-package-price">
                          {formatPrice(selectedPackage.priceCents)}
                        </p>
                      </div>
                      <Separator />
                    </div>
                  )}

                  {selectedAddOns.size > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Selected Add-ons</p>
                      <div className="space-y-2">
                        {Array.from(selectedAddOns.values()).map((addOn) => (
                          <div key={`${addOn.pageId}-${addOn.addOnId}`} className="flex items-start justify-between text-sm">
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground">
                                {addOn.name} × {addOn.quantity}
                              </p>
                            </div>
                            <p className="text-sm">
                              {formatPrice(addOn.priceCents * addOn.quantity)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <Separator className="mt-2" />
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Subtotal</span>
                      <span className="font-medium" data-testid="text-subtotal">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                    
                    {depositAmount > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>
                          Deposit ({data.smartFile.defaultDepositPercent ?? data.projectSmartFile.depositPercent ?? 50}%)
                        </span>
                        <span data-testid="text-deposit">
                          {formatPrice(depositAmount)}
                        </span>
                      </div>
                    )}

                    <Separator />
                    
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span data-testid="text-total">
                        {formatPrice(total)}
                      </span>
                    </div>
                  </div>

                  {!isAccepted && (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleAccept}
                      disabled={!selectedPackage || acceptMutation.isPending}
                      data-testid="button-accept-proceed"
                    >
                      {acceptMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Accept & Proceed to Payment
                        </>
                      )}
                    </Button>
                  )}

                  {isAccepted && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="w-5 h-5" />
                        <p className="font-medium">Proposal Accepted</p>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        Your selections have been saved.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Price Calculator - Mobile Bottom Bar */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-lg z-20">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold" data-testid="text-total-mobile">
                  {formatPrice(total)}
                </p>
              </div>
              {!isAccepted && (
                <Button
                  onClick={handleAccept}
                  disabled={!selectedPackage || acceptMutation.isPending}
                  data-testid="button-accept-proceed-mobile"
                >
                  {acceptMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Accept & Pay
                    </>
                  )}
                </Button>
              )}
            </div>
            {selectedPackage && (
              <p className="text-xs text-muted-foreground">
                {selectedPackage.name}
                {selectedAddOns.size > 0 && ` + ${selectedAddOns.size} add-on${selectedAddOns.size > 1 ? 's' : ''}`}
              </p>
            )}
          </div>
        </div>

        {/* Add padding at bottom on mobile to prevent content being hidden behind fixed bar */}
        <div className="h-32 lg:hidden" />
      </div>
    </div>
  );
}
