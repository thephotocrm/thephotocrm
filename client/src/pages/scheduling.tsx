import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Users, CheckCircle, Plus, CalendarDays, X } from "lucide-react";

// Form schema for availability slots
const availabilitySchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.enum(["WEEKLY", "DAILY"]).optional()
}).refine((data) => {
  // Validate that end time is after start time
  if (data.startTime && data.endTime) {
    return data.endTime > data.startTime;
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["endTime"]
}).refine((data) => {
  // If recurring is enabled, require recurrence pattern
  if (data.isRecurring && !data.recurrencePattern) {
    return false;
  }
  return true;
}, {
  message: "Recurrence pattern is required when recurring is enabled",
  path: ["recurrencePattern"]
});

// Form schema for bookings
const bookingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  bookingType: z.enum(["CONSULTATION", "ENGAGEMENT", "WEDDING", "MEETING"]).default("CONSULTATION"),
  clientSource: z.enum(["existing", "manual"]).default("manual"),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  clientPhone: z.string().optional()
}).refine((data) => {
  // Validate that end time is after start time
  if (data.startTime && data.endTime) {
    return data.endTime > data.startTime;
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["endTime"]
}).refine((data) => {
  // Validate that either clientId OR manual fields are provided
  if (data.clientSource === "existing") {
    return !!data.clientId;
  } else {
    // For manual entry, require at least name and one contact method
    return !!data.clientName && (!!data.clientEmail || !!data.clientPhone);
  }
}, {
  message: "Please provide client information",
  path: ["clientName"]
});

type AvailabilityFormData = z.infer<typeof availabilitySchema>;
type BookingFormData = z.infer<typeof bookingSchema>;

export default function Scheduling() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Modal state
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<any>(null);
  
  // Queries
  const { data: availabilitySlots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ["/api/availability"],
    enabled: !!user
  }) as { data: any[]; isLoading: boolean };
  
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings"],
    enabled: !!user
  }) as { data: any[]; isLoading: boolean };
  
  const { data: calendarStatus, isLoading: calendarStatusLoading } = useQuery({
    queryKey: ["/api/calendar/status"],
    enabled: !!user
  }) as { data: { configured?: boolean; authenticated?: boolean; message?: string } | undefined; isLoading: boolean };
  
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    enabled: !!user
  }) as { data: any[]; isLoading: boolean };
  
  // Availability form
  const availabilityForm = useForm<AvailabilityFormData>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      date: "",
      startTime: "",
      endTime: "",
      title: "",
      description: "",
      isRecurring: false,
      recurrencePattern: "WEEKLY"
    }
  });

  // Booking form
  const bookingForm = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      title: "",
      description: "",
      date: "",
      startTime: "",
      endTime: "",
      bookingType: "CONSULTATION",
      clientSource: "manual",
      clientId: "",
      clientName: "",
      clientEmail: "",
      clientPhone: ""
    }
  });
  
  // Create availability mutation
  const createAvailabilityMutation = useMutation({
    mutationFn: async (data: AvailabilityFormData) => {
      // Transform form data to match backend schema
      const slotData = {
        title: data.title,
        description: data.description || null,
        startAt: new Date(`${data.date}T${data.startTime}`).toISOString(),
        endAt: new Date(`${data.date}T${data.endTime}`).toISOString(),
        isRecurring: data.isRecurring,
        recurrencePattern: data.isRecurring ? data.recurrencePattern : null
      };
      
      return apiRequest("POST", "/api/availability", slotData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
      setIsAvailabilityModalOpen(false);
      availabilityForm.reset();
      toast({
        title: "Success",
        description: "Availability slot created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create availability slot",
        variant: "destructive"
      });
    }
  });

  // Update availability mutation
  const updateAvailabilityMutation = useMutation({
    mutationFn: async (data: AvailabilityFormData & { id: string }) => {
      const slotData = {
        title: data.title,
        description: data.description || null,
        startAt: new Date(`${data.date}T${data.startTime}`).toISOString(),
        endAt: new Date(`${data.date}T${data.endTime}`).toISOString(),
        isRecurring: data.isRecurring,
        recurrencePattern: data.isRecurring ? data.recurrencePattern : null
      };
      
      return apiRequest("PUT", `/api/availability/${data.id}`, slotData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
      setIsAvailabilityModalOpen(false);
      setEditingSlot(null);
      availabilityForm.reset();
      toast({
        title: "Success",
        description: "Availability slot updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update availability slot",
        variant: "destructive"
      });
    }
  });

  // Delete availability mutation
  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/availability/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
      toast({
        title: "Success",
        description: "Availability slot deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete availability slot",
        variant: "destructive"
      });
    }
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      // Transform form data to match backend schema
      const bookingData = {
        title: data.title,
        description: data.description || null,
        startAt: new Date(`${data.date}T${data.startTime}`).toISOString(),
        endAt: new Date(`${data.date}T${data.endTime}`).toISOString(),
        bookingType: data.bookingType,
        status: "PENDING",
        // Include clientId if using existing client, otherwise use manual fields
        ...(data.clientSource === "existing" 
          ? { clientId: data.clientId }
          : { 
              clientName: data.clientName || null,
              clientEmail: data.clientEmail || null,
              clientPhone: data.clientPhone || null
            }
        )
      };
      
      return apiRequest("POST", "/api/bookings", bookingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setIsBookingModalOpen(false);
      bookingForm.reset();
      toast({
        title: "Success",
        description: "Booking created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create booking",
        variant: "destructive"
      });
    }
  });

  // Handle edit slot
  const handleEditSlot = (slot: any) => {
    const startDate = new Date(slot.startAt);
    const endDate = new Date(slot.endAt);
    
    setEditingSlot(slot);
    availabilityForm.reset({
      date: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().substring(0, 5),
      endTime: endDate.toTimeString().substring(0, 5),
      title: slot.title,
      description: slot.description || "",
      isRecurring: slot.isRecurring || false,
      recurrencePattern: slot.recurrencePattern || "WEEKLY"
    });
    setIsAvailabilityModalOpen(true);
  };

  // Handle submit (create or update)
  const handleSubmit = (data: AvailabilityFormData) => {
    if (editingSlot) {
      updateAvailabilityMutation.mutate({ ...data, id: editingSlot.id });
    } else {
      createAvailabilityMutation.mutate(data);
    }
  };

  // Handle modal open/close
  const handleModalChange = (open: boolean) => {
    setIsAvailabilityModalOpen(open);
    if (!open) {
      setEditingSlot(null);
      availabilityForm.reset();
    }
  };

  // Handle new availability click
  const handleNewAvailability = () => {
    setEditingSlot(null);
    availabilityForm.reset();
    setIsAvailabilityModalOpen(true);
  };

  // Redirect to login if not authenticated
  if (!loading && !user) {
    setLocation("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="bg-card border-b border-border px-4 md:px-6 py-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SidebarTrigger 
                data-testid="button-menu-toggle" 
                className="absolute top-4 right-4 z-10 h-10 w-10 bg-primary/10 border border-primary/20 md:relative md:top-auto md:right-auto md:z-auto md:h-7 md:w-7 md:bg-transparent md:border-0" 
              />
              <div className="pr-12 md:pr-0">
                <h1 className="text-xl md:text-2xl font-semibold">Scheduling</h1>
                <p className="text-sm md:text-base text-muted-foreground">Manage availability and client bookings</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Dialog open={isAvailabilityModalOpen} onOpenChange={handleModalChange}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-set-availability">
                    <Clock className="w-5 h-5 mr-2" />
                    Set Availability
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md" aria-describedby="availability-description">
                  <DialogHeader>
                    <DialogTitle>{editingSlot ? "Edit Availability" : "Set Availability"}</DialogTitle>
                  </DialogHeader>
                  <p id="availability-description" className="text-sm text-muted-foreground mb-4">
                    Create time slots when you're available for client bookings
                  </p>
                  <Form {...availabilityForm}>
                    <form onSubmit={availabilityForm.handleSubmit(handleSubmit)} className="space-y-4">
                      <FormField
                        control={availabilityForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Available for consultations" data-testid="input-availability-title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={availabilityForm.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" data-testid="input-availability-date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={availabilityForm.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Time</FormLabel>
                              <FormControl>
                                <Input type="time" data-testid="input-availability-start-time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={availabilityForm.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Time</FormLabel>
                              <FormControl>
                                <Input type="time" data-testid="input-availability-end-time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={availabilityForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Available for consultation calls" data-testid="input-availability-description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={availabilityForm.control}
                        name="isRecurring"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={(e) => field.onChange(e.target.checked)}
                                data-testid="checkbox-availability-recurring"
                                className="w-4 h-4"
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Make this recurring</FormLabel>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {availabilityForm.watch("isRecurring") && (
                        <FormField
                          control={availabilityForm.control}
                          name="recurrencePattern"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Recurrence Pattern</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} data-testid="select-availability-recurrence">
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select pattern" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                                  <SelectItem value="DAILY">Daily</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsAvailabilityModalOpen(false)}
                          data-testid="button-cancel-availability"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createAvailabilityMutation.isPending || updateAvailabilityMutation.isPending}
                          data-testid="button-save-availability"
                        >
                          {(createAvailabilityMutation.isPending || updateAvailabilityMutation.isPending) 
                            ? "Saving..." 
                            : editingSlot ? "Update" : "Save"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-booking">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Booking
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl" aria-describedby="booking-description">
                  <DialogHeader>
                    <DialogTitle>Add Manual Booking</DialogTitle>
                  </DialogHeader>
                  <p id="booking-description" className="text-sm text-muted-foreground mb-4">
                    Create a manual booking for clients outside the normal booking flow
                  </p>
                  <Form {...bookingForm}>
                    <form onSubmit={bookingForm.handleSubmit(createBookingMutation.mutate)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={bookingForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title *</FormLabel>
                              <FormControl>
                                <Input placeholder="Consultation Call" data-testid="input-booking-title" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={bookingForm.control}
                          name="bookingType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Booking Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} data-testid="select-booking-type">
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="CONSULTATION">Consultation</SelectItem>
                                  <SelectItem value="ENGAGEMENT">Engagement Session</SelectItem>
                                  <SelectItem value="WEDDING">Wedding Day</SelectItem>
                                  <SelectItem value="MEETING">Meeting</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={bookingForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Discuss wedding photography package..." data-testid="input-booking-description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={bookingForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date *</FormLabel>
                              <FormControl>
                                <Input type="date" data-testid="input-booking-date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={bookingForm.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Time *</FormLabel>
                              <FormControl>
                                <Input type="time" data-testid="input-booking-start-time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={bookingForm.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Time *</FormLabel>
                              <FormControl>
                                <Input type="time" data-testid="input-booking-end-time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3 text-sm">Client Information</h4>
                        
                        {/* Client Source Selection */}
                        <FormField
                          control={bookingForm.control}
                          name="clientSource"
                          render={({ field }) => (
                            <FormItem className="mb-4">
                              <FormLabel>How would you like to add client information?</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  className="flex flex-col space-y-2"
                                  data-testid="radio-client-source"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="existing" id="existing" data-testid="radio-existing-client" />
                                    <Label htmlFor="existing">Select from existing clients</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="manual" id="manual" data-testid="radio-manual-client" />
                                    <Label htmlFor="manual">Enter client details manually</Label>
                                  </div>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Existing Client Selection */}
                        {bookingForm.watch("clientSource") === "existing" && (
                          <FormField
                            control={bookingForm.control}
                            name="clientId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Select Client *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} data-testid="select-existing-client">
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose a client..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {clientsLoading ? (
                                      <SelectItem value="" disabled>Loading clients...</SelectItem>
                                    ) : clients.length === 0 ? (
                                      <SelectItem value="" disabled>No clients found</SelectItem>
                                    ) : (
                                      clients.map((client: any) => (
                                        <SelectItem key={client.id} value={client.id}>
                                          {client.name} {client.email ? `(${client.email})` : ''}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {/* Manual Client Entry */}
                        {bookingForm.watch("clientSource") === "manual" && (
                          <div className="space-y-4">
                            <FormField
                              control={bookingForm.control}
                              name="clientName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Client Name *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="John & Jane Smith" data-testid="input-booking-client-name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={bookingForm.control}
                                name="clientEmail"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Client Email</FormLabel>
                                    <FormControl>
                                      <Input type="email" placeholder="john@example.com" data-testid="input-booking-client-email" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={bookingForm.control}
                                name="clientPhone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Client Phone</FormLabel>
                                    <FormControl>
                                      <Input type="tel" placeholder="(555) 123-4567" data-testid="input-booking-client-phone" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              * Please provide at least an email or phone number
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsBookingModalOpen(false)}
                          data-testid="button-cancel-booking"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createBookingMutation.isPending}
                          data-testid="button-save-booking"
                        >
                          {createBookingMutation.isPending ? "Creating..." : "Create Booking"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-monthly-bookings">
                  {bookingsLoading ? "..." : bookings.filter((booking: any) => {
                    const bookingDate = new Date(booking.startAt || booking.createdAt);
                    const now = new Date();
                    return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear();
                  }).length}
                </div>
                <p className="text-xs text-muted-foreground">Bookings scheduled</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Slots</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-available-slots">
                  {slotsLoading ? "..." : availabilitySlots.length}
                </div>
                <p className="text-xs text-muted-foreground">Open time slots</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-confirmed-bookings">
                  {bookingsLoading ? "..." : bookings.filter((booking: any) => booking.status === "CONFIRMED").length}
                </div>
                <p className="text-xs text-muted-foreground">Confirmed bookings</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-pending-bookings">
                  {bookingsLoading ? "..." : bookings.filter((booking: any) => booking.status === "PENDING").length}
                </div>
                <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
              </CardContent>
            </Card>
          </div>

          {/* Calendar View */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <CalendarDays className="w-5 h-5 mr-2" />
                  Calendar View
                </CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">Week</Button>
                  <Button variant="outline" size="sm">Month</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {calendarStatusLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-muted-foreground">Checking calendar status...</p>
                </div>
              ) : calendarStatus?.configured && calendarStatus?.authenticated ? (
                <div className="text-center py-12">
                  <CalendarDays className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-green-700 dark:text-green-400 mb-4 font-medium">Google Calendar Connected!</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your availability and bookings will sync with Google Calendar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Full calendar view coming soon
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarDays className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Google Calendar not connected</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect with Google Calendar to sync your availability and bookings
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Visit the Settings page to set up Google Calendar integration
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Availability Slots */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Availability Slots</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleNewAvailability}
                  data-testid="button-add-availability"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Slot
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {slotsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-3 bg-muted rounded-full"></div>
                        <div>
                          <div className="h-4 bg-muted rounded w-48 mb-2"></div>
                          <div className="h-3 bg-muted rounded w-32"></div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <div className="h-8 w-16 bg-muted rounded"></div>
                        <div className="h-8 w-16 bg-muted rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : availabilitySlots.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No availability slots created yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create your first availability slot to let clients book time with you
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availabilitySlots.map((slot: any) => (
                    <div key={slot.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50" data-testid={`slot-${slot.id}`}>
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-3 bg-primary rounded-full"></div>
                        <div>
                          <h4 className="font-medium" data-testid={`slot-title-${slot.id}`}>{slot.title}</h4>
                          <p className="text-sm text-muted-foreground" data-testid={`slot-time-${slot.id}`}>
                            {new Date(slot.startAt).toLocaleDateString()} • {new Date(slot.startAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(slot.endAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            {slot.isRecurring && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                {slot.recurrencePattern?.toLowerCase()}
                              </span>
                            )}
                          </p>
                          {slot.description && (
                            <p className="text-sm text-muted-foreground mt-1" data-testid={`slot-description-${slot.id}`}>{slot.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditSlot(slot)}
                          data-testid={`button-edit-slot-${slot.id}`}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteAvailabilityMutation.mutate(slot.id)}
                          disabled={deleteAvailabilityMutation.isPending}
                          data-testid={`button-delete-slot-${slot.id}`}
                        >
                          {deleteAvailabilityMutation.isPending ? "..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {bookingsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-3 bg-muted rounded-full"></div>
                        <div>
                          <div className="h-4 bg-muted rounded w-48 mb-2"></div>
                          <div className="h-3 bg-muted rounded w-32"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No bookings scheduled yet</p>
                  <p className="text-sm text-muted-foreground">
                    Bookings will appear here when clients make appointments
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.slice(0, 4).map((booking: any, index: number) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 border border-border rounded-lg" data-testid={`booking-item-${index}`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          booking.status === "CONFIRMED" ? "bg-green-400" :
                          booking.status === "PENDING" ? "bg-amber-400" :
                          "bg-blue-400"
                        }`}></div>
                        <div>
                          <h4 className="font-medium" data-testid={`booking-title-${index}`}>
                            {booking.title}
                          </h4>
                          <p className="text-sm text-muted-foreground" data-testid={`booking-time-${index}`}>
                            {new Date(booking.startAt).toLocaleDateString()} - {" "}
                            {new Date(booking.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {" "}
                            {new Date(booking.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={booking.status === "CONFIRMED" ? "default" : "outline"} data-testid={`booking-status-${index}`}>
                          {booking.status === "CONFIRMED" ? "Confirmed" : 
                           booking.status === "PENDING" ? "Pending" : booking.status}
                        </Badge>
                        <Button variant="outline" size="sm" data-testid={`button-booking-${index}`}>
                          {booking.status === "PENDING" ? "Confirm" : "View Details"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Self-Booking */}
          <Card>
            <CardHeader>
              <CardTitle>Client Self-Booking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Public Booking Link</h3>
                    <p className="text-sm text-muted-foreground">
                      Allow clients to book consultation appointments directly
                    </p>
                  </div>
                  <Button variant="outline" data-testid="button-configure-booking">
                    Configure
                  </Button>
                </div>
                
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Your booking link:</p>
                  <code className="text-sm bg-background px-2 py-1 rounded">
                    https://lazyphotog.com/book/your-studio
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
