import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

export interface CreatePaymentIntentParams {
  amountCents: number;
  currency?: string;
  metadata?: Record<string, string>;
}

export async function createPaymentIntent(params: CreatePaymentIntentParams): Promise<string> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amountCents,
    currency: params.currency || 'usd',
    metadata: params.metadata || {},
  });
  
  return paymentIntent.client_secret!;
}

export async function createCheckoutSession(params: {
  amountCents: number;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Wedding Photography Services',
          },
          unit_amount: params.amountCents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
  });

  return session.url!;
}

export async function handleWebhook(body: string, signature: string): Promise<Stripe.Event | null> {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET must be set');
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    return event;
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error);
    return null;
  }
}

export { stripe };
