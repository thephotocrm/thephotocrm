import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Clock, Settings, Trash2, Plus } from "lucide-react";

// Form schema for daily templates
const dailyTemplateSchema = z.object({
  dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  isEnabled: z.boolean().default(true)
}).refine((data) => {
  if (data.startTime && data.endTime) {
    return data.endTime > data.startTime;
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["endTime"]
});

// Form schema for day overrides
const overrideSchema = z.object({
  date: z.string().min(1, "Date is required"),
  isAvailable: z.boolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional()
}).refine((data) => {
  if (data.isAvailable && data.startTime && data.endTime) {
    return data.endTime > data.startTime;
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["endTime"]
});

type DailyTemplateFormData = z.infer<typeof dailyTemplateSchema>;
type OverrideFormData = z.infer<typeof overrideSchema>;

// Type definitions for API data
type DailyTemplate = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
  photographerId: string;
};

type DayOverride = {
  id: string;
  date: string;
  isAvailable: boolean;
  startTime?: string;
  endTime?: string;
  photographerId: string;
};

type TimeSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  photographerId: string;
};

export default function Scheduling() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // State for calendar and time management
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DailyTemplate | null>(null);

  // New API queries for template-based system
  const { data: dailyTemplates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/availability/templates"],
    enabled: !!user
  }) as { data: DailyTemplate[]; isLoading: boolean };

  const { data: overrides = [], isLoading: overridesLoading } = useQuery({
    queryKey: ["/api/availability/overrides", selectedDate?.toISOString().split('T')[0]],
    enabled: !!user && selectedDate,
    queryFn: async () => {
      if (!selectedDate) return [];
      const startDate = selectedDate.toISOString().split('T')[0];
      const endDate = selectedDate.toISOString().split('T')[0];
      return apiRequest("GET", `/api/availability/overrides?startDate=${startDate}&endDate=${endDate}`);
    }
  }) as { data: DayOverride[]; isLoading: boolean };

  // Get time slots for selected date
  const { data: timeSlots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ["/api/availability/slots", selectedDate?.toISOString().split('T')[0]],
    enabled: !!user && !!selectedDate,
    queryFn: async () => {
      if (!selectedDate) return [];
      const dateStr = selectedDate.toISOString().split('T')[0];
      return apiRequest("GET", `/api/availability/slots/${dateStr}`);
    }
  }) as { data: TimeSlot[]; isLoading: boolean };
  
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings"],
    enabled: !!user
  }) as { data: any[]; isLoading: boolean };

  const { data: photographer, isLoading: photographerLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: !!user
  }) as { data: { publicToken?: string; businessName?: string } | undefined; isLoading: boolean };

  // Forms for the new template-based system
  const templateForm = useForm<DailyTemplateFormData>({
    resolver: zodResolver(dailyTemplateSchema),
    defaultValues: {
      dayOfWeek: "MONDAY",
      startTime: "09:00",
      endTime: "17:00",
      isEnabled: true
    }
  });

  const overrideForm = useForm<OverrideFormData>({
    resolver: zodResolver(overrideSchema),
    defaultValues: {
      date: "",
      isAvailable: true,
      startTime: "09:00",
      endTime: "17:00"
    }
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: DailyTemplateFormData) => {
      return apiRequest("POST", "/api/availability/templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/availability/slots"] });
      setShowTemplateModal(false);
      templateForm.reset();
      toast({
        title: "Success",
        description: "Daily schedule template created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create template",
        variant: "destructive"
      });
    }
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: DailyTemplateFormData & { id: string }) => {
      return apiRequest("PUT", `/api/availability/templates/${data.id}`, {
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        isEnabled: data.isEnabled
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/availability/slots"] });
      setShowTemplateModal(false);
      setEditingTemplate(null);
      templateForm.reset();
      toast({
        title: "Success",
        description: "Daily schedule template updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update template",
        variant: "destructive"
      });
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/availability/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/availability/slots"] });
      toast({
        title: "Success",
        description: "Daily schedule template deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete template",
        variant: "destructive"
      });
    }
  });

  // Create override mutation
  const createOverrideMutation = useMutation({
    mutationFn: async (data: OverrideFormData) => {
      return apiRequest("POST", "/api/availability/overrides", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability/overrides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/availability/slots"] });
      setShowOverrideModal(false);
      overrideForm.reset();
      toast({
        title: "Success",
        description: "Day override created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create override",
        variant: "destructive"
      });
    }
  });

  // Utility functions
  const getDayOfWeekFromDate = (date: Date): string => {
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    return days[date.getDay()];
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  // Handle template editing
  const handleEditTemplate = (template: DailyTemplate) => {
    setEditingTemplate(template);
    templateForm.reset({
      dayOfWeek: template.dayOfWeek as any,
      startTime: template.startTime,
      endTime: template.endTime,
      isEnabled: template.isEnabled
    });
    setShowTemplateModal(true);
  };

  // Handle template form submission
  const handleTemplateSubmit = (data: DailyTemplateFormData) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ ...data, id: editingTemplate.id });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  // Handle override form submission
  const handleOverrideSubmit = (data: OverrideFormData) => {
    createOverrideMutation.mutate(data);
  };

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      // Pre-fill override form with selected date
      overrideForm.setValue("date", date.toISOString().split('T')[0]);
    }
  };

  // Handle new template
  const handleNewTemplate = () => {
    setEditingTemplate(null);
    templateForm.reset();
    setShowTemplateModal(true);
  };

  // Handle new override for selected date
  const handleNewOverride = () => {
    if (selectedDate) {
      overrideForm.setValue("date", selectedDate.toISOString().split('T')[0]);
    }
    setShowOverrideModal(true);
  };

  // Get template for current selected day
  const getTemplateForDay = (date: Date) => {
    const dayOfWeek = getDayOfWeekFromDate(date);
    return dailyTemplates.find(t => t.dayOfWeek === dayOfWeek && t.isEnabled);
  };

  // Get override for selected date
  const getOverrideForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return overrides.find(o => o.date === dateStr);
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
    <div>
        {/* Header */}
        <header className="bg-card border-b border-border px-4 md:px-6 py-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SidebarTrigger 
                data-testid="button-menu-toggle" 
                className="hidden md:inline-flex" 
              />
              <div>
                <h1 className="text-xl md:text-2xl font-semibold">Scheduling</h1>
                <p className="text-sm md:text-base text-muted-foreground">Set your daily hours and manage calendar availability</p>
              </div>
            </div>
            
            <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
              <Button variant="outline" onClick={handleNewTemplate} data-testid="button-set-daily-hours">
                <Clock className="w-5 h-5 mr-2" />
                Set Daily Hours
              </Button>
              
              {selectedDate && (
                <Button variant="outline" onClick={handleNewOverride} data-testid="button-override-day">
                  <Settings className="w-5 h-5 mr-2" />
                  Override Day
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content - Calendar First */}
        <div className="container mx-auto p-4 md:p-6 space-y-6">

          {/* Calendar and Time Slot Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  className="rounded-md border"
                  data-testid="calendar-availability"
                />
              </CardContent>
            </Card>

            {/* Time Slots for Selected Date */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {selectedDate ? `Time Slots - ${selectedDate.toLocaleDateString()}` : "Select a Date"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDate ? (
                  <div className="space-y-4">
                    {slotsLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                        ))}
                      </div>
                    ) : timeSlots.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-2">No availability set for this day</p>
                        <p className="text-sm text-muted-foreground">
                          {getTemplateForDay(selectedDate) ? 
                            "Create a daily schedule template or override this specific day" :
                            "Set your daily hours for " + getDayOfWeekFromDate(selectedDate).toLowerCase()
                          }
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {timeSlots.map((slot) => (
                          <div
                            key={slot.id}
                            className={`p-3 rounded-lg border ${
                              slot.isAvailable 
                                ? "bg-green-50 border-green-200 text-green-800"
                                : "bg-gray-50 border-gray-200 text-gray-500"
                            }`}
                            data-testid={`time-slot-${slot.startTime}-${slot.endTime}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                              </span>
                              <span className="text-sm">
                                {slot.isAvailable ? "Available" : "Blocked"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Select a date to view availability</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daily Templates Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Daily Schedule Templates</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleNewTemplate}
                  data-testid="button-add-template"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-3 bg-muted rounded-full"></div>
                        <div>
                          <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                          <div className="h-3 bg-muted rounded w-24"></div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <div className="h-8 w-16 bg-muted rounded"></div>
                        <div className="h-8 w-16 bg-muted rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : dailyTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No daily schedule templates created yet</p>
                  <p className="text-sm text-muted-foreground">
                    Set your regular working hours for each day of the week
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dailyTemplates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50" data-testid={`template-${template.id}`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          template.isEnabled ? "bg-primary" : "bg-muted-foreground"
                        }`}></div>
                        <div>
                          <h4 className="font-medium" data-testid={`template-day-${template.id}`}>
                            {template.dayOfWeek.charAt(0) + template.dayOfWeek.slice(1).toLowerCase()}
                          </h4>
                          <p className="text-sm text-muted-foreground" data-testid={`template-time-${template.id}`}>
                            {formatTime(template.startTime)} - {formatTime(template.endTime)}
                            {!template.isEnabled && (
                              <span className="ml-2 text-red-600">(Disabled)</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditTemplate(template)}
                          data-testid={`button-edit-template-${template.id}`}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteTemplateMutation.mutate(template.id)}
                          disabled={deleteTemplateMutation.isPending}
                          data-testid={`button-delete-template-${template.id}`}
                        >
                          {deleteTemplateMutation.isPending ? "..." : <Trash2 className="w-4 h-4" />}
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
                  <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
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
                  {photographer?.publicToken ? (
                    <div className="space-y-2">
                      <code className="text-sm bg-background px-2 py-1 rounded block break-all">
                        https://thephotocrm.com/public/booking/calendar/{photographer.publicToken}
                      </code>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(`https://thephotocrm.com/public/booking/calendar/${photographer.publicToken}`);
                            toast({
                              title: "Copied!",
                              description: "Booking link copied to clipboard"
                            });
                          }}
                          data-testid="button-copy-booking-link"
                        >
                          Copy Link
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(`https://thephotocrm.com/public/booking/calendar/${photographer.publicToken}`, '_blank')}
                          data-testid="button-preview-booking-calendar"
                        >
                          Preview Calendar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Loading booking link...
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Template Modal */}
        <Dialog open={showTemplateModal} onOpenChange={(open) => {
          setShowTemplateModal(open);
          if (!open) {
            setEditingTemplate(null);
            templateForm.reset();
          }
        }}>
          <DialogContent className="max-w-md" aria-describedby="template-description">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Edit Daily Template" : "Create Daily Template"}</DialogTitle>
            </DialogHeader>
            <p id="template-description" className="text-sm text-muted-foreground mb-4">
              Set your regular working hours for a specific day of the week
            </p>
            <Form {...templateForm}>
              <form onSubmit={templateForm.handleSubmit(handleTemplateSubmit)} className="space-y-4">
                <FormField
                  control={templateForm.control}
                  name="dayOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day of Week</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-template-day">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MONDAY">Monday</SelectItem>
                          <SelectItem value="TUESDAY">Tuesday</SelectItem>
                          <SelectItem value="WEDNESDAY">Wednesday</SelectItem>
                          <SelectItem value="THURSDAY">Thursday</SelectItem>
                          <SelectItem value="FRIDAY">Friday</SelectItem>
                          <SelectItem value="SATURDAY">Saturday</SelectItem>
                          <SelectItem value="SUNDAY">Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={templateForm.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" data-testid="input-template-start-time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={templateForm.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" data-testid="input-template-end-time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={templateForm.control}
                  name="isEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          data-testid="checkbox-template-enabled"
                          className="w-4 h-4"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Enable this template</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowTemplateModal(false)}
                    data-testid="button-cancel-template"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                    data-testid="button-save-template"
                  >
                    {createTemplateMutation.isPending || updateTemplateMutation.isPending ? "Saving..." : (editingTemplate ? "Update" : "Create")}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Override Modal */}
        <Dialog open={showOverrideModal} onOpenChange={(open) => {
          setShowOverrideModal(open);
          if (!open) {
            overrideForm.reset();
          }
        }}>
          <DialogContent className="max-w-md" aria-describedby="override-description">
            <DialogHeader>
              <DialogTitle>Override Day Availability</DialogTitle>
            </DialogHeader>
            <p id="override-description" className="text-sm text-muted-foreground mb-4">
              Set custom availability for a specific date
            </p>
            <Form {...overrideForm}>
              <form onSubmit={overrideForm.handleSubmit(handleOverrideSubmit)} className="space-y-4">
                <FormField
                  control={overrideForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" data-testid="input-override-date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={overrideForm.control}
                  name="isAvailable"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          data-testid="checkbox-override-available"
                          className="w-4 h-4"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Available on this day</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {overrideForm.watch("isAvailable") && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={overrideForm.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" data-testid="input-override-start-time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={overrideForm.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" data-testid="input-override-end-time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowOverrideModal(false)}
                    data-testid="button-cancel-override"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createOverrideMutation.isPending}
                    data-testid="button-save-override"
                  >
                    {createOverrideMutation.isPending ? "Saving..." : "Create Override"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        </div>
    </div>
  );
}