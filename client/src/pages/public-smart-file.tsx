import { useState, useMemo, useEffect } from "react";
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
  Package as PackageIcon,
  FileSignature
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmbeddedPaymentForm } from "@/components/embedded-payment-form";
import { SignaturePad } from "@/components/signature-pad";
import { parseContractVariables } from "@shared/contractVariables";

type ImageContent = {
  url: string;
  borderRadius?: 'straight' | 'rounded';
  size?: 'small' | 'medium' | 'large';
};

interface SmartFilePage {
  id: string;
  pageType: "TEXT" | "PACKAGE" | "ADDON" | "CONTRACT" | "PAYMENT";
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
    clientSignatureUrl?: string;
    photographerSignatureUrl?: string;
    clientSignedAt?: string;
    photographerSignedAt?: string;
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

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState<SelectedPackage | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<Map<string, SelectedAddOn>>(new Map());
  const [selectionsRehydrated, setSelectionsRehydrated] = useState(false);
  const [showClientSignaturePad, setShowClientSignaturePad] = useState(false);
  const [clientSignature, setClientSignature] = useState<string | null>(null);

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

  // Fetch fresh package data to show latest name, description, and images
  const { data: freshPackages } = useQuery<any[]>({
    queryKey: [`/api/public/smart-files/${params?.token}/packages`],
    enabled: !!params?.token && !!data,
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Refetch when component mounts
  });

  // Fetch fresh add-on data to show latest name, description, and images
  const { data: freshAddOns } = useQuery<any[]>({
    queryKey: [`/api/public/smart-files/${params?.token}/add-ons`],
    enabled: !!params?.token && !!data,
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Refetch when component mounts
  });

  // Clamp currentPageIndex when pages change
  useEffect(() => {
    if (data && freshPackages && freshAddOns) {
      const mergedPages = getMergedPages();
      const sortedPages = [...mergedPages].sort((a, b) => a.pageOrder - b.pageOrder);
      if (sortedPages.length > 0 && currentPageIndex >= sortedPages.length) {
        setCurrentPageIndex(sortedPages.length - 1);
      }
    }
  }, [data, freshPackages, freshAddOns, currentPageIndex]);

  // Helper function to merge fresh package and add-on data with page snapshots
  const getMergedPages = () => {
    if (!data || !freshPackages || !freshAddOns) return data?.smartFile.pages || [];
    
    return data.smartFile.pages.map(page => {
      // Handle PACKAGE pages
      if (page.pageType === 'PACKAGE') {
        // Check if we have snapshot packages or just packageIds
        if (page.content.packages) {
          // Merge fresh package data with snapshot packages
          const mergedPackages = page.content.packages.map((snapshotPkg: any) => {
            const freshPkg = freshPackages.find(fp => fp.id === snapshotPkg.id);
            
            if (!freshPkg) return snapshotPkg; // Package might have been deleted
            
            // Use fresh data for name, description, and image, but keep snapshot price
            return {
              ...snapshotPkg,
              name: freshPkg.name,
              description: freshPkg.description,
              imageUrl: freshPkg.imageUrl
            };
          });

          return {
            ...page,
            content: {
              ...page.content,
              packages: mergedPackages
            }
          };
        } else if (page.content.packageIds) {
          // Convert packageIds to full package objects from fresh data
          const packages = page.content.packageIds
            .map((id: string) => freshPackages.find((pkg: any) => pkg.id === id))
            .filter(Boolean) // Remove any undefined values if package was deleted
            .map((pkg: any) => ({
              id: pkg.id,
              name: pkg.name,
              description: pkg.description,
              imageUrl: pkg.imageUrl,
              priceCents: pkg.basePriceCents,
              features: [] // No features in base package data
            }));

          return {
            ...page,
            content: {
              ...page.content,
              packages
            }
          };
        }
      }

      // Handle ADDON pages - convert addOnIds to full add-on objects
      if (page.pageType === 'ADDON' && page.content.addOnIds) {
        const addOns = page.content.addOnIds
          .map((id: string) => freshAddOns.find((addon: any) => addon.id === id))
          .filter(Boolean); // Remove any undefined values if add-on was deleted

        return {
          ...page,
          content: {
            ...page.content,
            addOns
          }
        };
      }

      return page;
    });
  };

  const paymentPage = data?.smartFile.pages?.find((p: SmartFilePage) => p.pageType === 'PAYMENT');

  const acceptMutation = useMutation({
    mutationFn: async (acceptanceData: any) => {
      // Accept the Smart File - this saves selections but doesn't create checkout
      await apiRequest("PATCH", `/api/public/smart-files/${params?.token}/accept`, acceptanceData);
      return { accepted: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/smart-files/${params?.token}`] });
      toast({
        title: "Proposal Accepted",
        description: "Your selections have been saved. Choose a payment option below.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept Smart File. Please try again.",
        variant: "destructive"
      });
    }
  });

  const saveSignatureMutation = useMutation({
    mutationFn: async (signatureData: { clientSignatureUrl: string }) => {
      await apiRequest("PATCH", `/api/public/smart-files/${params?.token}/sign`, signatureData);
      return { signed: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/smart-files/${params?.token}`] });
      setShowClientSignaturePad(false);
      toast({
        title: "Signature Saved",
        description: "Your signature has been recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save signature. Please try again.",
        variant: "destructive"
      });
    }
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async (paymentType: 'DEPOSIT' | 'FULL' | 'BALANCE') => {
      const response = await apiRequest("POST", `/api/public/smart-files/${params?.token}/create-checkout`, {
        paymentType
      });
      return response;
    },
    onSuccess: (response: any) => {
      if (response.checkoutUrl) {
        toast({
          title: "Redirecting to checkout",
          description: "Please complete your payment...",
        });
        window.location.href = response.checkoutUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout. Please try again.",
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

  const mergedPages = getMergedPages();
  const sortedPages = [...mergedPages].sort((a, b) => a.pageOrder - b.pageOrder);
  const isAccepted = data.projectSmartFile.status === 'ACCEPTED';

  // Check for contract page and signature requirements
  const contractPage = sortedPages.find(p => p.pageType === 'CONTRACT');
  const hasContractPage = !!contractPage;
  const requiresClientSignature = hasContractPage && contractPage.content.requireClientSignature !== false;
  const clientHasSigned = !!data.projectSmartFile.clientSignatureUrl;
  const paymentPageIndex = sortedPages.findIndex(p => p.pageType === 'PAYMENT');
  
  // Client must sign contract before accessing payment
  const canAccessPayment = !requiresClientSignature || clientHasSigned;

  // Get current page for single-page view
  const currentPage = sortedPages[currentPageIndex];
  const pageIndex = currentPageIndex;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Camera className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold" data-testid="text-photographer-name">
                {data.photographer.businessName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {data.project.projectType} Proposal - {data.project.title}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Main Content */}
          <div>
            {sortedPages.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No pages available</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Page Number Indicator */}
                <div className="flex justify-center mb-3">
                  <div className="text-sm font-medium text-muted-foreground bg-muted px-4 py-1.5 rounded-full">
                    Page {pageIndex + 1} of {sortedPages.length}
                  </div>
                </div>

                <div key={currentPage.id} data-testid={`page-${currentPage.pageType.toLowerCase()}-${pageIndex}`} className="relative">
                {/* TEXT Page */}
                {currentPage.pageType === "TEXT" && (
                  <>
                    {/* Hero Section */}
                    {currentPage.content.hero?.backgroundImage && (
                      <div className="mb-6">
                        <div 
                          className="relative w-full h-[400px] flex items-center justify-center bg-cover bg-center overflow-hidden"
                          style={{ backgroundImage: `url(${currentPage.content.hero.backgroundImage})` }}
                        >
                          <div className="absolute inset-0 bg-black/30" />
                          <div className="relative z-10 text-center text-white px-6 max-w-3xl">
                            {currentPage.content.hero.title && (
                              <h1 className="text-5xl font-bold mb-4">{currentPage.content.hero.title}</h1>
                            )}
                            {currentPage.content.hero.description && (
                              <p className="text-xl">{currentPage.content.hero.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Content - no Card wrapper if there's a hero */}
                    {currentPage.content.hero?.backgroundImage ? (
                      <div className="space-y-6">
                        {currentPage.content.sections && currentPage.content.sections.length > 0 ? (
                        // Sections-based rendering
                        currentPage.content.sections.map((section: any, secIdx: number) => (
                          <div key={secIdx}>
                            {section.columns === 1 ? (
                              <div className="space-y-4">
                                {section.blocks.map((block: any, blockIdx: number) => (
                                  <div key={blockIdx}>
                                    {block.type === 'HEADING' && block.content && (
                                      <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                    )}
                                    {block.type === 'TEXT' && block.content && (
                                      <p className="text-muted-foreground whitespace-pre-wrap">{block.content}</p>
                                    )}
                                    {block.type === 'SPACER' && (
                                      <div className="py-6" />
                                    )}
                                    {block.type === 'IMAGE' && block.content && (() => {
                                      const imageData: ImageContent = typeof block.content === 'string' 
                                        ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                        : block.content;
                                      const isRounded = imageData.borderRadius === 'rounded';
                                      const sizeClass = imageData.size === 'small' ? 'h-[100px] w-[100px]' 
                                        : imageData.size === 'large' ? 'h-[300px] w-[300px]' 
                                        : 'h-[150px] w-[150px]';
                                      
                                      if (isRounded) {
                                        return (
                                          <div className={cn("rounded-full overflow-hidden border border-border mx-auto", sizeClass)}>
                                            <img 
                                              src={imageData.url} 
                                              alt="" 
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                        );
                                      }
                                      
                                      const maxHeightClass = imageData.size === 'small' ? 'max-h-[100px]' 
                                        : imageData.size === 'large' ? 'max-h-[300px]' 
                                        : 'max-h-[150px]';
                                      return (
                                        <img 
                                          src={imageData.url} 
                                          alt="" 
                                          className={cn("w-full rounded-none object-contain border border-border", maxHeightClass)} 
                                        />
                                      );
                                    })()}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-4">
                                  {section.blocks.filter((b: any) => b.column === 0).map((block: any, blockIdx: number) => (
                                    <div key={blockIdx}>
                                      {block.type === 'HEADING' && block.content && (
                                        <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                      )}
                                      {block.type === 'TEXT' && block.content && (
                                        <p className="text-muted-foreground whitespace-pre-wrap">{block.content}</p>
                                      )}
                                      {block.type === 'SPACER' && (
                                        <div className="py-6" />
                                      )}
                                      {block.type === 'IMAGE' && block.content && (() => {
                                        const imageData: ImageContent = typeof block.content === 'string' 
                                          ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                          : block.content;
                                        const isRounded = imageData.borderRadius === 'rounded';
                                        const sizeClass = imageData.size === 'small' ? 'h-[100px] w-[100px]' 
                                          : imageData.size === 'large' ? 'h-[300px] w-[300px]' 
                                          : 'h-[150px] w-[150px]';
                                        
                                        if (isRounded) {
                                          return (
                                            <div className={cn("rounded-full overflow-hidden border-4 border-border shadow-lg mx-auto", sizeClass)}>
                                              <img 
                                                src={imageData.url} 
                                                alt="" 
                                                className="w-full h-full object-cover"
                                              />
                                            </div>
                                          );
                                        }
                                        
                                        const maxHeightClass = imageData.size === 'small' ? 'max-h-[100px]' 
                                          : imageData.size === 'large' ? 'max-h-[300px]' 
                                          : 'max-h-[150px]';
                                        return (
                                          <img 
                                            src={imageData.url} 
                                            alt="" 
                                            className={cn("w-full rounded-none object-contain border-2 border-border shadow-md", maxHeightClass)} 
                                          />
                                        );
                                      })()}
                                    </div>
                                  ))}
                                </div>
                                <div className="space-y-4">
                                  {section.blocks.filter((b: any) => b.column === 1).map((block: any, blockIdx: number) => (
                                    <div key={blockIdx}>
                                      {block.type === 'HEADING' && block.content && (
                                        <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                      )}
                                      {block.type === 'TEXT' && block.content && (
                                        <p className="text-muted-foreground whitespace-pre-wrap">{block.content}</p>
                                      )}
                                      {block.type === 'SPACER' && (
                                        <div className="py-6" />
                                      )}
                                      {block.type === 'IMAGE' && block.content && (() => {
                                        const imageData: ImageContent = typeof block.content === 'string' 
                                          ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                          : block.content;
                                        const isRounded = imageData.borderRadius === 'rounded';
                                        const sizeClass = imageData.size === 'small' ? 'h-[100px] w-[100px]' 
                                          : imageData.size === 'large' ? 'h-[300px] w-[300px]' 
                                          : 'h-[150px] w-[150px]';
                                        
                                        if (isRounded) {
                                          return (
                                            <div className={cn("rounded-full overflow-hidden border-4 border-border shadow-lg mx-auto", sizeClass)}>
                                              <img 
                                                src={imageData.url} 
                                                alt="" 
                                                className="w-full h-full object-cover"
                                              />
                                            </div>
                                          );
                                        }
                                        
                                        const maxHeightClass = imageData.size === 'small' ? 'max-h-[100px]' 
                                          : imageData.size === 'large' ? 'max-h-[300px]' 
                                          : 'max-h-[150px]';
                                        return (
                                          <img 
                                            src={imageData.url} 
                                            alt="" 
                                            className={cn("w-full rounded-none object-contain border-2 border-border shadow-md", maxHeightClass)} 
                                          />
                                        );
                                      })()}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : currentPage.content.blocks && currentPage.content.blocks.length > 0 ? (
                        // Legacy blocks format
                        <div className="space-y-4">
                          {currentPage.content.blocks.map((block: any, blockIdx: number) => (
                            <div key={blockIdx}>
                              {block.type === 'HEADING' && block.content && (
                                <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                              )}
                              {block.type === 'TEXT' && block.content && (
                                <p className="text-muted-foreground whitespace-pre-wrap">{block.content}</p>
                              )}
                              {block.type === 'SPACER' && (
                                <div className="py-6" />
                              )}
                              {block.type === 'IMAGE' && block.content && (
                                <img src={block.content} alt="" className="w-full max-h-[150px] object-contain rounded-lg" />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Legacy heading/content format
                        <p className="whitespace-pre-wrap text-muted-foreground" data-testid={`text-page-content-${pageIndex}`}>
                          {currentPage.content.content || currentPage.content.text}
                        </p>
                      )}
                      </div>
                    ) : (
                      <Card>
                        <CardHeader>
                          <CardTitle data-testid={`text-page-title-${pageIndex}`}>{currentPage.displayTitle}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {currentPage.content.sections && currentPage.content.sections.length > 0 ? (
                            // Sections-based rendering
                            currentPage.content.sections.map((section: any, secIdx: number) => (
                              <div key={secIdx}>
                                {section.columns === 1 ? (
                                  <div className="space-y-4">
                                    {section.blocks.map((block: any, blockIdx: number) => (
                                      <div key={blockIdx}>
                                        {block.type === 'HEADING' && block.content && (
                                          <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                        )}
                                        {block.type === 'TEXT' && block.content && (
                                          <p className="text-muted-foreground whitespace-pre-wrap">{block.content}</p>
                                        )}
                                        {block.type === 'SPACER' && (
                                          <div className="py-6" />
                                        )}
                                        {block.type === 'IMAGE' && block.content && (() => {
                                          const imageData: ImageContent = typeof block.content === 'string' 
                                            ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                            : block.content;
                                          const isRounded = imageData.borderRadius === 'rounded';
                                          const sizeClass = imageData.size === 'small' ? 'h-[100px] w-[100px]' 
                                            : imageData.size === 'large' ? 'h-[300px] w-[300px]' 
                                            : 'h-[150px] w-[150px]';
                                          
                                          if (isRounded) {
                                            return (
                                              <div className={cn("rounded-full overflow-hidden border border-border mx-auto", sizeClass)}>
                                                <img 
                                                  src={imageData.url} 
                                                  alt="" 
                                                  className="w-full h-full object-cover"
                                                />
                                              </div>
                                            );
                                          }
                                          
                                          const maxHeightClass = imageData.size === 'small' ? 'max-h-[100px]' 
                                            : imageData.size === 'large' ? 'max-h-[300px]' 
                                            : 'max-h-[150px]';
                                          return (
                                            <img 
                                              src={imageData.url} 
                                              alt="" 
                                              className={cn("w-full rounded-none object-contain border border-border", maxHeightClass)} 
                                            />
                                          );
                                        })()}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                      {section.blocks.filter((b: any) => b.column === 0).map((block: any, blockIdx: number) => (
                                        <div key={blockIdx}>
                                          {block.type === 'HEADING' && block.content && (
                                            <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                          )}
                                          {block.type === 'TEXT' && block.content && (
                                            <p className="text-muted-foreground whitespace-pre-wrap">{block.content}</p>
                                          )}
                                          {block.type === 'SPACER' && (
                                            <div className="py-6" />
                                          )}
                                          {block.type === 'IMAGE' && block.content && (() => {
                                            const imageData: ImageContent = typeof block.content === 'string' 
                                              ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                              : block.content;
                                            const isRounded = imageData.borderRadius === 'rounded';
                                            const sizeClass = imageData.size === 'small' ? 'h-[100px] w-[100px]' 
                                              : imageData.size === 'large' ? 'h-[300px] w-[300px]' 
                                              : 'h-[150px] w-[150px]';
                                            
                                            if (isRounded) {
                                              return (
                                                <div className={cn("rounded-full overflow-hidden border-4 border-border shadow-lg mx-auto", sizeClass)}>
                                                  <img 
                                                    src={imageData.url} 
                                                    alt="" 
                                                    className="w-full h-full object-cover"
                                                  />
                                                </div>
                                              );
                                            }
                                            
                                            const maxHeightClass = imageData.size === 'small' ? 'max-h-[100px]' 
                                              : imageData.size === 'large' ? 'max-h-[300px]' 
                                              : 'max-h-[150px]';
                                            return (
                                              <img 
                                                src={imageData.url} 
                                                alt="" 
                                                className={cn("w-full rounded-none object-contain border-2 border-border shadow-md", maxHeightClass)} 
                                              />
                                            );
                                          })()}
                                        </div>
                                      ))}
                                    </div>
                                    <div className="space-y-4">
                                      {section.blocks.filter((b: any) => b.column === 1).map((block: any, blockIdx: number) => (
                                        <div key={blockIdx}>
                                          {block.type === 'HEADING' && block.content && (
                                            <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                          )}
                                          {block.type === 'TEXT' && block.content && (
                                            <p className="text-muted-foreground whitespace-pre-wrap">{block.content}</p>
                                          )}
                                          {block.type === 'SPACER' && (
                                            <div className="py-6" />
                                          )}
                                          {block.type === 'IMAGE' && block.content && (() => {
                                            const imageData: ImageContent = typeof block.content === 'string' 
                                              ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                              : block.content;
                                            const isRounded = imageData.borderRadius === 'rounded';
                                            const sizeClass = imageData.size === 'small' ? 'h-[100px] w-[100px]' 
                                              : imageData.size === 'large' ? 'h-[300px] w-[300px]' 
                                              : 'h-[150px] w-[150px]';
                                            
                                            if (isRounded) {
                                              return (
                                                <div className={cn("rounded-full overflow-hidden border-4 border-border shadow-lg mx-auto", sizeClass)}>
                                                  <img 
                                                    src={imageData.url} 
                                                    alt="" 
                                                    className="w-full h-full object-cover"
                                                  />
                                                </div>
                                              );
                                            }
                                            
                                            const maxHeightClass = imageData.size === 'small' ? 'max-h-[100px]' 
                                              : imageData.size === 'large' ? 'max-h-[300px]' 
                                              : 'max-h-[150px]';
                                            return (
                                              <img 
                                                src={imageData.url} 
                                                alt="" 
                                                className={cn("w-full rounded-none object-contain border-2 border-border shadow-md", maxHeightClass)} 
                                              />
                                            );
                                          })()}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          ) : currentPage.content.blocks && currentPage.content.blocks.length > 0 ? (
                            // Legacy blocks format
                            <div className="space-y-4">
                              {currentPage.content.blocks.map((block: any, blockIdx: number) => (
                                <div key={blockIdx}>
                                  {block.type === 'HEADING' && block.content && (
                                    <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                  )}
                                  {block.type === 'TEXT' && block.content && (
                                    <p className="text-muted-foreground whitespace-pre-wrap">{block.content}</p>
                                  )}
                                  {block.type === 'SPACER' && (
                                    <div className="py-6" />
                                  )}
                                  {block.type === 'IMAGE' && block.content && (
                                    <img src={block.content} alt="" className="w-full max-h-[150px] object-contain rounded-lg" />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            // Legacy heading/content format
                            <p className="whitespace-pre-wrap text-muted-foreground" data-testid={`text-page-content-${pageIndex}`}>
                              {currentPage.content.content || currentPage.content.text}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}

                {/* PACKAGE Page */}
                {currentPage.pageType === "PACKAGE" && (
                  <div className="space-y-6 px-4 md:px-0">
                    {currentPage.content.heading && (
                      <h3 className="text-4xl font-bold mb-4 text-center">{currentPage.content.heading}</h3>
                    )}
                    {currentPage.content.description && (
                      <p className="text-xl text-muted-foreground mb-6 leading-relaxed text-center">{currentPage.content.description}</p>
                    )}
                    <div className="space-y-4">
                        {currentPage.content.packages?.map((pkg: any) => {
                          const isSelected = selectedPackage?.packageId === pkg.id;
                          
                          return (
                          <Card 
                            key={pkg.id} 
                            className={`overflow-hidden border-2 transition-all duration-300 max-w-[800px] mx-auto ${
                              isSelected
                                ? 'border-primary shadow-lg'
                                : 'hover:border-primary/40 hover:shadow-lg'
                            } ${isAccepted ? 'cursor-not-allowed opacity-60' : ''}`}
                            data-testid={`card-package-${pkg.id}`}
                          >
                            <CardContent className="p-6">
                              <div className="flex flex-col md:flex-row gap-6">
                                {/* Package Image - Left Side */}
                                {pkg.imageUrl && (
                                  <div className="w-full md:w-48 h-48 flex-shrink-0 overflow-hidden rounded-lg border">
                                    <img 
                                      src={pkg.imageUrl} 
                                      alt={pkg.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                )}
                                
                                {/* Content - Right Side */}
                                <div className="flex-1 flex flex-col min-w-0">
                                  {/* Package Title */}
                                  <h4 className="text-xl font-bold mb-4 break-words" data-testid={`text-package-name-${pkg.id}`}>
                                    {pkg.name}
                                  </h4>
                                  
                                  {/* Package Description */}
                                  {pkg.description && (
                                    <div className="mb-4">
                                      <p className="font-semibold text-sm mb-2">Includes:</p>
                                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                                        {pkg.description}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Package Features */}
                                  {pkg.features && pkg.features.length > 0 && (
                                    <ul className="space-y-2 mb-4">
                                      {pkg.features.map((feature: string, idx: number) => (
                                        <li key={idx} className="text-sm flex items-start gap-2">
                                          <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                          <span className="flex-1">{feature}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  
                                  {/* Price and Select Button */}
                                  <div className="mt-auto pt-4 border-t flex items-center justify-between gap-4">
                                    <div className="text-2xl font-bold text-primary" data-testid={`text-package-price-${pkg.id}`}>
                                      {formatPrice(pkg.priceCents)}
                                    </div>
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        !isAccepted && handlePackageSelect(currentPage, pkg);
                                      }}
                                      disabled={isAccepted}
                                      variant={isSelected ? "default" : "outline"}
                                      className={isSelected ? "bg-primary text-primary-foreground" : ""}
                                      data-testid={`button-select-package-${pkg.id}`}
                                    >
                                      {isSelected ? (
                                        <>
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          Selected
                                        </>
                                      ) : (
                                        "Select"
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                        })}
                    </div>
                  </div>
                )}

                {/* ADDON Page */}
                {currentPage.pageType === "ADDON" && (
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b">
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Plus className="w-5 h-5 text-primary" />
                        </div>
                        {currentPage.displayTitle}
                      </CardTitle>
                      {currentPage.content.description && (
                        <CardDescription className="mt-2">{currentPage.content.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {currentPage.content.addOns?.map((addOn: any, addonIdx: number) => {
                        const key = `${currentPage.id}-${addOn.id}`;
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
                            onClick={() => !isAccepted && !isSelected && handleAddOnToggle(currentPage, addOn, true)}
                          >
                            <div className="flex items-start gap-4">
                              <Checkbox
                                id={addOn.id}
                                checked={isSelected}
                                onCheckedChange={(checked) => 
                                  !isAccepted && handleAddOnToggle(currentPage, addOn, checked as boolean)
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
                                  <div 
                                    className="flex items-center gap-3 mt-4 p-3 bg-gradient-to-br from-primary/5 to-background/50 rounded-lg border border-primary/30 shadow-sm animate-in slide-in-from-top-2 duration-300" 
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddOnQuantityChange(currentPage, addOn, -1)}
                                        disabled={isAccepted || quantity <= 1}
                                        data-testid={`button-decrease-quantity-${addOn.id}`}
                                        className="h-8 w-8 p-0 hover:bg-primary/10 hover:border-primary hover:scale-110 active:scale-95 transition-all duration-200"
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                      </Button>
                                      <div className="w-14 text-center">
                                        <Input
                                          type="number"
                                          value={quantity}
                                          readOnly
                                          className="h-8 text-center font-bold border-primary/40 bg-white dark:bg-background text-primary transition-all duration-200"
                                          data-testid={`input-quantity-${addOn.id}`}
                                          key={quantity}
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddOnQuantityChange(currentPage, addOn, 1)}
                                        disabled={isAccepted || quantity >= 10}
                                        data-testid={`button-increase-quantity-${addOn.id}`}
                                        className="h-8 w-8 p-0 hover:bg-primary/10 hover:border-primary hover:scale-110 active:scale-95 transition-all duration-200"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                    <div className="flex-1" />
                                    <div className="text-right">
                                      <p className="text-xs text-muted-foreground mb-0.5 font-medium">Total</p>
                                      <p className="font-bold text-lg text-primary transition-all duration-300" key={`total-${quantity}`}>
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

                {/* CONTRACT Page */}
                {currentPage.pageType === "CONTRACT" && (
                  <div className="max-w-4xl mx-auto px-4 md:px-8">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <FileSignature className="w-6 h-6 text-primary" />
                          <div>
                            <CardTitle>{currentPage.content.heading || "Service Agreement"}</CardTitle>
                            {currentPage.content.description && (
                              <CardDescription>{currentPage.content.description}</CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Parsed Contract */}
                        <div className="prose prose-sm max-w-none bg-muted/30 p-6 rounded-lg border">
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {parseContractVariables(
                              currentPage.content.contractTemplate || '',
                              {
                                client_name: `${data?.client.firstName} ${data?.client.lastName}`,
                                photographer_name: data?.photographer.businessName || '',
                                project_date: data?.project.title || '',
                                project_type: data?.project.projectType || '',
                                selected_packages: selectedPackage ? selectedPackage.name : 'No package selected',
                                selected_addons: Array.from(selectedAddOns.values()).map(a => `${a.name} (x${a.quantity})`).join(', ') || 'None',
                                total_amount: formatPrice(total),
                                deposit_amount: formatPrice(depositAmount),
                                deposit_percent: String(data?.smartFile.defaultDepositPercent ?? data?.projectSmartFile.depositPercent ?? 50) + '%',
                              }
                            )}
                          </div>
                        </div>

                        <Separator />

                        {/* Signatures Section */}
                        <div className="space-y-6">
                          <h3 className="text-lg font-semibold">Signatures</h3>

                          {/* Photographer Signature */}
                          {currentPage.content.requirePhotographerSignature !== false && (
                            <div className="space-y-3">
                              <Label>Photographer Signature</Label>
                              {data?.projectSmartFile.photographerSignatureUrl ? (
                                <div className="border rounded-lg p-4 bg-muted/20">
                                  <img 
                                    src={data.projectSmartFile.photographerSignatureUrl} 
                                    alt="Photographer signature" 
                                    className="h-20 mx-auto"
                                    data-testid="img-photographer-signature"
                                  />
                                  <p className="text-xs text-muted-foreground text-center mt-2">
                                    Signed by {data.photographer.businessName}
                                    {data.projectSmartFile.photographerSignedAt && 
                                      ` on ${new Date(data.projectSmartFile.photographerSignedAt).toLocaleDateString()}`
                                    }
                                  </p>
                                </div>
                              ) : (
                                <div className="border rounded-lg p-4 bg-muted/20 text-center text-sm text-muted-foreground">
                                  Awaiting photographer signature
                                </div>
                              )}
                            </div>
                          )}

                          {/* Client Signature */}
                          {currentPage.content.requireClientSignature !== false && (
                            <div className="space-y-3">
                              <Label>Your Signature</Label>
                              {data?.projectSmartFile.clientSignatureUrl ? (
                                <div className="border rounded-lg p-4 bg-muted/20">
                                  <img 
                                    src={data.projectSmartFile.clientSignatureUrl} 
                                    alt="Client signature" 
                                    className="h-20 mx-auto"
                                    data-testid="img-client-signature"
                                  />
                                  <p className="text-xs text-muted-foreground text-center mt-2">
                                    Signed on {new Date(data.projectSmartFile.clientSignedAt!).toLocaleDateString()}
                                  </p>
                                </div>
                              ) : showClientSignaturePad ? (
                                <SignaturePad
                                  onSave={(dataUrl) => {
                                    setClientSignature(dataUrl);
                                    saveSignatureMutation.mutate({ clientSignatureUrl: dataUrl });
                                  }}
                                  onCancel={() => setShowClientSignaturePad(false)}
                                  label="Draw your signature"
                                />
                              ) : (
                                <Button
                                  onClick={() => setShowClientSignaturePad(true)}
                                  variant="outline"
                                  className="w-full"
                                  data-testid="button-add-signature"
                                >
                                  <FileSignature className="w-4 h-4 mr-2" />
                                  Add Your Signature
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Agreement Checkbox */}
                          <div className="flex items-start space-x-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                            <Checkbox
                              id="agree-terms"
                              checked={!!data?.projectSmartFile.clientSignatureUrl}
                              disabled
                              data-testid="checkbox-agree-terms"
                            />
                            <Label htmlFor="agree-terms" className="text-sm leading-relaxed cursor-pointer">
                              I have read and agree to the terms outlined in this service agreement. 
                              My signature above confirms my acceptance of all terms and conditions.
                            </Label>
                          </div>
                        </div>

                        {/* Navigation */}
                        {data?.projectSmartFile.clientSignatureUrl && (
                          <div className="flex justify-between pt-4">
                            <Button
                              variant="outline"
                              onClick={() => setCurrentPageIndex(currentPageIndex - 1)}
                              disabled={currentPageIndex === 0}
                              data-testid="button-back-contract"
                            >
                              Back
                            </Button>
                            <Button
                              onClick={() => setCurrentPageIndex(currentPageIndex + 1)}
                              data-testid="button-continue-contract"
                            >
                              Continue to Payment
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* PAYMENT Page */}
                {currentPage.pageType === "PAYMENT" && (
                  <div className="max-w-lg mx-auto px-4 md:px-0">
                    {!canAccessPayment ? (
                      <Card className="border-2 border-amber-500/50">
                        <CardContent className="p-8 text-center space-y-4">
                          <FileSignature className="w-12 h-12 mx-auto text-amber-500" />
                          <h3 className="text-xl font-semibold">Contract Signature Required</h3>
                          <p className="text-muted-foreground">
                            You must sign the contract before you can proceed with payment.
                          </p>
                          <Button
                            onClick={() => {
                              const contractIndex = sortedPages.findIndex(p => p.pageType === 'CONTRACT');
                              if (contractIndex >= 0) {
                                setCurrentPageIndex(contractIndex);
                              }
                            }}
                            data-testid="button-go-to-contract"
                          >
                            Go to Contract
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                    <Card className="border-2">
                      <CardContent className="p-8 space-y-6">
                        {/* Amount Due Section */}
                        <div className="text-center space-y-2 pb-6 border-b">
                          <p className="text-sm text-muted-foreground">Amount due</p>
                          <h2 className="text-5xl font-bold" data-testid="text-total">
                            {formatPrice(total)}
                          </h2>
                          {depositAmount > 0 && depositAmount < total && (
                            <p className="text-sm text-muted-foreground">
                              Deposit: {formatPrice(depositAmount)} ({data.smartFile.defaultDepositPercent ?? data.projectSmartFile.depositPercent ?? 50}%)
                            </p>
                          )}
                        </div>

                        {/* Order Summary (Collapsible) */}
                        {(selectedPackage || selectedAddOns.size > 0) && (
                          <div className="space-y-3 pb-6 border-b">
                            <details className="group">
                              <summary className="flex items-center justify-between cursor-pointer text-sm font-medium">
                                <span>View Order Details</span>
                                <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </summary>
                              <div className="mt-4 space-y-3 text-sm">
                                {selectedPackage && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground" data-testid="text-selected-package">{selectedPackage.name}</span>
                                    <span className="font-medium" data-testid="text-selected-package-price">{formatPrice(selectedPackage.priceCents)}</span>
                                  </div>
                                )}
                                {Array.from(selectedAddOns.values()).map((addOn) => (
                                  <div key={`${addOn.pageId}-${addOn.addOnId}`} className="flex justify-between">
                                    <span className="text-muted-foreground">{addOn.name} × {addOn.quantity}</span>
                                    <span className="font-medium">{formatPrice(addOn.priceCents * addOn.quantity)}</span>
                                  </div>
                                ))}
                                <div className="pt-2 border-t flex justify-between font-medium">
                                  <span>Subtotal</span>
                                  <span data-testid="text-subtotal">{formatPrice(subtotal)}</span>
                                </div>
                              </div>
                            </details>
                          </div>
                        )}

                        {/* Payment Terms */}
                        {currentPage.content.terms && (
                          <div className="space-y-2 pb-6 border-b">
                            <h4 className="text-sm font-medium">Payment Terms</h4>
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                              {currentPage.content.terms}
                            </p>
                          </div>
                        )}

                        {/* Accept & Payment Section */}
                        {!isAccepted ? (
                          <div className="space-y-4">
                            <Button
                              className="w-full h-12 text-lg"
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
                                  Accept & Continue to Payment
                                </>
                              )}
                            </Button>
                            <p className="text-xs text-center text-muted-foreground">
                              You'll be able to pay after accepting this proposal
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Success Message */}
                            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                              <div className="flex items-center gap-2 text-green-800 dark:text-green-400">
                                <CheckCircle className="w-5 h-5" />
                                <p className="font-medium">Proposal Accepted</p>
                              </div>
                            </div>

                            {/* Unified Payment Form */}
                            {currentPage.content.acceptOnlinePayments && (
                              <EmbeddedPaymentForm
                                token={params?.token || ''}
                                paymentType={
                                  data.projectSmartFile.status === 'DEPOSIT_PAID' ? 'BALANCE' :
                                  (depositAmount > 0 && depositAmount < total) ? 'DEPOSIT' :
                                  'FULL'
                                }
                                baseAmount={
                                  data.projectSmartFile.status === 'DEPOSIT_PAID' ? (data.projectSmartFile.balanceDueCents || 0) :
                                  (depositAmount > 0 && depositAmount < total) ? depositAmount :
                                  total
                                }
                                publishableKey={import.meta.env.VITE_STRIPE_PUBLIC_KEY || ''}
                                onSuccess={() => {
                                  toast({
                                    title: "Payment successful!",
                                    description: "Your payment has been processed.",
                                  });
                                  queryClient.invalidateQueries({ queryKey: [`/api/public/smart-files/${params?.token}`] });
                                }}
                                onError={(error) => {
                                  toast({
                                    title: "Payment failed",
                                    description: error,
                                    variant: "destructive"
                                  });
                                }}
                              />
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                  disabled={currentPageIndex === 0}
                  data-testid="button-previous-page"
                >
                  Previous
                </Button>
                <div className="flex flex-col items-end gap-1">
                  {!canAccessPayment && currentPageIndex + 1 === paymentPageIndex && (
                    <p className="text-xs text-muted-foreground" data-testid="text-signature-required">
                      Please sign the contract to proceed
                    </p>
                  )}
                  <Button
                    onClick={() => {
                      const nextIndex = currentPageIndex + 1;
                      // Block navigation to payment page if signature is required but not provided
                      if (nextIndex === paymentPageIndex && !canAccessPayment) {
                        toast({
                          title: "Signature Required",
                          description: "Please sign the contract before proceeding to payment.",
                          variant: "destructive"
                        });
                        return;
                      }
                      setCurrentPageIndex(Math.min(sortedPages.length - 1, nextIndex));
                    }}
                    disabled={currentPageIndex === sortedPages.length - 1}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
