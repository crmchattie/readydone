'use server';

import { z } from 'zod';
import { auth } from '../(auth)/auth';
import { updateUser } from '@/lib/db/queries';
import { createSafeActionClient } from 'next-safe-action';

const actionClient = createSafeActionClient();

const onboardingSchema = z.object({
  firstName: z.string().min(1).max(64),
  lastName: z.string().min(1).max(64),
  usageType: z.enum(['personal', 'business', 'both']),
  referralSource: z.string().optional(),
});

export const saveOnboarding = actionClient
  .schema(onboardingSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        return { status: 'failed' };
      }

      await updateUser({
        id: session.user.id,
        ...parsedInput,
        onboardingCompletedAt: new Date(),
      });

      return { status: 'success' };
    } catch (error) {
      console.error('Failed to save onboarding data:', error);
      return { status: 'failed' };
    }
  });

export type OnboardingActionState =
  | { status: 'idle' }
  | { status: 'invalid_data' }
  | { status: 'failed' }
  | { status: 'success' }; 