import { NextResponse } from 'next/server';
import { getActiveStripeProducts } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';

export async function GET() {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active products with prices
    const products = await getActiveStripeProducts();
    
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
} 