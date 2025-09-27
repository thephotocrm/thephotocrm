import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const clientFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
  emailOptIn: z.boolean().default(true),
  smsOptIn: z.boolean().default(true),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  initialData?: Partial<ClientFormData>;
  onSubmit: (data: ClientFormData) => void;
  isLoading?: boolean;
  submitText?: string;
}

export default function ClientForm({ 
  initialData, 
  onSubmit, 
  isLoading = false,
  submitText = "Save Client"
}: ClientFormProps) {
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      notes: initialData?.notes || "",
      emailOptIn: initialData?.emailOptIn ?? true,
      smsOptIn: initialData?.smsOptIn ?? true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
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
                    placeholder="Enter first name"
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
                    placeholder="Enter last name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Contact Information */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="email"
                  data-testid="input-email"
                  placeholder="Enter email address"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="tel"
                  data-testid="input-phone"
                  placeholder="Enter phone number"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  data-testid="textarea-notes"
                  placeholder="Additional notes about the client..."
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Communication Preferences */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Communication Preferences</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Choose how you'd like to receive updates about your project. You can update these preferences at any time.
            </p>
          </div>
          
          <FormField
            control={form.control}
            name="emailOptIn"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-email-opt-in"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm font-normal">
                    Email communications
                  </FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Receive project updates, appointment reminders, and important notifications via email
                  </p>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="smsOptIn"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg bg-card">
                <div className="space-y-1">
                  <FormLabel className="text-sm font-medium">
                    📱 SMS notifications & automations
                  </FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Enable to receive SMS updates and automated messages. Required for SMS automation workflows.
                    Message and data rates may apply. Reply STOP to opt out anytime.
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-sms-opt-in"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="bg-muted/50 p-3 rounded-md">
            <p className="text-xs text-muted-foreground">
              <strong>Privacy Notice:</strong> Your contact information will only be used for photography services and communications. 
              We respect your privacy and will never share your information with third parties. 
              You may opt out of any communications at any time.
            </p>
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={isLoading}
          data-testid="button-submit-client-form"
        >
          {isLoading ? "Saving..." : submitText}
        </Button>
      </form>
    </Form>
  );
}
