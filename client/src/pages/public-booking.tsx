import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  CheckCircle, 
  Camera,
  Video
} from "lucide-react";
import type { Booking } from "@shared/schema";

// Form validation schema matching server-side validation
const bookingConfirmationSchema = z.object({
  clientName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  clientEmail: z.string().email("Invalid email address").max(255, "Email too long"),
  clientPhone: z.string().min(10, "Phone number must be at least 10 digits").max(20, "Phone number too long")
});

type BookingConfirmationForm = z.infer<typeof bookingConfirmationSchema>;

export default function PublicBooking() {
  const [, params] = useRoute("/public/booking/:token");
  const { toast } = useToast();
  
  // Initialize form with react-hook-form and zodResolver
  const form = useForm<BookingConfirmationForm>({
    resolver: zodResolver(bookingConfirmationSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientPhone: ""
    }
  });

  const { data: booking, isLoading } = useQuery<Booking>({
    queryKey: [`/api/public/booking/${params?.token}`],
    enabled: !!params?.token
  });

  const confirmBookingMutation = useMutation({
    mutationFn: async (formData: BookingConfirmationForm) => {
      const result = await apiRequest("POST", `/api/public/booking/${params?.token}/confirm`, formData);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Booking confirmed!",
        description: "You'll receive a confirmation email shortly.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/public/booking/${params?.token}`] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || "Failed to confirm booking. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: BookingConfirmationForm) => {
    confirmBookingMutation.mutate(values);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Booking Not Found</h2>
            <p className="text-muted-foreground">
              The booking you're looking for doesn't exist or may have expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (booking.status === "CONFIRMED") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2 text-green-700 dark:text-green-400">
              Booking Confirmed!
            </h2>
            <p className="text-muted-foreground mb-4">
              Your appointment has been confirmed. You'll receive a confirmation email with all the details.
            </p>
            {booking.googleMeetLink && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Video className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-blue-800 dark:text-blue-400 mb-2">
                  This will be a video call
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(booking.googleMeetLink!, '_blank')}
                  data-testid="button-join-meeting"
                >
                  Join Meeting (when it's time)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Camera className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Confirm Your Appointment</h1>
          <p className="text-muted-foreground">
            Please confirm your booking details below
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Appointment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg" data-testid="text-booking-title">
                {booking.title}
              </h3>
              {booking.description && (
                <p className="text-muted-foreground mt-1" data-testid="text-booking-description">
                  {booking.description}
                </p>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium" data-testid="text-booking-date">
                    {formatDate(booking.startAt)}
                  </p>
                  <p className="text-sm text-muted-foreground">Date</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium" data-testid="text-booking-time">
                    {formatTime(booking.startAt)} - {formatTime(booking.endAt)}
                  </p>
                  <p className="text-sm text-muted-foreground">Time</p>
                </div>
              </div>
            </div>

            {booking.bookingType && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize" data-testid="badge-booking-type">
                  {booking.bookingType.toLowerCase().replace('_', ' ')}
                </Badge>
                {booking.googleMeetLink && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    Video Call
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-booking-form">
          <CardHeader>
            <CardTitle data-testid="title-booking-form">Your Information</CardTitle>
            <p className="text-sm text-muted-foreground" data-testid="text-form-description">
              Please provide your contact details to confirm this appointment
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-client-name">Full Name *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Enter your full name"
                            className="pl-10"
                            data-testid="input-client-name"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage data-testid="error-client-name" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-client-email">Email Address *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="Enter your email address"
                            className="pl-10"
                            data-testid="input-client-email"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage data-testid="error-client-email" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-client-phone">Phone Number *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="tel"
                            placeholder="Enter your phone number"
                            className="pl-10"
                            data-testid="input-client-phone"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage data-testid="error-client-phone" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={confirmBookingMutation.isPending}
                  data-testid="button-confirm-booking"
                >
                  {confirmBookingMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Appointment
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground" data-testid="text-booking-terms">
          <p data-testid="text-terms-agreement">
            By confirming this appointment, you agree to attend at the scheduled time.
            {booking.isFirstBooking && (
              <span className="block mt-1 text-primary font-medium" data-testid="text-first-booking-notice">
                This is your first booking - you'll automatically be moved to our consultation process!
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}