import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Camera, Eye, EyeOff, Mail } from "lucide-react";
import weddingPhoto from "@assets/stock_images/professional_wedding_67201dd8.jpg";
import bridePhoto from "@assets/stock_images/elegant_bride_portra_230e6331.jpg";
import couplePhoto from "@assets/stock_images/romantic_couple_wedd_59a9d3f2.jpg";
import celebrationPhoto from "@assets/stock_images/wedding_celebration__be8a7c2c.jpg";
import groomPhoto from "@assets/stock_images/groom_portrait_weddi_fd40303a.jpg";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <>
      {/* Mobile View - Full Screen */}
      <div className="md:hidden min-h-screen w-full flex flex-col bg-white">
        {/* Top Photography Circles */}
        <div className="relative h-40 overflow-hidden">
          <div className="absolute top-4 left-6 w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-lg">
            <img src={bridePhoto} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute top-3 right-10 w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-lg">
            <img src={couplePhoto} alt="" className="w-full h-full object-cover opacity-85" />
          </div>
          <div className="absolute top-22 left-16 w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg">
            <img src={celebrationPhoto} alt="" className="w-full h-full object-cover opacity-70" />
          </div>
          <div className="absolute top-20 right-20 w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-lg">
            <img src={groomPhoto} alt="" className="w-full h-full object-cover opacity-75" />
          </div>
          <div className="absolute top-24 right-8 w-13 h-13 rounded-full overflow-hidden border-2 border-white shadow-lg">
            <img src={weddingPhoto} alt="" className="w-full h-full object-cover opacity-65" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-6 flex flex-col justify-between pb-8">
          <div>
            {/* Heading */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-1">Welcome back</h1>
              <p className="text-lg font-medium">to thePhotoCrm</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 max-w-md mx-auto">
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
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setLocation("/forgot-password")}
                    className="text-xs text-gray-600 hover:text-gray-900"
                    data-testid="link-forgot-password"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 rounded-2xl text-white font-semibold text-base bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:opacity-90 transition-opacity mt-6"
                disabled={loading}
                data-testid="button-login"
              >
                {loading ? "SIGNING IN..." : "LOGIN"}
              </Button>
            </form>
          </div>

          {/* Bottom Section */}
          <div className="text-center mt-8">
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
        </div>
      </div>

      {/* Desktop View - Split Screen */}
      <div className="hidden md:flex min-h-screen w-full items-center justify-center p-4 md:p-8" style={{ backgroundColor: '#9CA3AF' }}>
        {/* Main Container with rounded corners and shadow */}
        <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
          
          {/* Left Side - Login Form */}
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
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome back</h1>
                <p className="text-gray-600">Sign in to your account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
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
                  data-testid="button-login-desktop"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Button 
                  variant="link" 
                  className="text-sm text-gray-600 hover:text-gray-900 p-0 h-auto" 
                  onClick={() => setLocation("/forgot-password")}
                  type="button"
                  data-testid="link-forgot-password-desktop"
                >
                  Forgot password?
                </Button>
              </div>

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
            </div>

            {/* Footer Links */}
            <div className="mt-auto pt-8 flex justify-center gap-6 text-xs text-gray-500">
              <button className="hover:text-gray-700 underline">Terms & Conditions</button>
            </div>
          </div>

          {/* Right Side - Photography Background */}
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
            
            {/* Floating Mockup Elements - Similar to reference */}
            <div className="absolute inset-0 flex items-center justify-center p-12">
              {/* You can add floating UI mockups here similar to the reference image */}
              {/* For now, keeping it clean with just the photo */}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
