import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SchedulingCalendarProps {
  heading?: string;
  description?: string;
  durationMinutes: number;
  bookingType: string;
  bufferBefore?: number;
  bufferAfter?: number;
  allowRescheduling?: boolean;
}

export function SchedulingCalendar({
  heading = "Schedule Your Session",
  description,
  durationMinutes = 60,
  bookingType = "ONE_TIME",
}: SchedulingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);

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
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{heading}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Session Info */}
      <div className="flex items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>{durationMinutes} min</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          <span>{bookingType === "ONE_TIME" ? "One-time" : "Recurring"}</span>
        </div>
      </div>

      {/* Calendar and Time Selection */}
      <Card>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar */}
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
                data-testid="calendar-date-picker"
              />
            </div>

            {/* Time Slots */}
            <div className="space-y-3">
              <div className="text-sm font-medium">
                {selectedDate ? (
                  <span>
                    Available times for{" "}
                    <span className="text-primary">
                      {selectedDate.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Select a date to see available times</span>
                )}
              </div>

              {selectedDate && (
                <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-2">
                  {timeSlots.map((slot) => (
                    <Button
                      key={slot.value}
                      variant={selectedTime === slot.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTime(slot.value)}
                      className={cn(
                        "justify-center",
                        selectedTime === slot.value && "ring-2 ring-primary ring-offset-2"
                      )}
                      data-testid={`time-slot-${slot.value}`}
                    >
                      {slot.display}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Confirmation Button */}
          {selectedDate && selectedTime && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm">
                  <div className="font-medium">Selected appointment:</div>
                  <div className="text-muted-foreground">
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
              </div>
              <Button 
                className="w-full" 
                size="lg"
                data-testid="button-confirm-booking"
              >
                Confirm Booking
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Note */}
      <div className="text-center text-xs text-muted-foreground">
        <Badge variant="secondary" className="mb-2">
          Preview Mode
        </Badge>
        <p>This is how clients will select their appointment time</p>
      </div>
    </div>
  );
}
