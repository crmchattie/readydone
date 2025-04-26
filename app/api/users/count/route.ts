import { NextResponse } from 'next/server';
import { getTotalStripeCustomerCount } from '@/lib/db/queries';

export const dynamic = 'force-dynamic'; // Disable static optimization
export const runtime = 'nodejs';

export async function GET() {
  console.log("API Route: Starting GET /api/users/count");
  
  try {
    console.log("API Route: Calling getTotalStripeCustomerCount");
    const count = await getTotalStripeCustomerCount();
    console.log("API Route: Count received:", count);
    
    // Ensure we're returning a proper JSON response
    const response = NextResponse.json({ count: count ?? 0 });
    response.headers.set('Content-Type', 'application/json');
    
    console.log("API Route: Sending response");
    return response;
  } catch (error) {
    console.error('API Route: Failed to get customer count:', error);
    
    const errorResponse = NextResponse.json(
      { 
        error: 'Failed to get customer count',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return errorResponse;
  }
} 