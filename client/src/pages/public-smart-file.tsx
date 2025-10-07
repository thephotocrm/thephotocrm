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
  Package as PackageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

type ImageContent = {
  url: string;
  borderRadius?: 'straight' | 'rounded';
  size?: 'small' | 'medium' | 'large';
};

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

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
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
                      <div className="-mx-4 sm:-mx-6 md:mx-0 md:p-8 mb-6">
                        <div 
                          className="relative w-full h-[400px] flex items-center justify-center bg-cover bg-center md:border-4 md:border-border md:rounded-lg overflow-hidden"
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
                      <RadioGroup
                        value={selectedPackage?.packageId || ""}
                        onValueChange={() => {}}
                        disabled={isAccepted}
                        className="space-y-4"
                      >
                        {currentPage.content.packages?.map((pkg: any) => (
                          <Card 
                            key={pkg.id} 
                            className={`overflow-hidden border-2 transition-all duration-300 max-w-[800px] mx-auto cursor-pointer ${
                              selectedPackage?.packageId === pkg.id
                                ? 'border-primary shadow-lg'
                                : 'hover:border-primary/40 hover:shadow-lg'
                            } ${isAccepted ? 'cursor-not-allowed opacity-60' : ''}`}
                            onClick={() => !isAccepted && handlePackageSelect(currentPage, pkg)}
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
                                  <div className="flex items-start gap-3">
                                    <RadioGroupItem 
                                      value={pkg.id} 
                                      id={pkg.id}
                                      disabled={isAccepted}
                                      className="mt-1 data-[state=checked]:border-primary data-[state=checked]:text-primary"
                                    />
                                    <div className="flex-1">
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
                                      
                                      {/* Price Tag */}
                                      <div className="mt-auto pt-4 border-t">
                                        <div className="text-2xl font-bold text-primary" data-testid={`text-package-price-${pkg.id}`}>
                                          {formatPrice(pkg.priceCents)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </RadioGroup>
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
                                  <div 
                                    className="flex items-center gap-3 mt-4 p-3 bg-gradient-to-br from-primary/5 to-background/50 rounded-lg border border-primary/30 shadow-sm animate-in slide-in-from-top-2 duration-300" 
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddOnQuantityChange(page, addOn, -1)}
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
                                        onClick={() => handleAddOnQuantityChange(page, addOn, 1)}
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

                {/* PAYMENT Page */}
                {currentPage.pageType === "PAYMENT" && (
                  <div className="max-w-2xl mx-auto px-4 md:px-0 space-y-6">
                    {/* Payment Terms */}
                    {currentPage.content.terms && (
                      <Card className="border-2">
                        <CardContent className="p-6">
                          <h4 className="font-medium mb-2">Payment Terms</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {currentPage.content.terms}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Cart Summary & Payment Options */}
                    <Card className="border-2">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5" />
                          Order Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Selected Package */}
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

                        {/* Selected Add-ons */}
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

                        {/* Pricing Summary */}
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

                        {/* Accept Button */}
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
                                Accept Proposal
                              </>
                            )}
                          </Button>
                        )}

                        {/* Payment Options - Shown after acceptance */}
                        {isAccepted && (
                          <div className="space-y-3">
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center gap-2 text-green-800">
                                <CheckCircle className="w-5 h-5" />
                                <p className="font-medium">Proposal Accepted</p>
                              </div>
                              <p className="text-sm text-green-700 mt-1">
                                Your selections have been saved. Choose a payment option below.
                              </p>
                            </div>

                            {currentPage.content.acceptOnlinePayments && (
                              <div className="space-y-2">
                                {data.projectSmartFile.status === 'DEPOSIT_PAID' ? (
                                  <Button
                                    className="w-full"
                                    size="lg"
                                    onClick={() => createCheckoutMutation.mutate('BALANCE')}
                                    disabled={createCheckoutMutation.isPending}
                                    data-testid="button-pay-balance"
                                  >
                                    {createCheckoutMutation.isPending ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Processing...
                                      </>
                                    ) : (
                                      <>
                                        <CreditCard className="w-4 h-4 mr-2" />
                                        Pay Remaining Balance - {formatPrice(data.projectSmartFile.balanceDueCents || 0)}
                                      </>
                                    )}
                                  </Button>
                                ) : (
                                  <>
                                    {depositAmount > 0 && depositAmount < total && (
                                      <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={() => createCheckoutMutation.mutate('DEPOSIT')}
                                        disabled={createCheckoutMutation.isPending}
                                        data-testid="button-pay-deposit"
                                      >
                                        {createCheckoutMutation.isPending ? (
                                          <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Processing...
                                          </>
                                        ) : (
                                          <>
                                            <CreditCard className="w-4 h-4 mr-2" />
                                            Pay Deposit - {formatPrice(depositAmount)}
                                          </>
                                        )}
                                      </Button>
                                    )}
                                    <Button
                                      className="w-full"
                                      size="lg"
                                      variant={depositAmount > 0 && depositAmount < total ? "outline" : "default"}
                                      onClick={() => createCheckoutMutation.mutate('FULL')}
                                      disabled={createCheckoutMutation.isPending}
                                      data-testid="button-pay-full"
                                    >
                                      {createCheckoutMutation.isPending ? (
                                        <>
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                          Processing...
                                        </>
                                      ) : (
                                        <>
                                          <CreditCard className="w-4 h-4 mr-2" />
                                          Pay Full Amount - {formatPrice(total)}
                                        </>
                                      )}
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
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
                <Button
                  onClick={() => setCurrentPageIndex(Math.min(sortedPages.length - 1, currentPageIndex + 1))}
                  disabled={currentPageIndex === sortedPages.length - 1}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
            )}
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
                          Accept Proposal
                        </>
                      )}
                    </Button>
                  )}

                  {isAccepted && (
                    <div className="space-y-3">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-800">
                          <CheckCircle className="w-5 h-5" />
                          <p className="font-medium">Proposal Accepted</p>
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          Your selections have been saved. Choose a payment option below.
                        </p>
                      </div>

                      {/* Payment Options */}
                      {paymentPage?.content?.acceptOnlinePayments && (
                        <div className="space-y-2">
                          {data.projectSmartFile.status === 'DEPOSIT_PAID' ? (
                            <Button
                              className="w-full"
                              size="lg"
                              onClick={() => createCheckoutMutation.mutate('BALANCE')}
                              disabled={createCheckoutMutation.isPending}
                              data-testid="button-pay-balance"
                            >
                              {createCheckoutMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>Pay Remaining Balance - {formatPrice(data.projectSmartFile.balanceDueCents || 0)}</>
                              )}
                            </Button>
                          ) : (
                            <>
                              {depositAmount > 0 && depositAmount < total && (
                                <Button
                                  className="w-full"
                                  size="lg"
                                  onClick={() => createCheckoutMutation.mutate('DEPOSIT')}
                                  disabled={createCheckoutMutation.isPending}
                                  data-testid="button-pay-deposit"
                                >
                                  {createCheckoutMutation.isPending ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>Pay Deposit - {formatPrice(depositAmount)}</>
                                  )}
                                </Button>
                              )}
                              <Button
                                className="w-full"
                                size="lg"
                                variant={depositAmount > 0 && depositAmount < total ? "outline" : "default"}
                                onClick={() => createCheckoutMutation.mutate('FULL')}
                                disabled={createCheckoutMutation.isPending}
                                data-testid="button-pay-full"
                              >
                                {createCheckoutMutation.isPending ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>Pay Full Amount - {formatPrice(total)}</>
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
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
