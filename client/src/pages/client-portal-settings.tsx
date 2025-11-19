import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Mail, Phone, Save } from "lucide-react";
import { ClientPortalLayout } from "@/components/layout/client-portal-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const settingsFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

interface ClientInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export default function ClientPortalSettings() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch client contact information
  const { data: clientInfo, isLoading } = useQuery<ClientInfo>({
    queryKey: ["/api/client-portal/contact-info"],
    enabled: !!user
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      firstName: clientInfo?.firstName || "",
      lastName: clientInfo?.lastName || "",
      email: clientInfo?.email || "",
      phone: clientInfo?.phone || "",
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (clientInfo) {
      form.reset({
        firstName: clientInfo.firstName,
        lastName: clientInfo.lastName,
        email: clientInfo.email,
        phone: clientInfo.phone || "",
      });
    }
  }, [clientInfo, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      return await apiRequest("PUT", "/api/client-portal/contact-info", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/contact-info"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Success",
        description: "Your contact information has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update contact information",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    updateMutation.mutate(data);
  };

  if (!authLoading && !user) {
    setLocation("/login");
    return null;
  }

  if (isLoading || authLoading) {
    return (
      <ClientPortalLayout>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </ClientPortalLayout>
    );
  }

  return (
    <ClientPortalLayout>
      <div className="p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">Manage your contact information and preferences.</p>
          </div>

          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Contact Information
              </CardTitle>
              <CardDescription>
                Update your personal details to stay connected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              data-testid="input-first-name"
                              placeholder="Enter your first name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              data-testid="input-last-name"
                              placeholder="Enter your last name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Email Field */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <Input 
                              {...field} 
                              type="email"
                              className="pl-10"
                              data-testid="input-email"
                              placeholder="your.email@example.com"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone Field */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <Input 
                              {...field} 
                              type="tel"
                              className="pl-10"
                              data-testid="input-phone"
                              placeholder="(555) 123-4567"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      disabled={updateMutation.isPending}
                      data-testid="button-save-settings"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientPortalLayout>
  );
}
