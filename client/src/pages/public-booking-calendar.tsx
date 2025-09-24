import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
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
  ChevronLeft, 
  ChevronRight,
  Camera,
  MapPin,
  User,
  Mail,
  Phone,
  MessageSquare
} from "lucide-react";

interface AvailabilitySlot {
  id: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  isBooked: boolean;
}

interface Photographer {
  id: string;
  businessName: string;
  timezone: string;
  brandPrimary?: string;
}

interface CalendarData {
  success: boolean;
  photographer: Photographer;
  availableSlots: AvailabilitySlot[];
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
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
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

  const { data: calendarData, isLoading } = useQuery<CalendarData>({
    queryKey: [`/api/public/booking/calendar/${params?.publicToken}`],
    enabled: !!params?.publicToken
  });

  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: async (formData: BookingFormData) => {
      if (!selectedSlot || !params?.publicToken) {
        throw new Error("No slot selected or invalid token");
      }
      
      return apiRequest("POST", `/api/public/booking/calendar/${params.publicToken}/book/${selectedSlot.id}`, formData);
    },
    onSuccess: (data) => {
      setBookingSuccess(true);
      setIsBookingModalOpen(false);
      bookingForm.reset();
      toast({
        title: "Booking confirmed!",
        description: "You'll receive a confirmation email shortly with all the details.",
      });
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

  // Get available slots for a specific date
  const getSlotsForDate = (date: Date) => {
    if (!calendarData?.availableSlots) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    return calendarData.availableSlots.filter(slot => {
      const slotDate = new Date(slot.startAt).toISOString().split('T')[0];
      return slotDate === dateStr && !slot.isBooked;
    });
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const calendarDays = generateCalendarGrid();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {photographer.businessName}
              </h1>
              <p className="text-gray-600">Book your consultation appointment</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('prev')}
                      data-testid="button-prev-month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('next')}
                      data-testid="button-next-month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayNames.map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                    const slots = getSlotsForDate(day);
                    const hasAvailableSlots = slots.length > 0;

                    return (
                      <div
                        key={index}
                        className={`
                          min-h-[100px] p-2 border border-gray-200 
                          ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                          ${isPast ? 'opacity-50' : ''}
                          ${isToday ? 'ring-2 ring-blue-500' : ''}
                        `}
                        data-testid={`calendar-day-${day.getDate()}`}
                      >
                        <div className={`
                          text-sm font-medium mb-1
                          ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                          ${isToday ? 'text-blue-600' : ''}
                        `}>
                          {day.getDate()}
                        </div>
                        
                        {hasAvailableSlots && !isPast && (
                          <div className="space-y-1">
                            {slots.slice(0, 3).map((slot, slotIndex) => (
                              <button
                                key={slot.id}
                                onClick={() => setSelectedSlot(slot)}
                                className="w-full text-xs p-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 text-left"
                                data-testid={`time-slot-${slot.id}`}
                              >
                                {formatTime(slot.startAt)}
                              </button>
                            ))}
                            {slots.length > 3 && (
                              <div className="text-xs text-gray-500">
                                +{slots.length - 3} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected slot details */}
            {selectedSlot && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Selected Time Slot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{selectedSlot.title}</h3>
                    {selectedSlot.description && (
                      <p className="text-sm text-gray-600 mt-1">{selectedSlot.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(selectedSlot.startAt).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      {formatTime(selectedSlot.startAt)} - {formatTime(selectedSlot.endAt)}
                    </span>
                  </div>

                  <Button
                    className="w-full"
                    style={{ backgroundColor: photographer.brandPrimary || '#3b82f6' }}
                    onClick={handleBookSlot}
                    data-testid="button-book-slot"
                  >
                    Book This Time
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How to Book</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-blue-600">1</span>
                  </div>
                  <p>Select an available time slot from the calendar</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-blue-600">2</span>
                  </div>
                  <p>Click "Book This Time" to proceed</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-blue-600">3</span>
                  </div>
                  <p>Fill out your contact information</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-blue-600">4</span>
                  </div>
                  <p>Receive confirmation and calendar invite</p>
                </div>
              </CardContent>
            </Card>

            {/* Contact info */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Questions about booking?</p>
                  <p className="text-sm font-medium">Contact {photographer.businessName}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}