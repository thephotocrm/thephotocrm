import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Clock, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
}: SchedulingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const { toast } = useToast();

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
      toast({
        title: "Booking Confirmed!",
        description: `Your appointment is scheduled for ${selectedDate?.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric',
          year: 'numeric'
        })} at ${timeSlots.find(s => s.value === selectedTime)?.display}`,
      });
    }
  };

  // Generate sample time slots (9 AM - 5 PM)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        slots.push({ value: timeStr, display: displayTime });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className="space-y-6">
      {/* Photographer Profile Header */}
      {photographerName && (
        <div className="flex flex-col items-center gap-4 pb-6 border-b">
          <Avatar className="w-20 h-20 border-2 border-primary">
            {photographerPhoto ? (
              <AvatarImage src={photographerPhoto} alt={photographerName} />
            ) : null}
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

      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{heading}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>

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
              <div className="flex-1 overflow-y-auto max-h-[500px] pr-2">
                <div className="grid grid-cols-2 gap-2">
                  {timeSlots.map((slot) => (
                    <Button
                      key={slot.value}
                      variant={selectedTime === slot.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTime(slot.value)}
                      disabled={!selectedDate}
                      className={cn(
                        "justify-center transition-all",
                        !selectedDate && "opacity-50 cursor-not-allowed"
                      )}
                      data-testid={`time-slot-${slot.value}`}
                    >
                      {slot.display}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Confirmation Section */}
              {selectedDate && selectedTime && (
                <div className="mt-6 pt-4 border-t space-y-3">
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
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleConfirmBooking}
                    disabled={isLoading}
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
              )}
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
