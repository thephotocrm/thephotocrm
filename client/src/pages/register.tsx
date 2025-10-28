import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Camera, Eye, EyeOff, Mail, Building2 } from "lucide-react";
import photographerPhoto from "@assets/stock_images/happy_photographer_w_b5ffd29e.jpg";

export default function Register() {
  const [, setLocation] = useLocation();
  const { register, user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await register({ email, password, businessName });
      toast({
        title: "Account created!",
        description: "Your photographer account has been created. Please sign in.",
      });
      setLocation("/login");
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Mobile View - Full Screen */}
      <div className="md:hidden w-full flex flex-col" style={{ backgroundColor: '#F5F1E8', minHeight: '100dvh' }}>
        {/* Main Content */}
        <div className="flex-1 px-6 flex flex-col justify-between pb-8 pt-16">
          <div>
            {/* Heading */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-1">Create account</h1>
              <p className="text-lg font-medium">Start your 14-day free trial</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 max-w-md mx-auto">
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-xs text-gray-600 font-normal">
                  Business Name
                </Label>
                <div className="relative">
                  <Input
                    id="businessName"
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your Photography Studio"
                    required
                    className="bg-gray-50 border-gray-200 h-14 rounded-2xl pl-4 pr-12"
                    data-testid="input-business-name"
                  />
                  <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs text-gray-600 font-normal">
                  Email
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    className="bg-gray-50 border-gray-200 h-14 rounded-2xl pl-4 pr-12"
                    data-testid="input-email"
                  />
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs text-gray-600 font-normal">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    required
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
                data-testid="button-register"
              >
                {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
              </Button>
            </form>
          </div>

          {/* Bottom Section */}
          <div className="text-center mt-8">
            <div className="flex justify-center items-center mb-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                <Camera className="w-7 h-7 text-white" />
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <button
                onClick={() => setLocation("/login")}
                className="font-semibold text-gray-900 underline"
                data-testid="link-login"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Desktop View - Split Screen */}
      <div className="hidden md:flex min-h-screen w-full items-center justify-center p-4 md:p-8" style={{ backgroundColor: '#9CA3AF' }}>
        {/* Main Container with rounded corners and shadow */}
        <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
          
          {/* Left Side - Photography Background */}
          <div className="hidden md:block md:w-3/5 relative overflow-hidden">
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ 
                backgroundImage: `url(${photographerPhoto})`,
              }}
            />
            
            {/* Gradient Overlay for better contrast */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />
          </div>

          {/* Right Side - Signup Form */}
          <div className="w-full md:w-2/5 p-8 md:p-12 flex flex-col" style={{ backgroundColor: '#F5F1E8' }}>
            {/* Logo */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-gray-800 rounded-full">
                <Camera className="w-5 h-5" />
                <span className="font-semibold text-lg">thePhotoCrm</span>
              </div>
              <p className="text-sm text-gray-600 mt-3 ml-1">CRM for Wedding Photographers</p>
            </div>

            {/* Form Content */}
            <div className="flex-1 flex flex-col justify-center max-w-sm">
              <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Create your account</h1>
                <p className="text-gray-600">Start your 14-day free trial</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="businessName-desktop" className="text-sm font-medium text-gray-700">
                    Business Name
                  </Label>
                  <Input
                    id="businessName-desktop"
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your Photography Studio"
                    required
                    className="bg-white border-gray-300 h-12 rounded-xl"
                    data-testid="input-business-name-desktop"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-desktop" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="email-desktop"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    required
                    className="bg-white border-gray-300 h-12 rounded-xl"
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
                  data-testid="button-register-desktop"
                >
                  {loading ? "Creating account..." : "Create account and start 14 day trial"}
                </Button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <button
                    onClick={() => setLocation("/login")}
                    className="font-semibold text-gray-900 hover:underline"
                    data-testid="link-login-desktop"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>

            {/* Footer Links */}
            <div className="mt-auto pt-8 flex justify-center gap-6 text-xs text-gray-500">
              <button className="hover:text-gray-700 underline">Terms & Conditions</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
