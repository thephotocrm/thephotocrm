import { useEffect } from "react";

export default function LeadFormDemo() {
  useEffect(() => {
    document.title = "Lead Form Demo - ThePhotoCRM";
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Lead Form Demo
          </h1>
          <p className="text-gray-600">
            Sample lead capture form showing SMS opt-in messaging for compliance review
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 max-w-xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">
              Get In Touch
            </h2>
            <p className="text-gray-600 text-sm">
              Fill out the form below and we'll get back to you soon!
            </p>
          </div>

          <form className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John"
                  data-testid="input-firstname"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Doe"
                  data-testid="input-lastname"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="john@example.com"
                data-testid="input-email"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(555) 123-4567"
                data-testid="input-phone"
              />
            </div>

            {/* Project Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Type *
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="select-projecttype"
              >
                <option value="">Select a project type</option>
                <option value="wedding">Wedding</option>
                <option value="portrait">Portrait</option>
                <option value="family">Family</option>
                <option value="event">Event</option>
              </select>
            </div>

            {/* Event Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="input-eventdate"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                placeholder="Tell us about your project..."
                data-testid="textarea-message"
              />
            </div>

            {/* SMS Opt-In Checkbox - THE IMPORTANT PART FOR TWILIO */}
            <div className="border-2 border-blue-200 bg-blue-50 rounded-md p-4">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                  data-testid="checkbox-smsoptin"
                />
                <span className="text-xs text-gray-700 leading-relaxed">
                  By submitting this form, you agree to receive SMS messages from <strong>ThePhotoCRM</strong> at the phone number provided. Message & data rates may apply. Message frequency varies based on your interaction with us. You may reply STOP to unsubscribe or HELP for assistance. For details, view our{" "}
                  <a href="#" className="text-blue-600 underline">
                    Privacy Policy
                  </a>{" "}
                  and Terms of Service.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-md hover:bg-blue-700 transition-colors"
              data-testid="button-submit"
            >
              Submit
            </button>
          </form>
        </div>

        {/* Compliance Notes */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6 max-w-xl mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            SMS Compliance Information
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Business Name:</strong> ThePhotoCRM
            </p>
            <p>
              <strong>Opt-In Method:</strong> Checkbox with clear consent language
            </p>
            <p>
              <strong>Required Disclosures:</strong> All present
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Business name clearly stated</li>
              <li>Message & data rates disclosure</li>
              <li>Message frequency information</li>
              <li>STOP to opt-out instructions</li>
              <li>HELP for assistance</li>
              <li>Privacy Policy and Terms link</li>
            </ul>
            <p className="mt-3 pt-3 border-t border-gray-200">
              <strong>Note:</strong> This is a demonstration page created for Twilio compliance review purposes. The form shows the exact SMS opt-in messaging that appears on all lead capture forms throughout ThePhotoCRM platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
