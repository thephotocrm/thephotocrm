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
      
      // Check if payment is required
      const paymentPage = data?.smartFile.pages?.find((p: SmartFilePage) => p.pageType === 'PAYMENT');
      const acceptOnlinePayments = paymentPage?.content?.acceptOnlinePayments || false;
      const depositAmount = acceptanceData.depositCents || 0;
      
      // Only create checkout session if online payments are enabled AND deposit amount > 0
      if (acceptOnlinePayments && depositAmount > 0) {
        const response = await apiRequest("POST", `/api/public/smart-files/${params?.token}/create-checkout`, {});
        return { ...response, requiresPayment: true };
      }
      
      // No payment required - return success
      return { requiresPayment: false };
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/smart-files/${params?.token}`] });
      
      if (response.requiresPayment && response.checkoutUrl) {
        // Redirect to Stripe Checkout
        toast({
          title: "Smart File Accepted",
          description: "Redirecting to secure checkout...",
        });
        window.location.href = response.checkoutUrl;
      } else {
        // No payment required - redirect to success page
        toast({
          title: "Smart File Accepted",
          description: "Your selections have been saved successfully!",
        });
        setLocation(`/smart-file/${params?.token}/success`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept Smart File. Please try again.",
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
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b">
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <PackageIcon className="w-5 h-5 text-primary" />
                        </div>
                        {page.displayTitle}
                      </CardTitle>
                      {page.content.description && (
                        <CardDescription className="mt-2">{page.content.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-6">
                      <RadioGroup
                        value={selectedPackage?.packageId || ""}
                        onValueChange={() => {}}
                        disabled={isAccepted}
                        className="space-y-4"
                      >
                        {page.content.packages?.map((pkg: any, pkgIdx: number) => (
                          <div key={pkg.id} data-testid={`card-package-${pkg.id}`}>
                            <label
                              className={`
                                group relative block p-6 rounded-xl border-2 cursor-pointer
                                transition-all duration-300 ease-out
                                ${selectedPackage?.packageId === pkg.id
                                  ? 'border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-lg shadow-primary/20 scale-[1.02]'
                                  : 'border-border bg-card hover:border-primary/50 hover:shadow-md hover:scale-[1.01]'
                                }
                                ${isAccepted ? 'cursor-not-allowed opacity-60' : ''}
                              `}
                              onClick={() => !isAccepted && handlePackageSelect(page, pkg)}
                              style={{
                                animationDelay: `${pkgIdx * 100}ms`
                              }}
                            >
                              {/* Selection Indicator - Top Right Badge */}
                              {selectedPackage?.packageId === pkg.id && (
                                <div className="absolute top-4 right-4">
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-semibold shadow-lg">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Selected
                                  </div>
                                </div>
                              )}

                              <div className="flex items-start gap-4">
                                <RadioGroupItem 
                                  value={pkg.id} 
                                  id={pkg.id}
                                  disabled={isAccepted}
                                  className="mt-1.5 data-[state=checked]:border-primary data-[state=checked]:text-primary"
                                />
                                <div className="flex-1 min-w-0 pr-24">
                                  <h4 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors" data-testid={`text-package-name-${pkg.id}`}>
                                    {pkg.name}
                                  </h4>
                                  {pkg.description && (
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                      {pkg.description}
                                    </p>
                                  )}
                                  {pkg.features && pkg.features.length > 0 && (
                                    <ul className="mt-4 space-y-2.5">
                                      {pkg.features.map((feature: string, idx: number) => (
                                        <li key={idx} className="text-sm flex items-start gap-2.5">
                                          <div className="mt-0.5 p-0.5 bg-primary/10 rounded-full">
                                            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                                          </div>
                                          <span className="flex-1 leading-relaxed">{feature}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>

                              {/* Price Tag - Styled */}
                              <div className="absolute bottom-6 right-6">
                                <div className={`
                                  px-4 py-2.5 rounded-lg font-bold text-xl
                                  ${selectedPackage?.packageId === pkg.id
                                    ? 'bg-primary text-primary-foreground shadow-lg'
                                    : 'bg-muted text-foreground'
                                  }
                                  transition-all duration-300
                                `}>
                                  <span data-testid={`text-package-price-${pkg.id}`}>
                                    {formatPrice(pkg.priceCents)}
                                  </span>
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
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b">
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Plus className="w-5 h-5 text-primary" />
                        </div>
                        {page.displayTitle}
                      </CardTitle>
                      {page.content.description && (
                        <CardDescription className="mt-2">{page.content.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {page.content.addOns?.map((addOn: any, addonIdx: number) => {
                        const key = `${page.id}-${addOn.id}`;
                        const isSelected = selectedAddOns.has(key);
                        const quantity = selectedAddOns.get(key)?.quantity || 1;

                        return (
                          <div 
                            key={addOn.id} 
                            className={`
                              group relative p-5 rounded-xl border-2 cursor-pointer
                              transition-all duration-300 ease-out
                              ${isSelected 
                                ? 'border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-lg shadow-primary/10' 
                                : 'border-border bg-card hover:border-primary/30 hover:shadow-md'
                              } 
                              ${isAccepted ? 'opacity-60 cursor-not-allowed' : ''}
                            `}
                            data-testid={`card-addon-${addOn.id}`}
                            style={{
                              animationDelay: `${addonIdx * 80}ms`
                            }}
                            onClick={() => !isAccepted && !isSelected && handleAddOnToggle(page, addOn, true)}
                          >
                            <div className="flex items-start gap-4">
                              <Checkbox
                                id={addOn.id}
                                checked={isSelected}
                                onCheckedChange={(checked) => 
                                  !isAccepted && handleAddOnToggle(page, addOn, checked as boolean)
                                }
                                disabled={isAccepted}
                                className="mt-1.5 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                                data-testid={`checkbox-addon-${addOn.id}`}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                  <div className="flex-1">
                                    <Label 
                                      htmlFor={addOn.id} 
                                      className="font-bold text-base cursor-pointer group-hover:text-primary transition-colors"
                                    >
                                      {addOn.name}
                                    </Label>
                                    {addOn.description && (
                                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                                        {addOn.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <div className={`
                                      px-3 py-1.5 rounded-lg font-semibold text-sm
                                      ${isSelected 
                                        ? 'bg-primary/20 text-primary' 
                                        : 'bg-muted text-foreground'
                                      }
                                      transition-all duration-300
                                    `}>
                                      <span data-testid={`text-addon-price-${addOn.id}`}>
                                        {formatPrice(addOn.priceCents)}
                                      </span>
                                    </div>
                                    {!isSelected && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        per item
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {isSelected && (
                                  <div className="flex items-center gap-3 mt-4 p-3 bg-background/50 rounded-lg border border-primary/20" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddOnQuantityChange(page, addOn, -1)}
                                        disabled={isAccepted || quantity <= 1}
                                        data-testid={`button-decrease-quantity-${addOn.id}`}
                                        className="h-8 w-8 p-0 hover:bg-primary/10 hover:border-primary"
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                      </Button>
                                      <div className="w-14 text-center">
                                        <Input
                                          type="number"
                                          value={quantity}
                                          readOnly
                                          className="h-8 text-center font-semibold border-primary/30"
                                          data-testid={`input-quantity-${addOn.id}`}
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddOnQuantityChange(page, addOn, 1)}
                                        disabled={isAccepted || quantity >= 10}
                                        data-testid={`button-increase-quantity-${addOn.id}`}
                                        className="h-8 w-8 p-0 hover:bg-primary/10 hover:border-primary"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                    <div className="flex-1" />
                                    <div className="text-right">
                                      <p className="text-xs text-muted-foreground mb-0.5">Total</p>
                                      <p className="font-bold text-base text-primary">
                                        {formatPrice(addOn.priceCents * quantity)}
                                      </p>
                                    </div>
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
