import { NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { cars } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function GET(request: Request) {
  try {
    // Check user authentication
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the session ID from query parameters
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return new NextResponse('Session ID is required', { status: 400 });
    }

    // Retrieve the session from Stripe
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Extract the search data from the session metadata
    const metadata = stripeSession.metadata || {};
    const userId = metadata.userId || session.user.id;
    const carId = metadata.carId || null;
    
    if (carId) {
      return NextResponse.json({ 
        carId: carId,
        fromMetadata: true
      });
    } else {
      // No car found, but we don't create one here anymore
      // This is now handled by the webhook
      return NextResponse.json({ 
        message: "Car search pending. Webhook is processing payment."
      });
    }
  } catch (error) {
    console.error('Error retrieving session:', error);
    return new NextResponse('Error retrieving session', { status: 500 });
  }
} 