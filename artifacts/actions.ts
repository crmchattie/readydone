'use server';

import { getSuggestionsByDocumentId } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';

export async function getSuggestions({ documentId, documentCreatedAt = new Date() }: { documentId: string; documentCreatedAt?: Date }) {
  const session = await auth();
  if (!session?.user?.id) return [];
  
  const suggestions = await getSuggestionsByDocumentId({ documentId, documentCreatedAt, userId: session.user.id });
  return suggestions ?? [];
}
