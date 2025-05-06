import { auth } from '@/app/(auth)/auth';
import { getDocumentsByKind, getDocumentsByChatId } from '@/lib/db/queries';
import { artifactKinds } from '@/lib/artifacts/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind');
  const chatId = searchParams.get('chatId');

  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    if (kind) {
      if (!artifactKinds.includes(kind as any)) {
        return new Response('Invalid kind', { status: 400 });
      }

      const documents = await getDocumentsByKind({
        kind: kind as any,
        userId: session.user.id,
      });

      return Response.json(documents, { status: 200 });
    }

    if (chatId) {
      const documents = await getDocumentsByChatId({
        chatId,
        userId: session.user.id,
      });

      return Response.json(documents, { status: 200 });
    }

    return new Response('Missing kind or chatId parameter', { status: 400 });
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 