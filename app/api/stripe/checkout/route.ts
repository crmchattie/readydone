import { NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import {
  getStripePriceById,
  getStripePriceByStripeId,
  getTotalStripeCustomerCount,
  getStripeCustomerByUserId
} from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

// Promotion code for early adopters
const EARLY_ADOPTER_PROMO_CODE = 'LAUNCHOFFER';
const FREEFOREVER_PROMO_CODE = 'FREEFOREVER';

export async function POST(req: Request) {
  try {
    const session = await auth();

    // Check if user is authenticated
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get data from request
    const { priceId, carId } = await req.json();

    if (!priceId) {
      return new NextResponse('Price ID is required', { status: 400 });
    }

    // Find the price information
    let price;
    // Handle both Stripe price IDs and database IDs
    if (typeof priceId === 'string' && priceId.startsWith('price_')) {
      // Get the price by Stripe ID
      price = await getStripePriceByStripeId({ stripePriceId: priceId });
    } else {
      // Try to handle numeric IDs
      try {
        const idAsNumber = parseInt(priceId);
        if (!isNaN(idAsNumber)) {
          price = await getStripePriceById({ id: idAsNumber });
        }
      } catch (error) {
        console.error('Error parsing price ID:', error);
      }
    }

    // If we still don't have a price, try to get it by Stripe ID as a fallback
    if (!price) {
      try {
        price = await getStripePriceByStripeId({ stripePriceId: priceId.toString() });
      } catch (error) {
        console.error('Error getting price by Stripe ID:', error);
      }
    }

    if (!price) {
      return new NextResponse(`Price not found for ID: ${priceId}`, { status: 404 });
    }

    // Check if user is eligible for the early adopter promotion
    let applyPromoCode = false;
    let promoCodeId: string | null = null;

    // Check if we're on localhost and a promo code was provided
    const isLocalhost = process.env.NEXT_PUBLIC_APP_URL?.includes('localhost');
    const isCorporateUser = session?.user?.email?.endsWith('@readydone.ai')

    if (isLocalhost || isCorporateUser) {
      // Look up the provided promo code
      applyPromoCode = true;

      // Look up the promo code by code string
      const promoCodes = await stripe.promotionCodes.list({
        code: FREEFOREVER_PROMO_CODE,
        active: true,
      });

      const promo = promoCodes.data[0];
      if (promo) {
        promoCodeId = promo.id;
        console.log(`Applying early adopter promotion for user ${session.user.id}`);
      } else {
        console.warn('Promo code not found or inactive.');
      }
    } else {
      // Check if total customer count is less than 1000
      const totalCustomerCount = await getTotalStripeCustomerCount();

      if (totalCustomerCount < 1000) {
        // Check if user is already a customer
        const existingCustomer = await getStripeCustomerByUserId({ userId: session.user.id });

        // Apply promo code if user is not already a customer
        if (!existingCustomer) {
          applyPromoCode = true;

          // Look up the promo code by code string
          const promoCodes = await stripe.promotionCodes.list({
            code: EARLY_ADOPTER_PROMO_CODE,
            active: true,
          });

          const promo = promoCodes.data[0];
          if (promo) {
            promoCodeId = promo.id;
            console.log(`Applying early adopter promotion for user ${session.user.id}`);
          } else {
            console.warn('Promo code not found or inactive.');
          }
        }
      }
    }

    // Create the checkout session with the price
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/car-search?payment=cancelled&car_id=${carId}`,
      metadata: {
        userId: session.user.id,
        priceId: price.id.toString(),
        carId: carId ? carId.toString() : '',
      },
      ...(applyPromoCode && promoCodeId && { discounts: [{ promotion_code: promoCodeId }] }),
    });

    // Return the checkout URL
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new NextResponse(`Error creating checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
} 