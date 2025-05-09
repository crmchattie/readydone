import { auth } from '@/app/(auth)/auth';
import { getSuggestionsByDocumentId } from '@/lib/db/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');
  const documentCreatedAt = searchParams.get('documentCreatedAt');

  if (!documentId || !documentCreatedAt) {
    return new Response('Missing required parameters', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const suggestions = await getSuggestionsByDocumentId({
    documentId,
    documentCreatedAt: new Date(documentCreatedAt),
    userId: session.user.id!,
  });

  return Response.json(suggestions, { status: 200 });
}
