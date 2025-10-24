import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Clock, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import placeholderPhoto from "@assets/stock_images/professional_photogr_0f0fd30c.jpg";

interface SchedulingCalendarProps {
  heading?: string;
  description?: string;
  durationMinutes: number;
  bookingType: string;
  bufferBefore?: number;
  bufferAfter?: number;
  allowRescheduling?: boolean;
  isPreview?: boolean;
  isLoading?: boolean;
  onBookingConfirm?: (date: Date, time: string) => void;
  photographerName?: string;
  photographerPhoto?: string | null;
  showPhotographerProfile?: boolean;
  photographerId?: string;
}

export function SchedulingCalendar({
  heading = "Schedule Your Session",
  description,
  durationMinutes = 60,
  bookingType = "ONE_TIME",
  isPreview = false,
  isLoading = false,
  onBookingConfirm,
  photographerName,
  photographerPhoto,
  showPhotographerProfile = true,
  photographerId,
}: SchedulingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  // Format date in local timezone (not UTC) to avoid timezone shift bugs
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch availability slots for the selected date
  const { data: availabilitySlots = [], isLoading: slotsLoading, error: slotsError } = useQuery({
    queryKey: ["/api/availability/slots", selectedDate ? formatLocalDate(selectedDate) : null, photographerId],
    enabled: !!selectedDate && !!photographerId,
    queryFn: async () => {
      if (!selectedDate || !photographerId) return [];
      const dateStr = formatLocalDate(selectedDate);
      const response = await apiRequest("GET", `/api/public/availability/${photographerId}/slots/${dateStr}`);
      return await response.json();
    }
  });

  const handleConfirmBooking = () => {
    if (!selectedDate || !selectedTime) return;

    if (isPreview) {
      toast({
        title: "Preview Mode",
        description: "This is a preview. Clients will be able to book appointments when you send them this proposal.",
      });
      return;
    }

    // Call the parent callback if provided
    if (onBookingConfirm) {
      onBookingConfirm(selectedDate, selectedTime);
    } else {
      // Fallback toast
      const slot = timeSlots.find(s => s.value === selectedTime);
      toast({
        title: "Booking Confirmed!",
        description: `Your appointment is scheduled for ${selectedDate?.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric',
          year: 'numeric'
        })} at ${slot?.display}`,
      });
    }
  };

  // Convert API slots to the format expected by the UI
  const timeSlots = (availabilitySlots as any[])
    .filter((slot: any) => slot.isAvailable)
    .map((slot: any) => {
      const displayTime = new Date(`2000-01-01T${slot.startTime}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return {
        value: slot.startTime,
        display: displayTime
      };
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{heading}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Photographer Profile Header */}
      {photographerName && showPhotographerProfile && (
        <div className="flex flex-col items-center gap-3 pt-6 border-t">
          <p className="text-sm text-muted-foreground">Chatting with:</p>
          <Avatar className="w-24 h-24 border-2 border-primary shadow-lg">
            <AvatarImage 
              src={photographerPhoto || placeholderPhoto} 
              alt={photographerName}
              className="object-cover"
            />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {photographerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-center space-y-1">
            <h3 className="text-xl font-semibold">{photographerName}</h3>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{durationMinutes} min</span>
            </div>
          </div>
        </div>
      )}

      {/* Calendar and Time Selection - Two Column Layout */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid lg:grid-cols-[1.2fr_1fr] divide-x divide-border">
            {/* Left Column: Calendar */}
            <div className="p-8 flex flex-col items-center justify-center bg-muted/20">
              <div className="mb-4 text-center">
                <h3 className="text-lg font-semibold mb-1">Select a date</h3>
                <p className="text-sm text-muted-foreground">Choose your preferred day</p>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const compareDate = new Date(date);
                  compareDate.setHours(0, 0, 0, 0);
                  return compareDate < today;
                }}
                className="rounded-md border-0 scale-125"
                data-testid="calendar-date-picker"
              />
            </div>

            {/* Right Column: Time Slots (Always Visible) */}
            <div className="p-6 flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-1">
                  {selectedDate ? 'Select a time' : 'Available times'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedDate ? (
                    <span>
                      {selectedDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  ) : (
                    <span>Select a date to view available times</span>
                  )}
                </p>
              </div>

              {/* Time Slots Grid - Always rendered, disabled when no date selected */}
              <div className="flex-1 overflow-y-auto max-h-[400px] pr-2">
                {slotsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading available times...</p>
                  </div>
                ) : !selectedDate ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    Select a date to view available times
                  </div>
                ) : timeSlots.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <p className="text-sm text-muted-foreground">No available times for this date</p>
                    <p className="text-xs text-muted-foreground">Please select another date</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots.map((slot) => (
                      <Button
                        key={slot.value}
                        variant={selectedTime === slot.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTime(slot.value)}
                        className="justify-center transition-all"
                        data-testid={`time-slot-${slot.value}`}
                      >
                        {slot.display}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirmation Section - Always Present */}
              <div className="mt-6 pt-4 border-t space-y-3">
                {selectedDate && selectedTime ? (
                  <div className="text-sm bg-primary/5 rounded-lg p-3">
                    <div className="font-medium text-primary mb-1">Selected appointment</div>
                    <div className="text-muted-foreground text-xs">
                      {selectedDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric',
                        year: 'numeric'
                      })} at {timeSlots.find(s => s.value === selectedTime)?.display}
                    </div>
                    <div className="text-muted-foreground text-xs mt-1">
                      Duration: {durationMinutes} minutes
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-3">
                    Select a date and time to continue
                  </div>
                )}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleConfirmBooking}
                  disabled={!selectedDate || !selectedTime || isLoading}
                  data-testid="button-confirm-booking"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    'Confirm Booking'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Note - Only show in preview mode */}
      {isPreview && (
        <div className="text-center text-xs text-muted-foreground">
          <Badge variant="secondary" className="mb-2">
            Preview Mode
          </Badge>
          <p>This is how clients will select their appointment time</p>
        </div>
      )}
    </div>
  );
}
