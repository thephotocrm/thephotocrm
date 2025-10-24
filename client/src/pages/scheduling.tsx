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
import { Calendar as CalendarIcon, Clock, Settings, Trash2, Plus, Coffee } from "lucide-react";

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

// Form schema for break times
const breakTimeSchema = z.object({
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  label: z.string().optional()
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
type BreakTimeFormData = z.infer<typeof breakTimeSchema>;
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

type BreakTime = {
  id: string;
  templateId: string;
  startTime: string;
  endTime: string;
  label?: string;
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
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DailyTemplate | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showBreakForm, setShowBreakForm] = useState(false);
  const [editingBreak, setEditingBreak] = useState<BreakTime | null>(null);

  // New API queries for template-based system
  const { data: dailyTemplates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/availability/templates"],
    enabled: !!user
  }) as { data: DailyTemplate[]; isLoading: boolean };

  const { data: overrides = [], isLoading: overridesLoading } = useQuery({
    queryKey: ["/api/availability/overrides", selectedDate?.toISOString().split('T')[0]],
    enabled: !!user && !!selectedDate,
    queryFn: async () => {
      if (!selectedDate) return [];
      const startDate = selectedDate.toISOString().split('T')[0];
      const endDate = selectedDate.toISOString().split('T')[0];
      const response = await apiRequest("GET", `/api/availability/overrides?startDate=${startDate}&endDate=${endDate}`);
      return await response.json();
    }
  }) as { data: DayOverride[]; isLoading: boolean };

  // Get time slots for selected date
  const { data: timeSlots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ["/api/availability/slots", selectedDate?.toISOString().split('T')[0]],
    enabled: !!user && !!selectedDate,
    queryFn: async () => {
      if (!selectedDate) return [];
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await apiRequest("GET", `/api/availability/slots/${dateStr}`);
      return await response.json();
    }
  }) as { data: TimeSlot[]; isLoading: boolean };
  
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings"],
    enabled: !!user
  }) as { data: any[]; isLoading: boolean };

  const { data: photographer, isLoading: photographerLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: !!user
  }) as { data: { publicToken?: string; businessName?: string; timezone?: string } | undefined; isLoading: boolean };

  // Get breaks for the current template being edited
  const { data: templateBreaks = [], isLoading: breaksLoading } = useQuery({
    queryKey: ["/api/availability/templates", editingTemplate?.id, "breaks"],
    enabled: !!editingTemplate?.id,
    queryFn: async () => {
      if (!editingTemplate?.id) return [];
      const response = await apiRequest("GET", `/api/availability/templates/${editingTemplate.id}/breaks`);
      return await response.json();
    }
  }) as { data: BreakTime[]; isLoading: boolean };

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

  const breakForm = useForm<BreakTimeFormData>({
    resolver: zodResolver(breakTimeSchema),
    defaultValues: {
      startTime: "12:00",
      endTime: "13:00",
      label: ""
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

  // Create break mutation
  const createBreakMutation = useMutation({
    mutationFn: async (data: BreakTimeFormData & { templateId: string }) => {
      return apiRequest("POST", `/api/availability/templates/${data.templateId}/breaks`, {
        startTime: data.startTime,
        endTime: data.endTime,
        label: data.label
      });
    },
    onSuccess: () => {
      if (editingTemplate?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/availability/templates", editingTemplate.id, "breaks"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/availability/slots"] });
      setShowBreakForm(false);
      breakForm.reset();
      toast({
        title: "Success",
        description: "Break time added successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add break time",
        variant: "destructive"
      });
    }
  });

  // Update break mutation
  const updateBreakMutation = useMutation({
    mutationFn: async (data: BreakTimeFormData & { id: string }) => {
      return apiRequest("PUT", `/api/availability/breaks/${data.id}`, {
        startTime: data.startTime,
        endTime: data.endTime,
        label: data.label
      });
    },
    onSuccess: () => {
      if (editingTemplate?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/availability/templates", editingTemplate.id, "breaks"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/availability/slots"] });
      setShowBreakForm(false);
      setEditingBreak(null);
      breakForm.reset();
      toast({
        title: "Success",
        description: "Break time updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update break time",
        variant: "destructive"
      });
    }
  });

  // Delete break mutation
  const deleteBreakMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/availability/breaks/${id}`);
    },
    onSuccess: () => {
      if (editingTemplate?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/availability/templates", editingTemplate.id, "breaks"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/availability/slots"] });
      toast({
        title: "Success",
        description: "Break time deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete break time",
        variant: "destructive"
      });
    }
  });

  // Confirm booking mutation
  const confirmBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("PUT", `/api/bookings/${bookingId}`, { status: "CONFIRMED" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking confirmed!",
        description: "The booking has been successfully confirmed"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to confirm booking",
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

  const convertDayNameToNumber = (dayName: string): number => {
    const dayMap: Record<string, number> = {
      "SUNDAY": 0,
      "MONDAY": 1,
      "TUESDAY": 2,
      "WEDNESDAY": 3,
      "THURSDAY": 4,
      "FRIDAY": 5,
      "SATURDAY": 6
    };
    return dayMap[dayName];
  };

  const convertNumberToDayName = (dayNumber: number): string => {
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    return days[dayNumber];
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  // Format booking date/time with photographer's timezone
  const formatBookingDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    const timezone = photographer?.timezone || 'America/New_York';
    
    return {
      date: date.toLocaleDateString('en-US', { 
        timeZone: timezone,
        weekday: 'short',
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        timeZone: timezone,
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      })
    };
  };

  // Format booking title to convert any 24-hour times to 12-hour format
  const formatBookingTitle = (title: string) => {
    // Regex to match patterns like "13:00 to 14:00" or "09:00 to 10:00"
    const timePattern = /(\d{1,2}):(\d{2})\s+to\s+(\d{1,2}):(\d{2})/g;
    
    return title.replace(timePattern, (match, hour1, min1, hour2, min2) => {
      const formatTime12Hour = (hour: string, minute: string) => {
        const h = parseInt(hour);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${displayHour}:${minute} ${ampm}`;
      };
      
      return `${formatTime12Hour(hour1, min1)} to ${formatTime12Hour(hour2, min2)}`;
    });
  };

  // Handle template editing
  const handleEditTemplate = (template: DailyTemplate) => {
    setEditingTemplate(template);
    templateForm.reset({
      dayOfWeek: convertNumberToDayName(template.dayOfWeek as number),
      startTime: template.startTime,
      endTime: template.endTime,
      isEnabled: template.isEnabled
    });
    setShowTemplateModal(true);
  };

  // Handle template form submission
  const handleTemplateSubmit = (data: DailyTemplateFormData) => {
    // Convert day name to number for API
    const apiData = {
      ...data,
      dayOfWeek: convertDayNameToNumber(data.dayOfWeek)
    };
    
    if (editingTemplate) {
      updateTemplateMutation.mutate({ ...apiData, id: editingTemplate.id });
    } else {
      createTemplateMutation.mutate(apiData);
    }
  };

  // Handle override form submission
  const handleOverrideSubmit = (data: OverrideFormData) => {
    createOverrideMutation.mutate(data);
  };

  // Handle break editing
  const handleEditBreak = (breakTime: BreakTime) => {
    setEditingBreak(breakTime);
    breakForm.reset({
      startTime: breakTime.startTime,
      endTime: breakTime.endTime,
      label: breakTime.label || ""
    });
    setShowBreakForm(true);
  };

  // Handle break form submission
  const handleBreakSubmit = (data: BreakTimeFormData) => {
    if (editingBreak) {
      updateBreakMutation.mutate({ ...data, id: editingBreak.id });
    } else if (editingTemplate?.id) {
      createBreakMutation.mutate({ ...data, templateId: editingTemplate.id });
    }
  };

  // Handle new break
  const handleNewBreak = () => {
    setEditingBreak(null);
    breakForm.reset({
      startTime: "12:00",
      endTime: "13:00",
      label: ""
    });
    setShowBreakForm(true);
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
            <Card className="border-violet-200 dark:border-violet-800">
              <CardHeader className="bg-violet-50 dark:bg-violet-900/20">
                <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                  <CalendarIcon className="w-5 h-5" />
                  Calendar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 md:p-6 flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  className="rounded-md border-0 md:border"
                  data-testid="calendar-availability"
                />
              </CardContent>
            </Card>

            {/* Time Slots for Selected Date */}
            <Card className="border-violet-200 dark:border-violet-800">
              <CardHeader className="bg-violet-50 dark:bg-violet-900/20">
                <CardTitle className="flex items-center justify-between text-violet-700 dark:text-violet-300">
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
                    ) : !Array.isArray(timeSlots) || timeSlots.length === 0 ? (
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
                        {Array.isArray(timeSlots) && timeSlots.map((slot) => (
                          <div
                            key={slot.id}
                            className={`p-3 rounded-lg border ${
                              slot.isAvailable 
                                ? "bg-green-50 border-green-200 text-green-800"
                                : "bg-red-50 border-red-200 text-red-800"
                            }`}
                            data-testid={`time-slot-${slot.startTime}-${slot.endTime}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                              </span>
                              <span className="text-sm font-medium">
                                {slot.isAvailable ? "Available" : "BOOKED"}
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

          {/* Daily Schedule Templates - Compact Version */}
          <div className="flex items-center justify-between p-4 border border-violet-200 dark:border-violet-800 rounded-lg bg-violet-50 dark:bg-violet-900/20">
            <div>
              <h3 className="font-medium text-violet-700 dark:text-violet-300">Daily Schedule Templates</h3>
              <p className="text-sm text-muted-foreground">
                {dailyTemplates.length === 0 ? 
                  "Set your regular working hours for each day" : 
                  `${dailyTemplates.length} template${dailyTemplates.length === 1 ? '' : 's'} configured`
                }
              </p>
            </div>
            <Button 
              variant="outline"
              onClick={handleNewTemplate}
              data-testid="button-manage-templates"
            >
              <Clock className="w-4 h-4 mr-2" />
              Manage Templates
            </Button>
          </div>

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
                    <div key={booking.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border border-border rounded-lg" data-testid={`booking-item-${index}`}>
                      <div className="flex items-start md:items-center space-x-3 md:space-x-4 flex-1 min-w-0">
                        <div className={`w-3 h-3 rounded-full shrink-0 mt-1 md:mt-0 ${
                          booking.status === "CONFIRMED" ? "bg-green-400" :
                          booking.status === "PENDING" ? "bg-amber-400" :
                          "bg-blue-400"
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="text-base md:text-lg font-medium break-words" data-testid={`booking-title-${index}`}>
                              {formatBookingTitle(booking.title)}
                            </h4>
                            <Badge variant={booking.status === "CONFIRMED" ? "default" : "outline"} className="md:hidden text-xs" data-testid={`booking-status-${index}`}>
                              {booking.status === "CONFIRMED" ? "Confirmed" : 
                               booking.status === "PENDING" ? "Pending" : booking.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground" data-testid={`booking-date-${index}`}>
                            {(() => {
                              const startDateTime = formatBookingDateTime(booking.startAt);
                              return startDateTime.date;
                            })()}
                          </p>
                          {(booking.clientName || booking.clientPhone) && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground">
                              {booking.clientName && (
                                <span data-testid={`booking-client-name-${index}`}>
                                  👤 {booking.clientName}
                                </span>
                              )}
                              {booking.clientPhone && (
                                <span data-testid={`booking-client-phone-${index}`}>
                                  📞 {booking.clientPhone}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-2">
                        <Badge variant={booking.status === "CONFIRMED" ? "default" : "outline"} className="hidden md:inline-flex w-fit self-start sm:self-auto" data-testid={`booking-status-${index}`}>
                          {booking.status === "CONFIRMED" ? "Confirmed" : 
                           booking.status === "PENDING" ? "Pending" : booking.status}
                        </Badge>
                        {booking.meetingLink && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.open(booking.meetingLink, '_blank')}
                            data-testid={`button-join-meeting-${index}`}
                            className="text-xs sm:text-sm"
                          >
                            Join Meeting
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowBookingDetailsModal(true);
                          }}
                          data-testid={`button-view-details-${index}`}
                          className="text-xs sm:text-sm"
                        >
                          View Details
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
                        https://thephotocrm.com/booking/calendar/{photographer.publicToken}
                      </code>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(`https://thephotocrm.com/booking/calendar/${photographer.publicToken}`);
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
                          onClick={() => window.open(`https://thephotocrm.com/booking/calendar/${photographer.publicToken}`, '_blank')}
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
          <DialogContent className="max-w-2xl" aria-describedby="template-description">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Edit Daily Template" : "Manage Daily Schedule Templates"}</DialogTitle>
            </DialogHeader>
            <p id="template-description" className="text-sm text-muted-foreground mb-4">
              {editingTemplate ? "Edit your working hours for a specific day" : "Create and manage your regular working hours for each day of the week"}
            </p>
            
            {/* Existing Templates List - Only show when not editing */}
            {!editingTemplate && dailyTemplates.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium mb-3">Existing Templates</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {dailyTemplates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50" data-testid={`modal-template-${template.id}`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          template.isEnabled ? "bg-primary" : "bg-muted-foreground"
                        }`}></div>
                        <div>
                          <span className="font-medium" data-testid={`modal-template-day-${template.id}`}>
                            {(() => {
                              const dayName = convertNumberToDayName(template.dayOfWeek as number);
                              return dayName.charAt(0) + dayName.slice(1).toLowerCase();
                            })()}
                          </span>
                          <span className="text-sm text-muted-foreground ml-2" data-testid={`modal-template-time-${template.id}`}>
                            {formatTime(template.startTime)} - {formatTime(template.endTime)}
                            {!template.isEnabled && (
                              <span className="ml-1 text-red-600">(Disabled)</span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditTemplate(template)}
                          data-testid={`modal-button-edit-template-${template.id}`}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteTemplateMutation.mutate(template.id)}
                          disabled={deleteTemplateMutation.isPending}
                          data-testid={`modal-button-delete-template-${template.id}`}
                        >
                          {deleteTemplateMutation.isPending ? "..." : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Form for Creating/Editing Templates */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">{editingTemplate ? "Edit Template" : "Create New Template"}</h4>
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

            {/* Break Times Section - Only show when editing an existing template */}
            {editingTemplate && (
              <div className="border-t mt-6 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Coffee className="w-5 h-5 text-muted-foreground" />
                    <h4 className="font-medium">Break Times</h4>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleNewBreak}
                    data-testid="button-add-break"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Break
                  </Button>
                </div>

                {/* Existing Breaks */}
                {breaksLoading ? (
                  <div className="text-sm text-muted-foreground">Loading breaks...</div>
                ) : templateBreaks.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {templateBreaks.map((breakTime) => (
                      <div key={breakTime.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50" data-testid={`break-${breakTime.id}`}>
                        <div>
                          <div className="font-medium" data-testid={`break-time-${breakTime.id}`}>
                            {formatTime(breakTime.startTime)} - {formatTime(breakTime.endTime)}
                          </div>
                          {breakTime.label && (
                            <div className="text-sm text-muted-foreground" data-testid={`break-label-${breakTime.id}`}>
                              {breakTime.label}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditBreak(breakTime)}
                            data-testid={`button-edit-break-${breakTime.id}`}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteBreakMutation.mutate(breakTime.id)}
                            disabled={deleteBreakMutation.isPending}
                            data-testid={`button-delete-break-${breakTime.id}`}
                          >
                            {deleteBreakMutation.isPending ? "..." : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg mb-4">
                    No breaks added yet. Click "Add Break" to add lunch breaks or other time blocks.
                  </div>
                )}

                {/* Break Form - Only show when adding/editing a break */}
                {showBreakForm && (
                  <div className="border-t pt-4">
                    <h5 className="font-medium mb-3">{editingBreak ? "Edit Break" : "Add Break"}</h5>
                    <Form {...breakForm}>
                      <form onSubmit={breakForm.handleSubmit(handleBreakSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={breakForm.control}
                            name="startTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Time</FormLabel>
                                <FormControl>
                                  <Input type="time" data-testid="input-break-start-time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={breakForm.control}
                            name="endTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Time</FormLabel>
                                <FormControl>
                                  <Input type="time" data-testid="input-break-end-time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={breakForm.control}
                          name="label"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Label (Optional)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., Lunch break" 
                                  data-testid="input-break-label" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowBreakForm(false);
                              setEditingBreak(null);
                              breakForm.reset();
                            }}
                            data-testid="button-cancel-break"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createBreakMutation.isPending || updateBreakMutation.isPending}
                            data-testid="button-save-break"
                          >
                            {createBreakMutation.isPending || updateBreakMutation.isPending ? "Saving..." : (editingBreak ? "Update" : "Add")}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                )}
              </div>
            )}
            </div>
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

        {/* Booking Details Modal */}
        <Dialog open={showBookingDetailsModal} onOpenChange={setShowBookingDetailsModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
            </DialogHeader>
            
            {selectedBooking && (
              <div className="space-y-4">
                {/* Booking Title */}
                <div>
                  <h3 className="font-medium text-lg" data-testid="modal-booking-title">
                    {formatBookingTitle(selectedBooking.title)}
                  </h3>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date</label>
                    <p className="text-sm" data-testid="modal-booking-date">
                      {(() => {
                        const startDateTime = formatBookingDateTime(selectedBooking.startAt);
                        return startDateTime.date;
                      })()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Time</label>
                    <p className="text-sm" data-testid="modal-booking-time">
                      {(() => {
                        const startDateTime = formatBookingDateTime(selectedBooking.startAt);
                        const endDateTime = formatBookingDateTime(selectedBooking.endAt);
                        return `${startDateTime.time} - ${endDateTime.time}`;
                      })()}
                    </p>
                  </div>
                </div>

                {/* Status and Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <p className="text-sm" data-testid="modal-booking-status">
                      <Badge variant={selectedBooking.status === "CONFIRMED" ? "default" : "outline"}>
                        {selectedBooking.status}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <p className="text-sm" data-testid="modal-booking-type">
                      {selectedBooking.bookingType || "CONSULTATION"}
                    </p>
                  </div>
                </div>

                {/* Contact Information */}
                {(selectedBooking.clientName || selectedBooking.clientEmail || selectedBooking.clientPhone) && (
                  <div>
                    <h4 className="font-medium mb-2">Contact Information</h4>
                    <div className="space-y-2 bg-muted p-3 rounded-lg">
                      {selectedBooking.clientName && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">👤 Name:</span>
                          <span className="text-sm" data-testid="modal-client-name">
                            {selectedBooking.clientName}
                          </span>
                        </div>
                      )}
                      {selectedBooking.clientEmail && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">✉️ Email:</span>
                          <span className="text-sm" data-testid="modal-client-email">
                            {selectedBooking.clientEmail}
                          </span>
                        </div>
                      )}
                      {selectedBooking.clientPhone && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">📞 Phone:</span>
                          <span className="text-sm" data-testid="modal-client-phone">
                            {selectedBooking.clientPhone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedBooking.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-sm mt-1" data-testid="modal-booking-description">
                      {selectedBooking.description}
                    </p>
                  </div>
                )}

                {/* Google Meet Link */}
                {selectedBooking.googleMeetLink && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Meeting Link</label>
                    <div className="flex items-center gap-2 mt-1">
                      <a 
                        href={selectedBooking.googleMeetLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                        data-testid="modal-meeting-link"
                      >
                        Join Google Meet
                      </a>
                    </div>
                  </div>
                )}

                {/* Created Date */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-sm" data-testid="modal-booking-created">
                    {new Date(selectedBooking.createdAt).toLocaleDateString()} at {new Date(selectedBooking.createdAt).toLocaleTimeString()}
                  </p>
                </div>

                {/* Close Button */}
                <div className="flex justify-end pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowBookingDetailsModal(false)}
                    data-testid="button-close-booking-details"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        </div>
    </div>
  );
}