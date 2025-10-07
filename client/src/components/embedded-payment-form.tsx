import { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Shield, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface PaymentFormProps {
  token: string;
  paymentType: 'DEPOSIT' | 'FULL' | 'BALANCE';
  baseAmount: number;
  tipCents: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function StripePaymentForm({ token, paymentType, baseAmount, tipCents, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const totalAmount = baseAmount + tipCents;

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message || "Payment failed");
        setIsProcessing(false);
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/smart-file/${token}/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || "Payment failed");
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        await apiRequest(
          'POST',
          `/api/public/smart-files/${token}/confirm-payment`,
          {
            paymentIntentId: paymentIntent.id,
            paymentType,
            tipCents,
          }
        );
        onSuccess();
      }
    } catch (err) {
      console.error("Payment error:", err);
      onError("Payment failed");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount Due - Large Display */}
      <div>
        <div className="text-sm text-muted-foreground mb-1">Amount due</div>
        <div className="text-4xl font-bold" data-testid="text-amount-due">{formatPrice(totalAmount)}</div>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">OR</span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="space-y-4">
        <PaymentElement />
      </div>

      {/* SSL Security Badge */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t">
        <Shield className="w-4 h-4" />
        <span>We use the same SSL encryption technology that banks use to protect your sensitive data.</span>
      </div>

      {/* Footer with Pay Button */}
      <div className="flex items-center justify-between gap-3 pt-4">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Shield className="w-3 h-3" />
          <span>Secured by <span className="font-semibold">Stripe</span></span>
        </div>
        <Button
          type="submit"
          className="bg-primary hover:bg-primary/90 h-11 px-8"
          disabled={!stripe || isProcessing}
          data-testid="button-submit-payment"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ${formatPrice(totalAmount)}`
          )}
        </Button>
      </div>
    </form>
  );
}

function TipSelector({ baseAmount, onContinue }: { baseAmount: number; onContinue: (tipCents: number) => void }) {
  const [selectedTip, setSelectedTip] = useState<number | 'custom' | null>(null);
  const [customTip, setCustomTip] = useState("");

  const tipPercentages = [10, 15, 20];

  const calculateTipAmount = () => {
    if (selectedTip === 'custom') {
      const customAmount = parseFloat(customTip) || 0;
      return Math.round(customAmount * 100);
    } else if (typeof selectedTip === 'number') {
      return Math.round((baseAmount * selectedTip) / 100);
    }
    return 0;
  };

  const tipCents = calculateTipAmount();

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <div className="space-y-6">
      {/* Amount Due - Large Display */}
      <div>
        <div className="text-sm text-muted-foreground mb-1">Amount due</div>
        <div className="text-4xl font-bold" data-testid="text-base-amount">{formatPrice(baseAmount)}</div>
      </div>

      {/* Tip Section */}
      <div className="space-y-3">
        <div className="text-sm font-medium">Would you like to leave a tip?</div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            type="button"
            variant={selectedTip === null ? "default" : "outline"} 
            size="sm" 
            className="flex-1 min-w-[80px]"
            onClick={() => {
              setSelectedTip(null);
              setCustomTip("");
            }}
            data-testid="button-no-tip"
          >
            No thanks
          </Button>
          {tipPercentages.map((percentage) => {
            const tipAmount = Math.round((baseAmount * percentage) / 100);
            return (
              <Button
                key={percentage}
                type="button"
                variant={selectedTip === percentage ? "default" : "outline"}
                size="sm"
                className="flex-1 min-w-[80px]"
                onClick={() => {
                  setSelectedTip(percentage);
                  setCustomTip("");
                }}
                data-testid={`button-tip-${percentage}`}
              >
                <div className="text-center">
                  <div className="font-semibold">{percentage}%</div>
                  <div className="text-xs text-muted-foreground">{formatPrice(tipAmount)}</div>
                </div>
              </Button>
            );
          })}
          <Button
            type="button"
            variant={selectedTip === 'custom' ? "default" : "outline"}
            size="sm"
            className="flex-1 min-w-[80px]"
            onClick={() => setSelectedTip('custom')}
            data-testid="button-tip-custom"
          >
            Custom
          </Button>
        </div>
        {selectedTip === 'custom' && (
          <Input
            type="number"
            placeholder="Enter custom tip amount"
            value={customTip}
            onChange={(e) => setCustomTip(e.target.value)}
            min="0"
            step="0.01"
            className="mt-2"
            data-testid="input-custom-tip"
          />
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          className="h-11 px-8"
          onClick={() => onContinue(tipCents)}
          data-testid="button-continue-payment"
        >
          Continue to payment
        </Button>
      </div>
    </div>
  );
}

export function EmbeddedPaymentForm(props: PaymentFormProps & { publishableKey: string }) {
  const [tipCents, setTipCents] = useState<number | null>(null);
  const [stripePromise] = useState(() => loadStripe(props.publishableKey));

  const { data: paymentIntentData, isLoading, error } = useQuery({
    queryKey: ['/api/public/smart-files', props.token, 'payment-intent', props.paymentType, tipCents],
    enabled: tipCents !== null,
    queryFn: async () => {
      const response = await apiRequest(
        'POST',
        `/api/public/smart-files/${props.token}/create-payment-intent`,
        { paymentType: props.paymentType, tipCents }
      );
      return response.json();
    },
  });

  if (tipCents === null) {
    return <TipSelector baseAmount={props.baseAmount} onContinue={setTipCents} />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-400">Failed to initialize payment</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setTipCents(null)}
          className="w-full"
          data-testid="button-back-to-tip"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    );
  }

  if (isLoading || !paymentIntentData?.clientSecret) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret: paymentIntentData.clientSecret,
    appearance: {
      theme: 'stripe',
    },
  };

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTipCents(null)}
        className="text-muted-foreground -ml-2"
        data-testid="button-change-tip"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Change tip
      </Button>
      <Elements stripe={stripePromise} options={options}>
        <StripePaymentForm {...props} tipCents={tipCents} />
      </Elements>
    </div>
  );
}
