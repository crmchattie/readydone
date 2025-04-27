import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getStripeCustomerByUserId } from '@/lib/db/queries';
import { createCustomerPortalSession } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { returnUrl } = body;

    if (!returnUrl) {
      return NextResponse.json(
        { error: 'Missing required field: returnUrl' },
        { status: 400 }
      );
    }

    // Get the Stripe customer ID for the current user
    const customer = await getStripeCustomerByUserId({ userId: user.id });

    if (!customer) {
      return NextResponse.json(
        { error: 'No Stripe customer found for this user' },
        { status: 404 }
      );
    }

    // Create a customer portal session
    const portalSession = await createCustomerPortalSession(
      customer.stripeCustomerId,
      returnUrl
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    );
  }
} 