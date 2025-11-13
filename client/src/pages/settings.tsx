import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, User, Palette, Mail, Clock, Shield, Calendar, CheckCircle, XCircle, ExternalLink, CreditCard, AlertCircle, Edit, Upload, Image, Check } from "lucide-react";
import { EmailBrandingModal } from "@/components/email-branding-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);

  // Check for OAuth callback status in URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleConnected = params.get('google_connected');
    const googleError = params.get('google_error');

    if (googleConnected === 'true') {
      toast({
        title: "Google Calendar Connected!",
        description: "Your calendar integration is now active.",
      });
      // Remove query params from URL
      window.history.replaceState({}, '', '/settings');
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/photographers/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/photographer"] });
    } else if (googleError) {
      toast({
        title: "Connection Failed",
        description: `Failed to connect Google Calendar: ${decodeURIComponent(googleError)}`,
        variant: "destructive"
      });
      // Remove query params from URL
      window.history.replaceState({}, '', '/settings');
    }
  }, [toast, queryClient]);

  // Check for email_branding parameter to auto-open modal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openEmailBranding = params.get('email_branding');
    
    if (openEmailBranding === 'true') {
      setIsBrandingModalOpen(true);
      // Remove query params from URL
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL LOGIC
  const { data: photographer } = useQuery({
    queryKey: ["/api/photographer"],
    enabled: !!user
  });

  // Subscription query for photographers
  const { data: subscription } = useQuery({
    queryKey: ["/api/subscription"],
    enabled: !!user && user.role === 'PHOTOGRAPHER'
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/portal");
      return response;
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Stripe Connect queries and mutations
  const { data: stripeStatus, refetch: refetchStripeStatus } = useQuery({
    queryKey: ["/api/stripe-connect/account-status"],
    enabled: !!user
  });

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/stripe-connect/create-account");
    },
    onSuccess: () => {
      refetchStripeStatus();
      toast({
        title: "Stripe Account Created",
        description: "Your Stripe Connect account has been created. Complete onboarding to start receiving payments.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Account Creation Failed",
        description: error.message || "Failed to create Stripe account. Please try again.",
        variant: "destructive"
      });
    }
  });

  const createOnboardingLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe-connect/create-onboarding-link", {
        returnUrl: `${window.location.origin}/settings?tab=integrations&stripe=success`,
        refreshUrl: `${window.location.origin}/settings?tab=integrations&stripe=refresh`
      });
      const data = await response.json();
      return data;
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.open(data.url, '_blank', 'width=800,height=700');
        // Poll for connection status after opening onboarding window
        const pollInterval = setInterval(async () => {
          const result = await refetchStripeStatus();
          if ((result.data as any)?.onboardingCompleted) {
            clearInterval(pollInterval);
            toast({
              title: "Stripe Connected!",
              description: "Your Stripe account is ready to receive payments.",
            });
          }
        }, 3000);
        
        // Stop polling after 10 minutes
        setTimeout(() => clearInterval(pollInterval), 10 * 60 * 1000);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Onboarding Failed",
        description: error.message || "Failed to start onboarding. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Google Calendar queries and mutations
  const { data: calendarStatus, refetch: refetchCalendarStatus } = useQuery({
    queryKey: ["/api/calendar/status"],
    enabled: !!user
  });

  const connectCalendarMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/google-calendar", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to get auth URL");
      const data = await response.json();
      return data;
    }
  });

  // Full-page redirect OAuth flow (fixes popup blocking issues)
  const handleConnectCalendar = async () => {
    try {
      const response = await fetch("/api/auth/google-calendar?returnUrl=/settings", {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error("Failed to get auth URL");
      }
      
      const data = await response.json();
      
      if (data.authUrl) {
        // Full page redirect to Google OAuth
        window.location.href = data.authUrl;
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Google Calendar. Please try again.",
        variant: "destructive"
      });
    }
  };

  const disconnectCalendarMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/calendar/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/status"] });
      toast({
        title: "Calendar Disconnected",
        description: "Your Google Calendar has been disconnected.",
      });
    },
    onError: () => {
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect calendar. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Gallery Integration queries and mutations
  const { data: galleryStatus, refetch: refetchGalleryStatus } = useQuery({
    queryKey: ["/api/gallery/status"],
    enabled: !!user
  });

  const updateGalleryPlatformMutation = useMutation({
    mutationFn: async (platform: string | null) => {
      await apiRequest("PUT", "/api/gallery/platform", { platform });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery/status"] });
      toast({
        title: "Gallery Platform Updated",
        description: "Your gallery platform preference has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update gallery platform. Please try again.",
        variant: "destructive"
      });
    }
  });

  const connectGoogleDriveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/google-drive", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to get auth URL");
      const data = await response.json();
      return data;
    }
  });

  const handleConnectGoogleDrive = () => {
    const popup = window.open('', '_blank', 'width=500,height=600');
    
    connectGoogleDriveMutation.mutate(undefined, {
      onSuccess: (data) => {
        if (data.authUrl && popup) {
          popup.location.href = data.authUrl;
          
          const pollInterval = setInterval(async () => {
            const result = await refetchGalleryStatus();
            if ((result.data as any)?.googleDrive?.connected) {
              clearInterval(pollInterval);
              if (popup && !popup.closed) {
                popup.close();
              }
              toast({
                title: "Google Drive Connected!",
                description: "Your gallery integration is now active.",
              });
            }
          }, 2000);
          
          setTimeout(() => {
            clearInterval(pollInterval);
            if (popup && !popup.closed) {
              popup.close();
            }
          }, 5 * 60 * 1000);
        } else if (popup) {
          popup.close();
        }
      },
      onError: () => {
        if (popup && !popup.closed) {
          popup.close();
        }
        toast({
          title: "Connection Failed",
          description: "Failed to connect to Google Drive. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  const disconnectGoogleDriveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/gallery/google-drive/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery/status"] });
      toast({
        title: "Google Drive Disconnected",
        description: "Your Google Drive has been disconnected.",
      });
    },
    onError: () => {
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect Google Drive. Please try again.",
        variant: "destructive"
      });
    }
  });

  const connectShootProofMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/shootproof", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to get auth URL");
      const data = await response.json();
      return data;
    }
  });

  const handleConnectShootProof = () => {
    const popup = window.open('', '_blank', 'width=500,height=600');
    
    connectShootProofMutation.mutate(undefined, {
      onSuccess: (data) => {
        if (data.authUrl && popup) {
          popup.location.href = data.authUrl;
          
          const pollInterval = setInterval(async () => {
            const result = await refetchGalleryStatus();
            if ((result.data as any)?.shootproof?.connected) {
              clearInterval(pollInterval);
              if (popup && !popup.closed) {
                popup.close();
              }
              toast({
                title: "ShootProof Connected!",
                description: "Your gallery integration is now active.",
              });
            }
          }, 2000);
          
          setTimeout(() => {
            clearInterval(pollInterval);
            if (popup && !popup.closed) {
              popup.close();
            }
          }, 5 * 60 * 1000);
        } else if (popup) {
          popup.close();
        }
      },
      onError: () => {
        if (popup && !popup.closed) {
          popup.close();
        }
        toast({
          title: "Connection Failed",
          description: "Failed to connect to ShootProof. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  const disconnectShootProofMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/gallery/shootproof/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery/status"] });
      toast({
        title: "ShootProof Disconnected",
        description: "Your ShootProof account has been disconnected.",
      });
    },
    onError: () => {
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect ShootProof. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updatePhotographerMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", "/api/photographer", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photographer"] });
      queryClient.invalidateQueries({ queryKey: ["/api/photographers/me"] });
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive"
      });
    }
  });

  // ALL useState hooks MUST be called before any conditional returns
  const [businessName, setBusinessName] = useState("");
  const [photographerName, setPhotographerName] = useState("");
  const [personalPhone, setPersonalPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [brandPrimary, setBrandPrimary] = useState("#3b82f6");
  const [brandSecondary, setBrandSecondary] = useState("#64748b");
  const [emailFromName, setEmailFromName] = useState("");
  const [emailFromAddr, setEmailFromAddr] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [defaultEmailOptIn, setDefaultEmailOptIn] = useState(true);
  const [defaultSmsOptIn, setDefaultSmsOptIn] = useState(false);
  
  // Email Branding state
  const [emailHeaderStyle, setEmailHeaderStyle] = useState<string | null>(null);
  const [emailSignatureStyle, setEmailSignatureStyle] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [galleryExpirationMonths, setGalleryExpirationMonths] = useState(6);
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  
  // Portal Slug state
  const [portalSlug, setPortalSlug] = useState("");
  const [originalSlug, setOriginalSlug] = useState("");
  const [slugError, setSlugError] = useState("");
  const [slugAvailable, setSlugAvailable] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  // Update state when photographer data loads
  useEffect(() => {
    if (photographer) {
      const p = photographer as any;
      setBusinessName(p.businessName || "");
      setPhotographerName(p.photographerName || "");
      setPersonalPhone(p.personalPhone || "");
      setLogoUrl(p.logoUrl || "");
      setLogoPreview(p.logoUrl || "");
      setBrandPrimary(p.brandPrimary || "#3b82f6");
      setBrandSecondary(p.brandSecondary || "#64748b");
      setEmailFromName(p.emailFromName || "");
      setEmailFromAddr(p.emailFromAddr || "");
      setTimezone(p.timezone || "America/New_York");
      setDefaultEmailOptIn(p.defaultEmailOptIn ?? true);
      setDefaultSmsOptIn(p.defaultSmsOptIn ?? false);
      
      // Email Branding
      setEmailHeaderStyle(p.emailHeaderStyle || null);
      setEmailSignatureStyle(p.emailSignatureStyle || null);
      setWebsite(p.website || "");
      setBusinessAddress(p.businessAddress || "");
      const socialLinks = p.socialLinksJson || {};
      setFacebook(socialLinks.facebook || "");
      setInstagram(socialLinks.instagram || "");
      setTwitter(socialLinks.twitter || "");
      setLinkedin(socialLinks.linkedin || "");
      
      // Gallery Settings
      setGalleryExpirationMonths(p.galleryExpirationMonths || 6);
      
      // Portal Slug
      setPortalSlug(p.portalSlug || "");
      setOriginalSlug(p.portalSlug || "");
      setSlugAvailable(!!p.portalSlug); // If they have a slug, it's valid
    }
  }, [photographer]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  // Prevent flash of protected content
  if (!loading && !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Portal Slug helper functions
  const generateSlugFromBusinessName = (businessName: string): string => {
    return businessName
      .toLowerCase()
      .trim()
      .replace(/['']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 63);
  };

  const validateSlugFormat = (slug: string): { valid: boolean; error?: string } => {
    if (!slug || slug.trim() === '') {
      return { valid: false, error: 'Slug cannot be empty' };
    }
    
    const normalized = slug.toLowerCase().trim();
    
    if (normalized.length < 3) {
      return { valid: false, error: 'Slug must be at least 3 characters long' };
    }
    
    if (normalized.length > 63) {
      return { valid: false, error: 'Slug must be 63 characters or less' };
    }
    
    if (!/^[a-z0-9-]+$/.test(normalized)) {
      return { valid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' };
    }
    
    if (normalized.startsWith('-') || normalized.endsWith('-')) {
      return { valid: false, error: 'Slug cannot start or end with a hyphen' };
    }
    
    const reservedSlugs = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'smtp', 'portal', 'client', 'dashboard', 'login', 'signup', 'help', 'support', 'docs', 'blog', 'status'];
    if (reservedSlugs.includes(normalized)) {
      return { valid: false, error: 'This slug is reserved and cannot be used' };
    }
    
    return { valid: true };
  };

  const handleGenerateSlug = () => {
    if (!businessName) {
      toast({
        title: "Business name required",
        description: "Please enter your business name first",
        variant: "destructive"
      });
      return;
    }
    
    const generated = generateSlugFromBusinessName(businessName);
    setPortalSlug(generated);
    setSlugError("");
    
    // Immediately check uniqueness
    handleCheckSlugUniqueness(generated);
  };

  const handleCheckSlugUniqueness = async (slug: string): Promise<boolean> => {
    const validation = validateSlugFormat(slug);
    if (!validation.valid) {
      setSlugError(validation.error || "Invalid slug");
      setSlugAvailable(false);
      return false;
    }
    
    setIsCheckingSlug(true);
    setSlugError("");
    
    try {
      const response = await fetch(`/api/portal-slug/check?slug=${encodeURIComponent(slug)}`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      // Handle 400 validation errors from backend
      if (response.status === 400 && data.error) {
        setSlugError(data.error);
        setSlugAvailable(false);
        return false;
      }
      
      if (!data.available) {
        setSlugError("This portal URL is already taken");
        setSlugAvailable(false);
        return false;
      }
      
      // Success - slug is available
      setSlugAvailable(true);
      return true;
    } catch (error) {
      console.error('Slug check error:', error);
      setSlugError("Could not verify slug availability. Please try again.");
      setSlugAvailable(false);
      return false;
    } finally {
      setIsCheckingSlug(false);
    }
  };

  const handleSlugChange = (value: string) => {
    setPortalSlug(value.toLowerCase());
    setSlugError("");
    setSlugAvailable(false); // Reset availability on change
  };

  const handleSlugBlur = () => {
    if (portalSlug) {
      handleCheckSlugUniqueness(portalSlug);
    }
  };

  // Handler functions
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    // Upload logo file if one was selected
    let finalLogoUrl = logoUrl;
    if (logoFile) {
      setIsUploadingLogo(true);
      try {
        const formData = new FormData();
        formData.append('logo', logoFile);
        
        const response = await fetch('/api/upload/logo', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Logo upload failed');
        }
        
        const data = await response.json();
        finalLogoUrl = data.logoUrl;
        setLogoUrl(finalLogoUrl);
        setLogoFile(null);
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload Failed",
          description: "Could not upload logo. Please try again.",
          variant: "destructive"
        });
        setIsUploadingLogo(false);
        return;
      } finally {
        setIsUploadingLogo(false);
      }
    }

    // Validate and warn about portal slug changes
    if (portalSlug) {
      // Re-validate slug availability before saving
      const isAvailable = await handleCheckSlugUniqueness(portalSlug);
      if (!isAvailable) {
        toast({
          title: "Portal URL Error",
          description: slugError || "Please fix the portal URL before saving",
          variant: "destructive"
        });
        return;
      }
      
      // Warn if slug is changing and they have an existing slug
      if (originalSlug && portalSlug !== originalSlug) {
        const confirmed = window.confirm(
          `⚠️ Warning: Changing your portal URL will invalidate all previously sent magic links.\n\n` +
          `Old URL: ${originalSlug}.tpcportal.co\n` +
          `New URL: ${portalSlug}.tpcportal.co\n\n` +
          `You will need to re-send magic links to your clients after this change.\n\n` +
          `Do you want to continue?`
        );
        
        if (!confirmed) {
          return;
        }
      }
    }

    updatePhotographerMutation.mutate({
      businessName,
      photographerName: photographerName || undefined,
      personalPhone: personalPhone || undefined,
      logoUrl: finalLogoUrl || undefined,
      emailFromName: emailFromName || undefined,
      emailFromAddr: emailFromAddr || undefined,
      timezone,
      defaultEmailOptIn,
      defaultSmsOptIn,
      portalSlug: portalSlug || undefined
    });
  };

  const handleSaveBranding = () => {
    updatePhotographerMutation.mutate({
      brandPrimary,
      brandSecondary
    });
  };

  const handleSaveEmailBranding = (data: any) => {
    // Update local state
    setEmailHeaderStyle(data.emailHeaderStyle);
    setEmailSignatureStyle(data.emailSignatureStyle);
    setWebsite(data.website);
    setBusinessAddress(data.businessAddress);
    const socialLinks = data.socialLinksJson || {};
    setFacebook(socialLinks.facebook || "");
    setInstagram(socialLinks.instagram || "");
    setTwitter(socialLinks.twitter || "");
    setLinkedin(socialLinks.linkedin || "");

    // Save to backend
    updatePhotographerMutation.mutate({
      emailHeaderStyle: data.emailHeaderStyle || null,
      emailSignatureStyle: data.emailSignatureStyle || null,
      headshotUrl: data.headshotUrl || undefined,
      website: data.website || undefined,
      businessAddress: data.businessAddress || undefined,
      socialLinksJson: Object.keys(data.socialLinksJson).length > 0 ? data.socialLinksJson : undefined
    });
  };

  // Stripe status helpers
  const hasStripeAccount = (stripeStatus as any)?.hasAccount;
  const onboardingCompleted = (stripeStatus as any)?.onboardingCompleted;
  const payoutEnabled = (stripeStatus as any)?.payoutEnabled;
  const accountStatus = (stripeStatus as any)?.status;

  const getStripeStatusDisplay = () => {
    if (!hasStripeAccount) {
      return { icon: XCircle, text: "Not Connected", color: "text-gray-500" };
    }
    if (onboardingCompleted && payoutEnabled) {
      return { icon: CheckCircle, text: "Active", color: "text-green-600" };
    }
    if (hasStripeAccount && !onboardingCompleted) {
      return { icon: AlertCircle, text: "Setup Required", color: "text-yellow-600" };
    }
    return { icon: XCircle, text: "Incomplete", color: "text-red-600" };
  };

  // Calendar status helpers
  const isCalendarConnected = (calendarStatus as any)?.authenticated;
  const connectedEmail = (calendarStatus as any)?.email;

  const stripeStatusInfo = getStripeStatusDisplay();
  const StripeStatusIcon = stripeStatusInfo.icon;

  return (
    <div>
        {/* Header */}
        <header className="bg-card border-b border-border px-4 md:px-6 py-4 relative">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">Settings</h1>
            <p className="text-sm md:text-base text-muted-foreground">Manage your account and business preferences</p>
          </div>
        </header>

        <div className="p-3 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Desktop tabs */}
            <TabsList className="hidden md:grid w-full grid-cols-8">
              <TabsTrigger value="profile" className="flex items-center">
                <User className="w-4 h-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="branding" className="flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="automation" className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Automation
              </TabsTrigger>
              <TabsTrigger value="gallery" className="flex items-center">
                <Image className="w-4 h-4 mr-2" />
                Gallery
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Integrations
              </TabsTrigger>
              {user?.role === 'PHOTOGRAPHER' && (
                <TabsTrigger value="billing" className="flex items-center">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Billing
                </TabsTrigger>
              )}
            </TabsList>
            
            {/* Mobile dropdown */}
            <div className="md:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger data-testid="select-settings-section">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profile">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </div>
                  </SelectItem>
                  <SelectItem value="branding">
                    <div className="flex items-center">
                      <Palette className="w-4 h-4 mr-2" />
                      Branding
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="automation">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Automation
                    </div>
                  </SelectItem>
                  <SelectItem value="gallery">
                    <div className="flex items-center">
                      <Image className="w-4 h-4 mr-2" />
                      Gallery
                    </div>
                  </SelectItem>
                  <SelectItem value="security">
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      Security
                    </div>
                  </SelectItem>
                  <SelectItem value="integrations">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Integrations
                    </div>
                  </SelectItem>
                  {user?.role === 'PHOTOGRAPHER' && (
                    <SelectItem value="billing">
                      <div className="flex items-center">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Billing
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Business Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="photographerName">Your Name</Label>
                      <Input
                        id="photographerName"
                        value={photographerName}
                        onChange={(e) => setPhotographerName(e.target.value)}
                        placeholder="e.g., Sarah Johnson"
                        data-testid="input-photographer-name"
                      />
                      <p className="text-xs text-muted-foreground">
                        Used in {'{{PHOTOGRAPHER_NAME}}'} placeholders
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g., Sarah Johnson Photography"
                        data-testid="input-business-name"
                      />
                      <p className="text-xs text-muted-foreground">
                        Used in {'{{BUSINESS_NAME}}'} placeholders
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="personalPhone">Personal Phone Number</Label>
                    <Input
                      id="personalPhone"
                      value={personalPhone}
                      onChange={(e) => setPersonalPhone(e.target.value)}
                      placeholder="e.g., (555) 123-4567"
                      data-testid="input-personal-phone"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used for test automation messages (separate from business phone)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="portalSlug">Custom Portal URL</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <Input
                            id="portalSlug"
                            value={portalSlug}
                            onChange={(e) => handleSlugChange(e.target.value)}
                            onBlur={handleSlugBlur}
                            placeholder="e.g., johns-photography"
                            data-testid="input-portal-slug"
                            className={slugError ? "border-destructive" : ""}
                          />
                          <span className="ml-2 text-sm text-muted-foreground whitespace-nowrap">.tpcportal.co</span>
                        </div>
                        {portalSlug && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Clients will access: <span className="font-medium">{portalSlug}.tpcportal.co</span>
                          </p>
                        )}
                        {slugError && (
                          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {slugError}
                          </p>
                        )}
                        {!slugError && !isCheckingSlug && slugAvailable && portalSlug && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Portal URL available
                          </p>
                        )}
                        {isCheckingSlug && (
                          <p className="text-xs text-muted-foreground mt-1">Checking availability...</p>
                        )}
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleGenerateSlug}
                        disabled={!businessName}
                        data-testid="button-generate-slug"
                      >
                        Auto-Generate
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your custom-branded client portal URL for magic links and client access
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger data-testid="select-timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Business Logo</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Upload your business logo for email headers and branding
                      </p>
                    </div>
                    {(logoPreview || logoUrl) && (
                      <div className="flex items-center gap-4">
                        <img 
                          src={logoPreview || logoUrl} 
                          alt="Logo preview" 
                          className="h-20 w-auto max-w-xs object-contain border border-border rounded p-2"
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        id="logoFile"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="hidden"
                        data-testid="input-logo-file"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => document.getElementById('logoFile')?.click()}
                        disabled={isUploadingLogo}
                        data-testid="button-upload-logo"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {logoFile ? logoFile.name : 'Choose Logo'}
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSaveProfile}
                    disabled={updatePhotographerMutation.isPending || isUploadingLogo}
                    data-testid="button-save-profile"
                  >
                    {isUploadingLogo ? "Uploading..." : updatePhotographerMutation.isPending ? "Saving..." : "Save Profile"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="branding">
              <Card>
                <CardHeader>
                  <CardTitle>Brand Colors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brandPrimary">Primary Color</Label>
                      <Input
                        id="brandPrimary"
                        type="color"
                        value={brandPrimary}
                        onChange={(e) => setBrandPrimary(e.target.value)}
                        data-testid="input-brand-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brandSecondary">Secondary Color</Label>
                      <Input
                        id="brandSecondary"
                        type="color"
                        value={brandSecondary}
                        onChange={(e) => setBrandSecondary(e.target.value)}
                        data-testid="input-brand-secondary"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSaveBranding}
                    disabled={updatePhotographerMutation.isPending}
                    data-testid="button-save-branding"
                  >
                    {updatePhotographerMutation.isPending ? "Saving..." : "Save Branding"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Email Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                      <div className="space-y-2">
                        <Label htmlFor="emailFromName">From Name</Label>
                        <Input
                          id="emailFromName"
                          value={emailFromName}
                          onChange={(e) => setEmailFromName(e.target.value)}
                          placeholder="Your Business Name"
                          data-testid="input-email-from-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emailFromAddr">From Email</Label>
                        <Input
                          id="emailFromAddr"
                          type="email"
                          value={emailFromAddr}
                          onChange={(e) => setEmailFromAddr(e.target.value)}
                          placeholder="hello@yourbusiness.com"
                          data-testid="input-email-from-addr"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-lg font-medium">Default Opt-in Settings</h3>
                      <p className="text-sm text-muted-foreground">
                        These settings control the default opt-in status when clients submit your widget form without explicitly choosing opt-in preferences.
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="defaultEmailOptIn">Default Email Opt-in</Label>
                          <p className="text-sm text-muted-foreground">
                            New clients will be opted into email communications by default
                          </p>
                        </div>
                        <Switch
                          id="defaultEmailOptIn"
                          checked={defaultEmailOptIn}
                          onCheckedChange={setDefaultEmailOptIn}
                          data-testid="switch-default-email-opt-in"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="defaultSmsOptIn">Default SMS Opt-in</Label>
                          <p className="text-sm text-muted-foreground">
                            New clients will be opted into SMS communications by default
                          </p>
                        </div>
                        <Switch
                          id="defaultSmsOptIn"
                          checked={defaultSmsOptIn}
                          onCheckedChange={setDefaultSmsOptIn}
                          data-testid="switch-default-sms-opt-in"
                        />
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleSaveProfile}
                      disabled={updatePhotographerMutation.isPending}
                      data-testid="button-save-email-settings"
                    >
                      {updatePhotographerMutation.isPending ? "Saving..." : "Save Email Settings"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Email Branding</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Customize the look of your automated emails with professional headers and signatures
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Current Branding:</span>
                          <span className="text-sm text-muted-foreground">
                            {emailHeaderStyle ? emailHeaderStyle.charAt(0).toUpperCase() + emailHeaderStyle.slice(1) : 'None'} header
                            {' • '}
                            {emailSignatureStyle ? emailSignatureStyle.charAt(0).toUpperCase() + emailSignatureStyle.slice(1) : 'None'} signature
                          </span>
                        </div>
                        {(website || businessAddress) && (
                          <div className="text-sm text-muted-foreground">
                            {website && `Website: ${website.replace(/^https?:\/\//, '')}`}
                            {website && businessAddress && ' • '}
                            {businessAddress && `Address: ${businessAddress.substring(0, 30)}${businessAddress.length > 30 ? '...' : ''}`}
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsBrandingModalOpen(true)}
                        data-testid="button-edit-email-branding"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Email Branding Modal */}
                <EmailBrandingModal
                  open={isBrandingModalOpen}
                  onOpenChange={setIsBrandingModalOpen}
                  photographer={photographer}
                  onSave={handleSaveEmailBranding}
                />
              </div>
            </TabsContent>

            <TabsContent value="integrations">
              <div className="space-y-6">
                {/* Stripe Connect Integration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Payment Processing 
                      <span className="inline-flex items-center rounded-md bg-red-50 dark:bg-red-950 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-600/20 dark:ring-red-400/20">
                        Required
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 p-4 border border-border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <CreditCard className="w-8 h-8 text-primary" />
                          <div>
                            <h3 className="font-medium">Stripe Connect</h3>
                            <p className="text-sm text-muted-foreground">
                              Required to send proposals and accept client payments
                            </p>
                            {hasStripeAccount && accountStatus && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Account status: {accountStatus}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className={`flex items-center ${stripeStatusInfo.color}`}>
                            <StripeStatusIcon className="w-4 h-4 mr-1" />
                            <span className="text-sm font-medium">{stripeStatusInfo.text}</span>
                          </div>
                          {!hasStripeAccount ? (
                            <Button
                              onClick={() => createAccountMutation.mutate()}
                              disabled={createAccountMutation.isPending}
                              data-testid="button-create-stripe-account"
                              className="flex items-center"
                            >
                              {createAccountMutation.isPending ? (
                                "Creating..."
                              ) : (
                                <>
                                  Connect Stripe
                                  <ExternalLink className="w-4 h-4 ml-1" />
                                </>
                              )}
                            </Button>
                          ) : !onboardingCompleted ? (
                            <Button
                              onClick={() => createOnboardingLinkMutation.mutate()}
                              disabled={createOnboardingLinkMutation.isPending}
                              data-testid="button-complete-stripe-onboarding"
                              className="flex items-center"
                            >
                              {createOnboardingLinkMutation.isPending ? (
                                "Opening..."
                              ) : (
                                <>
                                  Complete Setup
                                  <ExternalLink className="w-4 h-4 ml-1" />
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => createOnboardingLinkMutation.mutate()}
                              disabled={createOnboardingLinkMutation.isPending}
                              data-testid="button-manage-stripe-account"
                              className="flex items-center"
                            >
                              {createOnboardingLinkMutation.isPending ? (
                                "Opening..."
                              ) : (
                                <>
                                  Manage Account
                                  <ExternalLink className="w-4 h-4 ml-1" />
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {onboardingCompleted && payoutEnabled && (
                        <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-green-800 dark:text-green-200">Payments enabled</p>
                              <p className="text-green-700 dark:text-green-300 mt-1">
                                You can now accept payments and receive instant payouts. Visit your earnings page to request payouts.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {hasStripeAccount && !onboardingCompleted && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-yellow-800 dark:text-yellow-200">Setup required</p>
                              <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                                Complete your Stripe onboarding to start accepting payments and receiving payouts
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {!hasStripeAccount && (
                        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-red-800 dark:text-red-200">⚠️ Action Required: Connect Stripe</p>
                              <p className="text-red-700 dark:text-red-300 mt-1">
                                You must connect Stripe before sending proposals to clients. Platform automatically collects 5% platform fee and deposits 95% to your account. Instant payouts available (1% fee).
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Google Integration */}
                <Card>
                  <CardHeader>
                    <CardTitle>Google Workspace Integration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 p-4 border border-border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-8 h-8 text-primary" />
                          <div>
                            <h3 className="font-medium">Google Calendar & Gmail</h3>
                            <p className="text-sm text-muted-foreground">
                              Send emails from your Gmail & sync bookings to Calendar with Meet links
                            </p>
                            {isCalendarConnected && connectedEmail && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Connected as: {connectedEmail}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {isCalendarConnected ? (
                            <>
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                <span className="text-sm font-medium">Connected</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => disconnectCalendarMutation.mutate()}
                                disabled={disconnectCalendarMutation.isPending}
                                data-testid="button-disconnect-calendar"
                              >
                                {disconnectCalendarMutation.isPending ? "Disconnecting..." : "Disconnect"}
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center text-gray-500">
                                <XCircle className="w-4 h-4 mr-1" />
                                <span className="text-sm">Not Connected</span>
                              </div>
                              <Button
                                onClick={handleConnectCalendar}
                                disabled={connectCalendarMutation.isPending}
                                data-testid="button-connect-calendar"
                                className="flex items-center"
                              >
                                {connectCalendarMutation.isPending ? (
                                  "Connecting..."
                                ) : (
                                  <>
                                    Connect
                                    <ExternalLink className="w-4 h-4 ml-1" />
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {isCalendarConnected && (
                        <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-green-800 dark:text-green-200">Google integration active</p>
                              <ul className="text-green-700 dark:text-green-300 mt-1 list-disc list-inside space-y-1">
                                <li>All emails sent from your personal Gmail address</li>
                                <li>Bookings automatically create calendar events</li>
                                <li>Google Meet links generated for virtual appointments</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {!isCalendarConnected && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <Calendar className="w-4 h-4 text-blue-600 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-blue-800 dark:text-blue-200">Connect Google Workspace</p>
                              <p className="text-blue-700 dark:text-blue-300 mt-1">
                                One connection enables Gmail sending (from your personal email) + Calendar sync with Meet links
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Gallery Integration */}
                <Card>
                  <CardHeader>
                    <CardTitle>Gallery Integration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Platform Selection */}
                      <div className="space-y-4">
                        <div>
                          <Label>Gallery Platform</Label>
                          <p className="text-sm text-muted-foreground mb-3">
                            Choose where client galleries will be created automatically when deposits are paid
                          </p>
                          <Select
                            value={(galleryStatus as any)?.platform || ""}
                            onValueChange={(value) => updateGalleryPlatformMutation.mutate(value || null)}
                            data-testid="select-gallery-platform"
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GOOGLE_DRIVE">Google Drive</SelectItem>
                              <SelectItem value="SHOOTPROOF">ShootProof</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Google Drive */}
                      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 p-4 border border-border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <svg className="w-8 h-8" viewBox="0 0 24 24">
                            <path fill="#3777E3" d="M8.5 21l-3.5-6h7l3.5 6z"/>
                            <path fill="#FFCF63" d="M12 3L8.5 9h14L19 3z"/>
                            <path fill="#11A861" d="M2 15l3.5-6L12 21H5z"/>
                          </svg>
                          <div>
                            <h3 className="font-medium">Google Drive</h3>
                            <p className="text-sm text-muted-foreground">
                              Auto-create folders in your Google Drive
                            </p>
                            {(galleryStatus as any)?.googleDrive?.connected && (galleryStatus as any)?.googleDrive?.email && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Connected as: {(galleryStatus as any).googleDrive.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {(galleryStatus as any)?.googleDrive?.connected ? (
                            <>
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                <span className="text-sm font-medium">Connected</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => disconnectGoogleDriveMutation.mutate()}
                                disabled={disconnectGoogleDriveMutation.isPending}
                                data-testid="button-disconnect-google-drive"
                              >
                                {disconnectGoogleDriveMutation.isPending ? "Disconnecting..." : "Disconnect"}
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center text-gray-500">
                                <XCircle className="w-4 h-4 mr-1" />
                                <span className="text-sm">Not Connected</span>
                              </div>
                              <Button
                                onClick={handleConnectGoogleDrive}
                                disabled={connectGoogleDriveMutation.isPending}
                                data-testid="button-connect-google-drive"
                                className="flex items-center"
                              >
                                {connectGoogleDriveMutation.isPending ? (
                                  "Connecting..."
                                ) : (
                                  <>
                                    Connect
                                    <ExternalLink className="w-4 h-4 ml-1" />
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* ShootProof */}
                      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 p-4 border border-border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <svg className="w-8 h-8" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" fill="#FF6B35"/>
                            <path fill="white" d="M12 6c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"/>
                          </svg>
                          <div>
                            <h3 className="font-medium">ShootProof</h3>
                            <p className="text-sm text-muted-foreground">
                              Create albums in your ShootProof account
                            </p>
                            {(galleryStatus as any)?.shootproof?.connected && (galleryStatus as any)?.shootproof?.email && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Connected as: {(galleryStatus as any).shootproof.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {(galleryStatus as any)?.shootproof?.connected ? (
                            <>
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                <span className="text-sm font-medium">Connected</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => disconnectShootProofMutation.mutate()}
                                disabled={disconnectShootProofMutation.isPending}
                                data-testid="button-disconnect-shootproof"
                              >
                                {disconnectShootProofMutation.isPending ? "Disconnecting..." : "Disconnect"}
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center text-gray-500">
                                <XCircle className="w-4 h-4 mr-1" />
                                <span className="text-sm">Not Connected</span>
                              </div>
                              <Button
                                onClick={handleConnectShootProof}
                                disabled={connectShootProofMutation.isPending}
                                data-testid="button-connect-shootproof"
                                className="flex items-center"
                              >
                                {connectShootProofMutation.isPending ? (
                                  "Connecting..."
                                ) : (
                                  <>
                                    Connect
                                    <ExternalLink className="w-4 h-4 ml-1" />
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Info Box */}
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-blue-800 dark:text-blue-200">How gallery automation works</p>
                            <ul className="text-blue-700 dark:text-blue-300 mt-1 list-disc list-inside space-y-1">
                              <li>When a client pays their deposit, a gallery folder/album is automatically created</li>
                              <li>Upload photos to your connected platform (Google Drive or ShootProof)</li>
                              <li>Mark the gallery as ready in the project to send the link to your client</li>
                              <li>Can also manually add gallery links from any platform</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* SMS Test Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Test SMS Integration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Send a test SMS to verify your Twilio integration is working correctly.
                      </p>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <Label htmlFor="test-phone">Phone Number</Label>
                          <Input
                            id="test-phone"
                            placeholder="(972) 249-7048"
                            defaultValue="9722497048"
                            data-testid="input-test-phone"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            onClick={async () => {
                              const phoneInput = document.getElementById('test-phone') as HTMLInputElement;
                              const phone = phoneInput?.value;
                              
                              if (!phone) {
                                toast({
                                  title: "Phone Number Required",
                                  description: "Please enter a phone number",
                                  variant: "destructive"
                                });
                                return;
                              }

                              try {
                                const result = await apiRequest("POST", "/api/test-sms", {
                                  phoneNumber: phone,
                                  message: "🎉 Twilio is working! This is a test SMS from thePhotoCrm."
                                });

                                toast({
                                  title: "Test SMS Sent!",
                                  description: `SMS sent successfully. Check your phone! SID: ${result.sid}`,
                                });
                              } catch (error: any) {
                                toast({
                                  title: "SMS Failed",
                                  description: error.message || "Failed to send test SMS",
                                  variant: "destructive"
                                });
                              }
                            }}
                            data-testid="button-send-test-sms"
                          >
                            Send Test SMS
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="automation">
              <Card>
                <CardHeader>
                  <CardTitle>Automation Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Automation settings coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gallery">
              <Card>
                <CardHeader>
                  <CardTitle>Gallery Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="galleryExpiration">Gallery Expiration Period</Label>
                      <Select
                        value={galleryExpirationMonths.toString()}
                        onValueChange={(value) => setGalleryExpirationMonths(parseInt(value))}
                      >
                        <SelectTrigger id="galleryExpiration" data-testid="select-gallery-expiration">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 months</SelectItem>
                          <SelectItem value="6">6 months</SelectItem>
                          <SelectItem value="12">12 months</SelectItem>
                          <SelectItem value="24">24 months</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        How long galleries remain accessible to clients after delivery. This expiration period is used in automated reminder emails.
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        updatePhotographerMutation.mutate({
                          galleryExpirationMonths
                        });
                      }}
                      disabled={updatePhotographerMutation.isPending}
                      data-testid="button-save-gallery-settings"
                    >
                      {updatePhotographerMutation.isPending ? "Saving..." : "Save Gallery Settings"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Security settings coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

            {user?.role === 'PHOTOGRAPHER' && (
              <TabsContent value="billing">
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription & Billing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Subscription Status */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">Current Plan</h3>
                          <p className="text-sm text-muted-foreground">$5/month after trial</p>
                        </div>
                        <div>
                          {subscription?.subscriptionStatus === 'trialing' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              Free Trial
                            </span>
                          )}
                          {subscription?.subscriptionStatus === 'active' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Active
                            </span>
                          )}
                          {subscription?.subscriptionStatus === 'past_due' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              Payment Due
                            </span>
                          )}
                          {subscription?.subscriptionStatus === 'canceled' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              Canceled
                            </span>
                          )}
                        </div>
                      </div>

                      {subscription?.subscriptionStatus === 'trialing' && subscription?.trialEndsAt && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-blue-800 dark:text-blue-200">Free Trial Active</p>
                              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                Your 14-day free trial ends on {new Date(subscription.trialEndsAt).toLocaleDateString()}. 
                                Add a payment method to continue using thePhotoCrm after your trial ends.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {subscription?.subscriptionStatus === 'active' && subscription?.currentPeriodEnd && (
                        <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-green-800 dark:text-green-200">Subscription Active</p>
                              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                Your next billing date is {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {subscription?.subscriptionStatus === 'past_due' && (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-yellow-800 dark:text-yellow-200">Payment Failed</p>
                              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                Your last payment failed. Please update your payment method to continue using thePhotoCrm.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Manage Billing Button */}
                    <div className="pt-4 border-t">
                      <Button
                        onClick={() => portalMutation.mutate()}
                        disabled={portalMutation.isPending}
                        data-testid="button-manage-billing"
                        className="w-full sm:w-auto"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {portalMutation.isPending ? "Opening..." : "Manage Billing & Payment Method"}
                      </Button>
                      <p className="text-sm text-muted-foreground mt-2">
                        Update your payment method, view invoices, or manage your subscription
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
    </div>
  );
}