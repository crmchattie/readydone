import { NextResponse } from 'next/server';
import { refreshExpiredWatches } from '@/lib/gmail/service';

// This cron job will run daily to refresh Gmail watches that are about to expire
export async function GET(request: Request) {
  try {
    // Verify that this is a CRON job request
    const authHeader = request.headers.get('authorization');
    
    // Simple authentication for Vercel cron
    if (
      process.env.CRON_SECRET &&
      (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`)
    ) {
      console.error('Unauthorized attempt to run the cron job');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Starting to refresh expired Gmail watches');
    
    const refreshedCount = await refreshExpiredWatches();
    
    console.log(`Successfully refreshed ${refreshedCount} Gmail watches`);
    
    return NextResponse.json({
      success: true,
      refreshedCount,
    });
  } catch (error) {
    console.error('Error refreshing Gmail watches:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 