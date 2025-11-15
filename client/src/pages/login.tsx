import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useDomain } from "@/hooks/use-domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Camera, Eye, EyeOff, Mail, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import weddingPhoto from "@assets/stock_images/professional_wedding_67201dd8.jpg";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, user } = useAuth();
  const { domain, isLoading: domainLoading, error: domainError } = useDomain();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicLinkModalOpen, setMagicLinkModalOpen] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const hasRedirected = useRef(false);
  
  const isClientPortal = domain?.type === 'client_portal' && domain.isCustomSubdomain;
  
  // Redirect if already logged in - use effect to prevent infinite loop
  useEffect(() => {
    if (user && !hasRedirected.current) {
      hasRedirected.current = true;
      setLocation("/");
    }
  }, [user, setLocation]);
  
  // Magic link request mutation
  const requestMagicLinkMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("POST", "/api/client-portal/request-magic-link", { email });
    },
    onSuccess: () => {
      toast({
        title: "Check your email",
        description: "We've sent you a secure login link",
      });
      setMagicLinkModalOpen(false);
      setMagicLinkEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send magic link",
        variant: "destructive",
      });
    }
  });

  // Show loading while domain is being determined
  // CRITICAL: Must check both isLoading AND domain existence to prevent layout flash
  if (domainLoading || (!domain && !domainError)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" data-testid="loader-domain" />
      </div>
    );
  }

  // If domain lookup failed, fall back to photographer login UI
  // This ensures users can still log in even if /api/domain endpoint fails
  if (domainError && !domain) {
    console.error('Domain lookup failed, falling back to photographer login:', domainError);
    // Allow component to continue with domain as undefined
    // isClientPortal will be false, showing photographer login UI
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login({ email, password });
      toast({
        title: "Welcome back!",
        description: "You have been logged in successfully.",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get photographer brand colors with fallbacks
  const brandPrimary = domain?.photographer?.brandPrimary || '#3b82f6';
  const brandSecondary = domain?.photographer?.brandSecondary || '#8b5cf6';

  return (
    <>
      {/* Mobile View - Full Screen */}
      <div className="md:hidden w-full flex flex-col" style={{ 
        backgroundColor: isClientPortal ? '#ffffff' : '#F5F1E8', 
        minHeight: '100dvh' 
      }}>
        {/* Main Content */}
        <div className="flex-1 px-6 flex flex-col justify-between pb-8 pt-16">
          <div>
            {/* Photographer Branding - Client Portal Only */}
            {isClientPortal && domain?.photographer && (
              <div className="text-center mb-10">
                {domain.photographer.logoUrl && (
                  <div className="mb-6 flex justify-center">
                    <img 
                      src={domain.photographer.logoUrl} 
                      alt={domain.photographer.businessName}
                      className="h-20 w-auto object-contain"
                      data-testid="img-photographer-logo"
                    />
                  </div>
                )}
                <h2 className="text-2xl font-semibold mb-1" style={{ color: brandPrimary }} data-testid="text-photographer-name">
                  {domain.photographer.businessName}
                </h2>
                <p className="text-sm text-gray-500">Client Portal</p>
                <div className="mt-4 w-16 h-0.5 mx-auto" style={{ backgroundColor: brandSecondary, opacity: 0.3 }} />
              </div>
            )}
            
            {/* Heading */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-1" style={{ color: isClientPortal ? '#111827' : undefined }}>
                Welcome back
              </h1>
              <p className="text-lg font-medium text-gray-600">
                {isClientPortal ? "Sign in to your client portal" : "to thePhotoCrm"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 max-w-md mx-auto">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-gray-700 font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className={isClientPortal 
                      ? "bg-white border-gray-300 h-12 rounded-lg pl-4 pr-12 focus:ring-2 transition-all"
                      : "bg-gray-50 border-gray-200 h-14 rounded-2xl pl-4 pr-12"
                    }
                    style={isClientPortal ? { 
                      focusVisible: { ringColor: brandSecondary, borderColor: brandSecondary }
                    } : undefined}
                    data-testid="input-email"
                  />
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-gray-700 font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={isClientPortal 
                      ? "bg-white border-gray-300 h-12 rounded-lg pl-4 pr-12 focus:ring-2 transition-all"
                      : "bg-gray-50 border-gray-200 h-14 rounded-2xl pl-4 pr-12"
                    }
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setLocation("/forgot-password")}
                    className="text-sm hover:underline transition-colors"
                    style={{ color: isClientPortal ? brandSecondary : undefined }}
                    data-testid="link-forgot-password"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className={isClientPortal 
                  ? "w-full h-12 rounded-lg text-white font-semibold text-base hover:opacity-90 transition-opacity mt-6"
                  : "w-full h-14 rounded-2xl text-white font-semibold text-base bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:opacity-90 transition-opacity mt-6"
                }
                style={isClientPortal ? { backgroundColor: brandPrimary } : undefined}
                disabled={loading}
                data-testid="button-login"
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            {/* OR Divider - Only show for photographer domain */}
            {!isClientPortal && (
              <>
                <div className="relative my-5 max-w-md mx-auto">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-[#F5F1E8] text-gray-500">Or continue with</span>
                  </div>
                </div>

                {/* Google Sign-In Button */}
                <a
                  href="/api/auth/google"
                  className="w-full h-14 rounded-2xl border-2 border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center gap-3 font-medium text-gray-700 transition-colors max-w-md mx-auto"
                  data-testid="button-google-signin-mobile"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </a>
              </>
            )}

            {/* Magic Link Option - Client Portal Only */}
            {isClientPortal && (
              <div className="mt-5 max-w-md mx-auto">
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">Or</span>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  style={{ 
                    borderColor: brandSecondary, 
                    color: brandPrimary,
                    borderWidth: '2px'
                  }}
                  data-testid="button-request-magic-link"
                  onClick={() => setMagicLinkModalOpen(true)}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email me a login link
                </Button>
              </div>
            )}
          </div>

          {/* Bottom Section */}
          {!isClientPortal && (
            <div className="text-center mt-8">
              <div className="flex justify-center items-center mb-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                  <Camera className="w-7 h-7 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-600">
                New to thePhotoCrm?{" "}
                <button
                  onClick={() => setLocation("/register")}
                  className="font-semibold text-gray-900 underline"
                  data-testid="link-register"
                >
                  Signup
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop View - Split Screen */}
      <div className="hidden md:flex min-h-screen w-full items-center justify-center p-4 md:p-8" style={{ 
        backgroundColor: isClientPortal ? '#f3f4f6' : '#9CA3AF' 
      }}>
        {/* Main Container with rounded corners and shadow */}
        <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
          
          {/* Left Side - Login Form */}
          <div className="w-full md:w-2/5 p-8 md:p-12 flex flex-col" style={{ 
            backgroundColor: isClientPortal ? '#ffffff' : '#F5F1E8' 
          }}>
            {/* Photographer Branding - Client Portal Only */}
            {isClientPortal && domain?.photographer ? (
              <div className="text-center mb-12">
                {domain.photographer.logoUrl && (
                  <div className="mb-6 flex justify-center">
                    <img 
                      src={domain.photographer.logoUrl} 
                      alt={domain.photographer.businessName}
                      className="h-20 w-auto object-contain"
                      data-testid="img-photographer-logo-desktop"
                    />
                  </div>
                )}
                <h2 className="text-2xl font-semibold mb-1" style={{ color: brandPrimary }} data-testid="text-photographer-name-desktop">
                  {domain.photographer.businessName}
                </h2>
                <p className="text-sm text-gray-500">Client Portal</p>
                <div className="mt-4 w-16 h-0.5 mx-auto" style={{ backgroundColor: brandSecondary, opacity: 0.3 }} />
              </div>
            ) : !isClientPortal && (
              /* Logo - Only show for photographer domain */
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-gray-800 rounded-full">
                  <Camera className="w-5 h-5" />
                  <span className="font-semibold text-lg">thePhotoCrm</span>
                </div>
                <p className="text-sm text-gray-600 mt-3 ml-1">CRM for Wedding Photographers</p>
              </div>
            )}

            {/* Form Content */}
            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
              <div className="mb-8 text-center">
                <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: isClientPortal ? '#111827' : undefined }}>
                  Welcome back
                </h1>
                <p className="text-gray-600">
                  {isClientPortal ? "Sign in to your client portal" : "Sign in to your account"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email-desktop" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="email-desktop"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className={isClientPortal 
                      ? "bg-white border-gray-300 h-12 rounded-lg focus:ring-2 transition-all"
                      : "bg-white border-gray-300 h-12 rounded-xl"
                    }
                    data-testid="input-email-desktop"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password-desktop" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password-desktop"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      required
                      className={isClientPortal 
                        ? "bg-white border-gray-300 h-12 rounded-lg pr-12 focus:ring-2 transition-all"
                        : "bg-white border-gray-300 h-12 rounded-xl pr-12"
                      }
                      data-testid="input-password-desktop"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      data-testid="button-toggle-password-desktop"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setLocation("/forgot-password")}
                      className="text-sm hover:underline transition-colors"
                      style={{ color: isClientPortal ? brandSecondary : undefined }}
                      data-testid="link-forgot-password-desktop"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className={isClientPortal 
                    ? "w-full h-12 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
                    : "w-full h-12 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:opacity-90 transition-opacity"
                  }
                  style={isClientPortal ? { backgroundColor: brandPrimary } : undefined}
                  disabled={loading}
                  data-testid="button-login-desktop"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>

              {/* Google OAuth - Photographer Domain Only */}
              {!isClientPortal && (
                <>
                  {/* OR Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-[#F5F1E8] text-gray-500">Or continue with</span>
                    </div>
                  </div>

                  {/* Google Sign-In Button */}
                  <a
                    href="/api/auth/google"
                    className="w-full h-12 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center gap-3 font-medium text-gray-700 transition-colors"
                    data-testid="button-google-signin"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </a>

                  <div className="mt-8 text-center">
                    <p className="text-sm text-gray-600">
                      Don't have an account?{" "}
                      <button
                        onClick={() => setLocation("/register")}
                        className="font-semibold text-gray-900 hover:underline"
                        data-testid="link-register-desktop"
                      >
                        Sign up
                      </button>
                    </p>
                  </div>
                </>
              )}

              {/* Magic Link Option - Client Portal Only */}
              {isClientPortal && (
                <div className="mt-6">
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">Or</span>
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    style={{ 
                      borderColor: brandSecondary, 
                      color: brandPrimary,
                      borderWidth: '2px'
                    }}
                    data-testid="button-request-magic-link-desktop"
                    onClick={() => setMagicLinkModalOpen(true)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email me a login link
                  </Button>
                </div>
              )}
            </div>

            {/* Footer Links */}
            {isClientPortal && (
              <div className="mt-auto pt-8 text-center text-xs text-gray-400">
                Powered by thePhotoCrm
              </div>
            )}
            {!isClientPortal && (
              <div className="mt-auto pt-8 flex justify-center gap-6 text-xs text-gray-500">
                <button className="hover:text-gray-700 underline">Terms & Conditions</button>
              </div>
            )}
          </div>

          {/* Right Side - Photography Background (only for client portal) */}
          {isClientPortal && (
            <div className="hidden md:block md:w-3/5 relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
              {/* Background Image with overlay */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-40"
                style={{ 
                  backgroundImage: `url(${weddingPhoto})`,
                }}
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0" style={{
                background: `linear-gradient(135deg, ${brandPrimary}15 0%, ${brandSecondary}10 100%)`
              }} />
              
              {/* Centered Branding Message */}
              <div className="absolute inset-0 flex items-center justify-center p-12">
                <div className="text-center max-w-md">
                  <Sparkles className="w-16 h-16 mx-auto mb-6" style={{ color: brandPrimary, opacity: 0.8 }} />
                  <h3 className="text-3xl font-bold mb-4" style={{ color: brandPrimary }}>
                    Your photos await
                  </h3>
                  <p className="text-lg text-gray-600">
                    Access your galleries, contracts, and project details all in one place
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Right Side - Photography Background (only for photographer login) */}
          {!isClientPortal && (
            <div className="hidden md:block md:w-3/5 relative overflow-hidden">
              {/* Background Image */}
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                  backgroundImage: `url(${weddingPhoto})`,
                }}
              />
              
              {/* Gradient Overlay for better contrast */}
              <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />
            </div>
          )}
        </div>
      </div>

      {/* Magic Link Request Modal */}
      <Dialog open={magicLinkModalOpen} onOpenChange={setMagicLinkModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Login Link</DialogTitle>
            <DialogDescription>
              We'll send a secure login link to your email address
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="magic-link-email">Email Address</Label>
              <Input
                id="magic-link-email"
                type="email"
                placeholder="your@email.com"
                value={magicLinkEmail}
                onChange={(e) => setMagicLinkEmail(e.target.value)}
                data-testid="input-magic-link-email"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => requestMagicLinkMutation.mutate(magicLinkEmail)}
              disabled={!magicLinkEmail || requestMagicLinkMutation.isPending}
              data-testid="button-send-magic-link"
            >
              {requestMagicLinkMutation.isPending ? "Sending..." : "Send Login Link"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
