import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getUser } from '@/lib/db/queries';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const users = await getUser(session.user.email!);
    if (!users.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];
    
    return NextResponse.json({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      onboardingCompletedAt: user.onboardingCompletedAt,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 