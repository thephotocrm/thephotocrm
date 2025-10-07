import { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
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
        await apiRequest(`/api/public/smart-files/${token}/confirm-payment`, {
          method: 'POST',
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            paymentType,
            tipCents,
          }),
        });
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
      {/* Payment Amount Summary */}
      <div className="space-y-2 pb-4 border-b">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {paymentType === 'DEPOSIT' ? 'Deposit' : paymentType === 'BALANCE' ? 'Balance' : 'Total'} amount
          </span>
          <span data-testid="text-base-amount">{formatPrice(baseAmount)}</span>
        </div>
        {tipCents > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tip</span>
            <span data-testid="text-tip-amount">{formatPrice(tipCents)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold">
          <span>Total to pay</span>
          <span data-testid="text-total-payment">{formatPrice(totalAmount)}</span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="space-y-4">
        <PaymentElement />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full h-12 text-base"
        size="lg"
        disabled={!stripe || isProcessing}
        data-testid="button-submit-payment"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing payment...
          </>
        ) : (
          `Pay ${formatPrice(totalAmount)}`
        )}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        Secure payment powered by Stripe • Supports cards, Apple Pay, and Google Pay
      </p>
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
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Add a tip (optional)</h4>
        <div className="grid grid-cols-4 gap-2">
          {tipPercentages.map((percentage) => (
            <Button
              key={percentage}
              type="button"
              variant={selectedTip === percentage ? "default" : "outline"}
              className="h-12"
              onClick={() => {
                setSelectedTip(percentage);
                setCustomTip("");
              }}
              data-testid={`button-tip-${percentage}`}
            >
              {percentage}%
            </Button>
          ))}
          <Button
            type="button"
            variant={selectedTip === 'custom' ? "default" : "outline"}
            className="h-12"
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
        {tipCents > 0 && (
          <p className="text-sm text-muted-foreground">
            Tip amount: {formatPrice(tipCents)}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-12"
          onClick={() => onContinue(0)}
          data-testid="button-skip-tip"
        >
          No tip
        </Button>
        <Button
          type="button"
          className="flex-1 h-12"
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
      const response = await apiRequest(`/api/public/smart-files/${props.token}/create-payment-intent`, {
        method: 'POST',
        body: JSON.stringify({ paymentType: props.paymentType, tipCents }),
      });
      return response;
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
        className="text-muted-foreground"
        data-testid="button-change-tip"
      >
        ← Change tip
      </Button>
      <Elements stripe={stripePromise} options={options}>
        <StripePaymentForm {...props} tipCents={tipCents} />
      </Elements>
    </div>
  );
}
