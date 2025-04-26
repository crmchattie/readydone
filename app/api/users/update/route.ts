import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { updateUser } from '@/lib/db/queries';
import { z } from 'zod';

const updateUserSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
});

export async function PUT(request: Request) {
  try {
    // Get the current user from the session
    const session = await auth();
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate the request body
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);
    
    // Ensure the user is updating their own profile
    if (validatedData.id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Update the user in the database
    await updateUser({
      id: validatedData.id,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: validatedData.email,
    });
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 