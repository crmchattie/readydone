import { NextRequest, NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import { handleWebhookEvent } from '@/lib/stripe';

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    console.log("webhook received")
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: 'Missing stripe-signature or webhook secret' },
        { status: 400 }
      );
    }

    // Verify the webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    // Process the webhook event
    await handleWebhookEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
} 