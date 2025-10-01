import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { updateMetaTags } from "@/lib/meta-tags";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  Clock, 
  Camera,
  MapPin,
  User,
  Mail,
  Phone,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  photographerId: string;
}

interface DailyTemplate {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string;
  endTime: string;
  isEnabled: boolean;
  photographerId: string;
}

interface Photographer {
  id: string;
  businessName: string;
  timezone: string;
  brandPrimary?: string;
  profilePicture?: string;
  logoUrl?: string;
}

interface PublicCalendarData {
  success: boolean;
  photographer: Photographer;
  dailyTemplates: DailyTemplate[];
}

// Booking form validation schema
const bookingFormSchema = z.object({
  clientName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  clientEmail: z.string().email("Invalid email address").max(255, "Email too long"),
  clientPhone: z.string().min(10, "Phone number must be at least 10 digits").max(20, "Phone number too long").optional(),
  bookingNotes: z.string().max(500, "Notes too long").optional()
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export default function PublicBookingCalendar() {
  const [, params] = useRoute("/public/booking/calendar/:publicToken");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const { toast } = useToast();

  // Initialize booking form
  const bookingForm = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      bookingNotes: ""
    }
  });

  // Get photographer info and templates
  const { data: calendarData, isLoading } = useQuery<PublicCalendarData>({
    queryKey: [`/api/public/booking/calendar/${params?.publicToken}`],
    enabled: !!params?.publicToken,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/public/booking/calendar/${params?.publicToken}`);
      return await response.json();
    }
  });

  // Update meta tags for social sharing when photographer data loads
  useEffect(() => {
    if (calendarData?.photographer) {
      const { businessName, logoUrl } = calendarData.photographer;
      const currentUrl = window.location.href;
      
      updateMetaTags({
        title: `${businessName} - Schedule Your Photography Session`,
        description: `Book your consultation with ${businessName}. Choose a time that works for you.`,
        image: logoUrl || undefined, // Use photographer's logo if available
        url: currentUrl
      });
    }
  }, [calendarData]);

  // Helper function to format date for API calls (YYYY-MM-DD in local timezone)
  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get time slots for selected date
  const { data: timeSlots = [], isLoading: slotsLoading } = useQuery<TimeSlot[]>({
    queryKey: [`/api/public/booking/calendar/${params?.publicToken}/slots`, selectedDate ? formatDateForAPI(selectedDate) : null],
    enabled: !!params?.publicToken && !!selectedDate,
    queryFn: async () => {
      if (!selectedDate) return [];
      const dateStr = formatDateForAPI(selectedDate);
      const response = await apiRequest("GET", `/api/public/booking/calendar/${params?.publicToken}/slots/${dateStr}`);
      const result = await response.json();
      return result.slots || [];
    }
  });

  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: async (formData: BookingFormData) => {
      if (!selectedSlot || !params?.publicToken || !selectedDate) {
        throw new Error("No slot selected or invalid token");
      }
      
      const dateStr = formatDateForAPI(selectedDate);
      const response = await apiRequest("POST", `/api/public/booking/calendar/${params.publicToken}/book/${dateStr}/${selectedSlot.id}`, formData);
      return await response.json();
    },
    onSuccess: (data) => {
      setBookingSuccess(true);
      bookingForm.reset();
      setSelectedSlot(null);
      
      // Invalidate and refetch time slots to update availability
      queryClient.invalidateQueries({
        queryKey: [`/api/public/booking/calendar/${params?.publicToken}/slots`, selectedDate ? formatDateForAPI(selectedDate) : null]
      });
      
      toast({
        title: "Booking confirmed!",
        description: "You'll receive a confirmation email shortly with all the details.",
      });
      
      // Close modal after showing success for 2 seconds
      setTimeout(() => {
        setIsBookingModalOpen(false);
        setBookingSuccess(false);
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Booking failed",
        description: error?.message || "Unable to book this time slot. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle booking form submission
  const handleBookingSubmit = (data: BookingFormData) => {
    bookingMutation.mutate(data);
  };

  // Handle "Book This Time" button click
  const handleBookSlot = () => {
    if (selectedSlot) {
      setIsBookingModalOpen(true);
    }
  };

  // Helper to normalize date to start of day for comparison
  const startOfDay = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  // Month navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // Generate calendar grid for current month
  const generateCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the Sunday before the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // End at the Saturday after the last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const days = [];
    const currentDay = new Date(startDate);
    
    while (currentDay <= endDate) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  // Format selected date for display
  const formatSelectedDate = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const dayNumber = date.getDate();
    
    return `${dayName}, ${monthName} ${dayNumber}`;
  };

  // Month names for header
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Day headers
  const dayHeaders = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const calendarDays = generateCalendarGrid();

  // Check if a date has availability based on templates
  const hasAvailability = (date: Date) => {
    if (!calendarData?.dailyTemplates) return false;
    
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    return calendarData.dailyTemplates.some(template => 
      template.dayOfWeek === dayOfWeek && template.isEnabled
    );
  };

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null); // Clear selected slot when changing dates
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking calendar...</p>
        </div>
      </div>
    );
  }

  if (!calendarData?.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center p-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Calendar Not Found</h2>
            <p className="text-gray-600">
              This booking calendar is not available or the link may have expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { photographer } = calendarData;

  return (
    <div 
      className="min-h-screen bg-gray-50"
      style={{ 
        '--brand-primary': photographer.brandPrimary || '#3b82f6',
        '--brand-bg': photographer.brandPrimary ? `${photographer.brandPrimary}10` : '#eff6ff'
      } as React.CSSProperties}
    >
      {/* Header with Photographer Branding */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            {photographer.profilePicture ? (
              <img 
                src={photographer.profilePicture}
                alt={photographer.businessName}
                className="w-16 h-16 rounded-full object-cover"
                data-testid="photographer-profile-picture"
              />
            ) : (
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: photographer.brandPrimary || '#3b82f6' }}
              >
                <Camera className="w-8 h-8" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {photographer.businessName}
              </h1>
              <p className="text-gray-600 text-lg">Book your consultation appointment</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Custom Calendar */}
          <div>
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Select a Date & Time
                  </h2>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h3>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateMonth('prev')}
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                      data-testid="button-prev-month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateMonth('next')}
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                      data-testid="button-next-month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayHeaders.map(day => (
                    <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 uppercase">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isPast = startOfDay(day) < startOfDay(new Date());
                    const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
                    const isAvailable = hasAvailability(day) && !isPast;

                    return (
                      <button
                        key={index}
                        onClick={() => isAvailable ? handleDateSelect(day) : null}
                        disabled={!isAvailable}
                        className={`
                          h-10 w-10 text-sm font-medium rounded-full flex items-center justify-center
                          transition-colors duration-200 hover:bg-gray-100
                          ${isCurrentMonth 
                            ? (isAvailable 
                              ? 'text-gray-900 cursor-pointer' 
                              : 'text-gray-400 cursor-not-allowed')
                            : 'text-gray-300 cursor-not-allowed'
                          }
                          ${isSelected 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : ''
                          }
                          ${isToday && !isSelected 
                            ? 'bg-blue-50 text-blue-600 font-semibold' 
                            : ''
                          }
                          ${isAvailable && !isSelected && !isToday
                            ? 'hover:bg-blue-50 hover:text-blue-600'
                            : ''
                          }
                        `}
                        data-testid={`calendar-day-${day.getDate()}`}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Time Slots */}
          <div>
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedDate ? formatSelectedDate(selectedDate) : "Select a date"}
                </h3>
                {selectedDate && (
                  <p className="text-gray-600 text-sm mt-1">
                    Available times
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {selectedDate ? (
                  <div className="space-y-3">
                    {slotsLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : !Array.isArray(timeSlots) || timeSlots.length === 0 ? (
                      <div className="text-center py-12">
                        <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2 font-medium">No times available</p>
                        <p className="text-sm text-gray-500">
                          Please select a different date
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {Array.isArray(timeSlots) && timeSlots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot)}
                            className={`
                              w-full px-4 py-3 rounded-lg text-left transition-all duration-200
                              font-medium border-2 hover:shadow-sm
                              ${selectedSlot?.id === slot.id
                                ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                              }
                            `}
                            data-testid={`time-slot-${slot.startTime}-${slot.endTime}`}
                          >
                            <div className="text-center">
                              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Select a date to view available times</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Choose from available dates in the calendar
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Book Button */}
            {selectedSlot && (
              <div className="mt-6">
                <Button
                  onClick={handleBookSlot}
                  className="w-full py-4 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  data-testid="button-book-slot"
                >
                  Continue to Book
                </Button>
                <p className="text-center text-sm text-gray-500 mt-3">
                  Selected: {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <Dialog open={isBookingModalOpen} onOpenChange={(open) => {
        setIsBookingModalOpen(open);
        if (!open) {
          setBookingSuccess(false); // Reset success state when modal closes
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Book Your Appointment</DialogTitle>
          </DialogHeader>
          
          {bookingSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Booking Confirmed!</h3>
              <p className="text-gray-600 mb-4">
                You'll receive a confirmation email shortly with all the details.
              </p>
              <Button
                onClick={() => {
                  setBookingSuccess(false);
                  setIsBookingModalOpen(false);
                }}
                data-testid="button-close-success"
              >
                Close
              </Button>
            </div>
          ) : (
            <Form {...bookingForm}>
              <form onSubmit={bookingForm.handleSubmit(handleBookingSubmit)} className="space-y-4">
                {selectedSlot && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Selected Time</h4>
                    <div className="text-sm text-gray-600">
                      <p>{selectedDate?.toLocaleDateString()}</p>
                      <p>{formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}</p>
                    </div>
                  </div>
                )}

                <FormField
                  control={bookingForm.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your full name" 
                          {...field} 
                          data-testid="input-client-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={bookingForm.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter your email address" 
                          {...field} 
                          data-testid="input-client-email"
                        />
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
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="Enter your phone number" 
                          {...field} 
                          data-testid="input-client-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={bookingForm.control}
                  name="bookingNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any special requests or information..."
                          className="min-h-[100px]"
                          {...field} 
                          data-testid="textarea-booking-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsBookingModalOpen(false)}
                    className="w-full"
                    data-testid="button-cancel-booking"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={bookingMutation.isPending}
                    style={{ 
                      backgroundColor: photographer.brandPrimary || '#3b82f6',
                      borderColor: photographer.brandPrimary || '#3b82f6'
                    }}
                    data-testid="button-confirm-booking"
                  >
                    {bookingMutation.isPending ? "Booking..." : "Confirm Booking"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}