import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Camera, Eye, EyeOff, ShieldCheck, Link as LinkIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function LinkGoogle() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const linkToken = params.get("token");
    const email = params.get("email");
    
    if (!linkToken) {
      toast({
        title: "Invalid link",
        description: "No linking token found. Please try signing in with Google again.",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }
    
    setToken(linkToken);
    setUserEmail(email);
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast({
        title: "Error",
        description: "Invalid linking token",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await apiRequest("/api/auth/link-google", {
        method: "POST",
        body: JSON.stringify({ token, password }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      toast({
        title: "Success!",
        description: "Your Google account has been linked successfully.",
      });
      
      window.location.href = "/dashboard";
    } catch (error: any) {
      toast({
        title: "Linking failed",
        description: error.message || "Invalid password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <>
      {/* Mobile View - Full Screen */}
      <div className="md:hidden w-full flex flex-col" style={{ backgroundColor: '#F5F1E8', minHeight: '100dvh' }}>
        <div className="flex-1 px-6 flex flex-col justify-between pb-8 pt-16">
          <div>
            {/* Security Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Heading */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Link Google Account</h1>
              <p className="text-base text-gray-600 px-4">
                An account with {userEmail || "this email"} already exists
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 max-w-md mx-auto">
              <div className="flex gap-3">
                <LinkIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-700">
                    To link your Google account to your existing account, please verify your password.
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 max-w-md mx-auto">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs text-gray-600 font-normal">
                  Confirm Your Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    required
                    autoFocus
                    className="bg-gray-50 border-gray-200 h-14 rounded-2xl pl-4 pr-12"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 rounded-2xl text-white font-semibold text-base bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:opacity-90 transition-opacity mt-6"
                disabled={loading}
                data-testid="button-link-account"
              >
                {loading ? "LINKING..." : "LINK ACCOUNT"}
              </Button>
            </form>

            {/* Cancel Option */}
            <div className="text-center mt-6">
              <button
                onClick={() => setLocation("/login")}
                className="text-sm text-gray-600 hover:text-gray-900"
                data-testid="link-cancel"
              >
                Cancel and return to login
              </button>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="text-center mt-8">
            <div className="flex justify-center items-center mb-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                <Camera className="w-7 h-7 text-white" />
              </div>
            </div>
            <p className="text-sm text-gray-600">
              After linking, you can sign in with either Google or your password
            </p>
          </div>
        </div>
      </div>

      {/* Desktop View - Split Screen */}
      <div className="hidden md:flex min-h-screen w-full items-center justify-center p-4 md:p-8" style={{ backgroundColor: '#9CA3AF' }}>
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
          
          {/* Left Side - Form */}
          <div className="w-full md:w-3/5 p-8 md:p-12 flex flex-col" style={{ backgroundColor: '#F5F1E8' }}>
            {/* Logo */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-gray-800 rounded-full">
                <Camera className="w-5 h-5" />
                <span className="font-semibold text-lg">thePhotoCrm</span>
              </div>
              <p className="text-sm text-gray-600 mt-3 ml-1">CRM for Wedding Photographers</p>
            </div>

            {/* Form Content */}
            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
              <div className="flex justify-center mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                  <ShieldCheck className="w-10 h-10 text-white" />
                </div>
              </div>

              <div className="mb-8 text-center">
                <h1 className="text-3xl md:text-4xl font-bold mb-3">Link Google Account</h1>
                <p className="text-gray-600">
                  An account with {userEmail || "this email"} already exists
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex gap-3">
                  <LinkIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700">
                      To link your Google account to your existing account, please verify your password. After linking, you can sign in with either method.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password-desktop" className="text-sm font-medium text-gray-700">
                    Confirm Your Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password-desktop"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      required
                      autoFocus
                      className="bg-white border-gray-300 h-12 rounded-xl pr-12"
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
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:opacity-90 transition-opacity"
                  disabled={loading}
                  data-testid="button-link-account-desktop"
                >
                  {loading ? "LINKING..." : "LINK ACCOUNT"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setLocation("/login")}
                    className="text-sm text-gray-600 hover:text-gray-900"
                    data-testid="link-cancel-desktop"
                  >
                    Cancel and return to login
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Side - Visual */}
          <div className="hidden md:block md:w-2/5 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-12 flex flex-col justify-center text-white relative overflow-hidden">
            <div className="relative z-10">
              <ShieldCheck className="w-16 h-16 mb-6" />
              <h2 className="text-3xl font-bold mb-4">Secure Account Linking</h2>
              <p className="text-blue-100 text-lg mb-6">
                Link your Google account for faster sign-ins while keeping your existing account secure.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span>Sign in with Google or password</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span>Keep all your existing data and settings</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span>Enhanced security with multi-factor options</span>
                </li>
              </ul>
            </div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>
    </>
  );
}
