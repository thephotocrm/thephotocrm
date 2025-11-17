fimport { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, Clock, User, Mail, Phone, MessageSquare, Camera } from "lucide-react";
import { updateMetaTags } from "@/lib/meta-tags";

export default function BookingConfirmation() {
  const [, navigate] = useLocation();
  
  // Get booking details from URL params
  const searchParams = new URLSearchParams(window.location.search);
  const businessName = searchParams.get('businessName') || 'the photographer';
  const clientName = searchParams.get('name') || '';
  const clientEmail = searchParams.get('email') || '';
  const clientPhone = searchParams.get('phone') || '';
  const date = searchParams.get('date') || '';
  const startTime = searchParams.get('startTime') || '';
  const endTime = searchParams.get('endTime') || '';
  const notes = searchParams.get('notes') || '';

  useEffect(() => {
    updateMetaTags({
      title: `Booking Confirmed - ${businessName}`,
      description: `Your photography session with ${businessName} has been confirmed.`,
    });
  }, [businessName]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const dayNumber = date.getDate();
    const year = date.getFullYear();
    
    return `${dayName}, ${monthName} ${dayNumber}, ${year}`;
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="shadow-xl border-0">
          <CardContent className="p-8 md:p-12">
            {/* Success Icon */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                You're All Set!
              </h1>
              <p className="text-lg text-gray-600">
                Your consultation with <span className="font-semibold text-gray-900">{businessName}</span> has been confirmed.
              </p>
            </div>

            {/* Appointment Details */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 md:p-8 mb-8 border border-blue-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                Appointment Details
              </h2>
              
              <div className="space-y-4">
                {/* Date */}
                {date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-500 font-medium">Date</div>
                      <div className="text-gray-900 font-medium">{formatDate(date)}</div>
                    </div>
                  </div>
                )}

                {/* Time */}
                {startTime && endTime && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-500 font-medium">Time</div>
                      <div className="text-gray-900 font-medium">
                        {formatTime(startTime)} - {formatTime(endTime)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Name */}
                {clientName && (
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-500 font-medium">Name</div>
                      <div className="text-gray-900 font-medium">{clientName}</div>
                    </div>
                  </div>
                )}

                {/* Email */}
                {clientEmail && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-500 font-medium">Email</div>
                      <div className="text-gray-900 font-medium break-all">{clientEmail}</div>
                    </div>
                  </div>
                )}

                {/* Phone */}
                {clientPhone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-500 font-medium">Phone</div>
                      <div className="text-gray-900 font-medium">{clientPhone}</div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {notes && (
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-500 font-medium">Notes</div>
                      <div className="text-gray-900">{notes}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Confirmation Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">✓ Confirmation email sent</span>
                <br />
                We've sent all the details to <span className="font-medium">{clientEmail}</span>. 
                Please check your inbox for the confirmation email.
              </p>
            </div>

            {/* What's Next */}
            <div className="text-center text-sm text-gray-600 space-y-2">
              <p className="font-medium text-gray-900">What happens next?</p>
              <p>
                You'll receive a confirmation email with a calendar invite and all the details for your session. 
                If you have any questions before then, feel free to reply to the email.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Optional: Add a "Back to Home" button if you want */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            You can safely close this page
          </p>
        </div>
      </div>
    </div>
  );
}
