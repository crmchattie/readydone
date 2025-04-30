import { Stripe } from 'stripe';
import { User } from '../db/schema';
import {
  getStripeCustomerByUserId,
  saveStripeCustomer,
  getStripePriceById,
  getStripePriceByStripeId,
  saveStripePayment,
  updateStripePaymentStatus,
  getStripeProductByStripeId,
  createStripeProduct,
  createStripePrice,
  updateStripePrice
} from '../db/queries';

// Initialize Stripe with the secret key from environment variables
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil', // Use the latest API version
});

export type PaymentMethod = 'card' | 'us_bank_account' | 'sepa_debit';

/**
 * Creates or retrieves a Stripe customer for a user
 */
export async function getStripeCustomer(user: User) {
  // Check if user already has a Stripe customer ID
  const existingCustomer = await getStripeCustomerByUserId({ userId: user.id });

  if (existingCustomer) {
    return existingCustomer;
  }

  // Create a new Stripe customer
  const stripeCustomer = await stripe.customers.create({
    email: user.email,
    metadata: {
      userId: user.id,
    },
  });

  // Save the customer to the database
  await saveStripeCustomer({
    userId: user.id,
    stripeCustomerId: stripeCustomer.id,
    email: user.email,
    name: null,
    metadata: {},
  });

  // Retrieve the newly created customer
  return await getStripeCustomerByUserId({ userId: user.id });
}

/**
 * Creates a checkout session for a one-time payment
 */
export async function createCheckoutSession({
  user,
  priceId,
  successUrl,
  cancelUrl,
  metadata = {},
}: {
  user: User;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  const customer = await getStripeCustomer(user);

  const session = await stripe.checkout.sessions.create({
    customer: customer.stripeCustomerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: user.id,
      ...metadata,
    },
  });

  return session;
}

/**
 * Creates a checkout session for a subscription
 */
export async function createSubscriptionCheckoutSession({
  user,
  priceId,
  successUrl,
  cancelUrl,
  metadata = {},
}: {
  user: User;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  const customer = await getStripeCustomer(user);

  const session = await stripe.checkout.sessions.create({
    customer: customer.stripeCustomerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: user.id,
      ...metadata,
    },
  });

  return session;
}

/**
 * Retrieves a product from the database by its Stripe ID
 */
export async function getProductByStripeId(stripeProductId: string) {
  // You would need to create a corresponding query function in queries.ts
  // For now, return null
  return null;
}

/**
 * Retrieves a price from the database by its Stripe ID
 */
export async function getPriceByStripeId(stripePriceId: string) {
  return getStripePriceByStripeId({ stripePriceId });
}

/**
 * Retrieves the payment status for a user
 */
export async function hasUserPaid(userId: string, priceId: string) {
  // You would need to create a corresponding query function in queries.ts
  // For now, always return false
  return false;
}

/**
 * Creates a customer portal session
 */
export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Process webhook events from Stripe
 */
export async function handleWebhookEvent(event: Stripe.Event) {
  console.log("event.type", event.type)
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'payment') {
        // Handle one-time payment completion
        await handleSuccessfulPayment(session);
      } else if (session.mode === 'subscription') {
        // Handle subscription start
        await handleSubscriptionCreated(session);
      }
      break;
    }
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      // Handle successful payment intent
      await handlePaymentIntentSucceeded(paymentIntent);
      break;
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      // Handle invoice payment for subscriptions
      await handleInvoicePaid(invoice);
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      // Handle subscription updates
      await handleSubscriptionUpdated(subscription);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      // Handle subscription cancellations
      await handleSubscriptionDeleted(subscription);
      break;
    }
    case 'price.updated': {
      const price = event.data.object as Stripe.Price;
      // Handle price updates
      await handlePriceUpdated(price);
      break;
    }
    // Add additional event handlers as needed
  }
}

// Helper functions for webhook event handling

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  console.log("handleSuccessfulPayment")
  // Extract data from session
  const userId = session.metadata?.userId;
  const priceId = session.metadata?.priceId;
  const carId = session.metadata?.carId;

  // Handle cases where payment_intent is null but payment_status is 'paid'
  // This can happen with promotional codes that make the payment free
  if (!userId || !priceId) {
    console.error('Missing required data in session', session);
    return;
  }

  try {
    // Get the stripe price ID from the database using the query function
    const price = await getStripePriceById({ id: parseInt(priceId, 10) });
    
    if (!price) {
      console.error(`Price with ID ${priceId} not found in the database`);
      return;
    }


    // Get the customer information from Stripe
    const customerId = session.customer;
    if (!customerId) {
      console.error('No customer ID found in session', session);
      // We can still process the payment without customer information
      // Just save the payment information
      if (session.payment_intent) {
        const paymentIntentId = session.payment_intent as string;
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        const paymentMethod = Array.isArray(paymentIntent.payment_method_types) && 
                           paymentIntent.payment_method_types.length > 0 
                           ? paymentIntent.payment_method_types[0] as string 
                           : 'card';
        
        await saveStripePayment({
          userId,
          stripePaymentIntentId: paymentIntentId,
          stripePriceId: price.stripePriceId,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          paymentMethod,
          metadata: session.metadata || {},
        });
      }
      return;
    }

    // Only try to retrieve and save customer if we have a customer ID
    const customer = await stripe.customers.retrieve(customerId as string);
    
    if (typeof customer === 'object' && !customer.deleted) {
      // Save or update the customer in our database
      await saveStripeCustomer({
        userId,
        stripeCustomerId: customer.id,
        email: customer.email || '',
        name: customer.name || null,
        metadata: customer.metadata || {},
      });
    }

    // Store payment information in the database
    if (session.payment_intent) {
      // If we have a payment intent, retrieve and record it
      const paymentIntentId = session.payment_intent as string;
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      // Get the payment method from the payment intent or default to 'card'
      const paymentMethod = Array.isArray(paymentIntent.payment_method_types) && 
                           paymentIntent.payment_method_types.length > 0 
                           ? paymentIntent.payment_method_types[0] as string 
                           : 'card';
      
      await saveStripePayment({
        userId,
        stripePaymentIntentId: paymentIntentId,
        stripePriceId: price.stripePriceId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        paymentMethod,
        metadata: session.metadata || {},
      });
    } else if (session.payment_status === 'paid') {
      // For payments without a payment intent (e.g., 100% discounted)
      // Create a unique payment ID from the session ID
      const freePaymentId = `free_payment_${session.id}`;
      
      // Get the payment method from the session or default to 'card'
      const paymentMethod = Array.isArray(session.payment_method_types) && 
                           session.payment_method_types.length > 0 
                           ? session.payment_method_types[0] as string 
                           : 'card';
      
      await saveStripePayment({
        userId,
        stripePaymentIntentId: freePaymentId,
        stripePriceId: price.stripePriceId,
        amount: session.amount_total || 0,
        currency: session.currency ?? 'usd',
        status: 'succeeded', // Mark as succeeded since it's paid
        paymentMethod,
        metadata: session.metadata || {},
      });
    } else {
      console.error('No payment_intent and payment not marked as paid', session);
      return;
    }
  } catch (error) {
    console.error('Error processing payment webhook:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // Update payment status in the database if needed
  const userId = paymentIntent.metadata?.userId;
  if (userId) {
    await updateStripePaymentStatus({
      stripePaymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    });
  }
}

async function handleSubscriptionCreated(session: Stripe.Checkout.Session) {
  // Handle new subscription created from checkout
  const userId = session.metadata?.userId;
  const subscriptionId = session.subscription as string;

  if (!userId || !subscriptionId) {
    console.error('Missing required data in session', session);
    return;
  }

  // Retrieve subscription to get additional details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0].price.id;

  // Store subscription in the database
  // This would be implemented in a separate function handleSubscriptionUpdated
  await handleSubscriptionUpdated(subscription);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Find user ID from metadata or customer
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  const userId = typeof customer === 'object' && !customer.deleted ? customer.metadata?.userId : undefined;

  if (!userId) {
    console.error('No userId found for customer', subscription.customer);
    return;
  }

  const priceId = subscription.items.data[0].price.id;

  // Update or create subscription record in the database
  // You would need to create corresponding saveStripeSubscription and updateStripeSubscription functions
  // Implementation omitted
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Handle subscription invoice payments
  // Similar to handlePaymentIntentSucceeded but for invoices
  // Implementation omitted for brevity
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Handle subscription cancellations
  // Implementation omitted for brevity
}

async function handlePriceUpdated(price: Stripe.Price) {
  try {
    // Get the existing price from our database
    const existingPrice = await getStripePriceByStripeId({ stripePriceId: price.id });
    
    if (!existingPrice) {
      // If price doesn't exist, we need to get the product first
      const product = await stripe.products.retrieve(price.product as string);
      
      // First, ensure the product exists in our database
      const existingProduct = await getStripeProductByStripeId({ stripeProductId: product.id });

      let productId;
      if (!existingProduct) {
        // Create the product if it doesn't exist
        const newProduct = await createStripeProduct({
          stripeProductId: product.id,
          name: product.name,
          description: product.description || null,
          active: product.active,
          metadata: product.metadata || {},
        });
        productId = newProduct.id;
      } else {
        productId = existingProduct.id;
      }

      // Now create the price
      await createStripePrice({
        stripePriceId: price.id,
        productId: productId,
        type: price.type === 'recurring' ? 'recurring' : 'one_time',
        currency: price.currency,
        unitAmount: price.unit_amount || 0,
        recurring: price.recurring || null,
        active: price.active,
        metadata: price.metadata || {},
      });

      console.log(`✅ Created new price in database: ${price.id}`);
    } else {
      // Update the existing price in our database
      await updateStripePrice({
        stripePriceId: price.id,
        unitAmount: price.unit_amount || 0,
        currency: price.currency,
        active: price.active,
      });

      console.log(`✅ Updated price in database: ${price.id}`);
    }
  } catch (error) {
    console.error('Error handling price update:', error);
  }
} 