import { auth } from '@/app/(auth)/auth';
import type { ArtifactKind } from '@/components/artifact';
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentsById,
  saveDocument,
  getDocumentAccess,
  getDocumentsByKind,
  saveChat,
  getChatById,
} from '@/lib/db/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const kind = searchParams.get('kind');

  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    if (id) {
      // Get specific document by ID
      const documents = await getDocumentsById({ id });
      const [document] = documents;

      if (!document) {
        return new Response('Not found', { status: 404 });
      }

      // Check if user has access to the document
      const access = await getDocumentAccess({ 
        documentId: document.id, 
        documentCreatedAt: document.createdAt 
      });
      
      const userAccess = access.find(a => a.user.id === session.user?.id);

      if (!userAccess) {
        return new Response('Forbidden', { status: 403 });
      }

      return Response.json(documents, { status: 200 });
    } else if (kind) {
      // Get all documents of a specific kind for the user
      const documents = await getDocumentsByKind({
        kind: kind as ArtifactKind,
        userId: session.user.id
      });
      return Response.json(documents, { status: 200 });
    } else {
      return new Response('Missing id or kind parameter', { status: 400 });
    }
  } catch (error) {
    console.error('Failed to get documents:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const {
    content,
    title,
    kind,
    chatId,
  }: { content: string; title: string; kind: ArtifactKind; chatId: string } =
    await request.json();

  try {
    if (chatId) {
      // Check if chat exists in database
      const existingChat = await getChatById({ id: chatId });
      
      if (!existingChat) {
        // Create new chat if it doesn't exist
        await saveChat({
          id: chatId,
          userId: session.user.id,
          title: `${title}`,
        });
      }
    }

    // Create the document
    const document = await saveDocument({
      id,
      content,
      title,
      kind,
      userId: session.user.id,
      chatId: chatId,
    });

    return Response.json(document, { status: 200 });
  } catch (error) {
    console.error('Failed to create document:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const timestamp = searchParams.get('timestamp');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  if (!timestamp) {
    return new Response('Missing timestamp', { status: 400 });
  }

  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const documents = await getDocumentsById({ id });
  const [document] = documents;

  if (!document) {
    return new Response('Not found', { status: 404 });
  }

  // Check if user has owner access to the document
  const access = await getDocumentAccess({ 
    documentId: document.id, 
    documentCreatedAt: document.createdAt 
  });
  
  const userAccess = access.find(a => 
    a.user.id === session.user?.id && 
    a.role === 'owner'
  );

  if (!userAccess) {
    return new Response('Forbidden', { status: 403 });
  }

  const documentsDeleted = await deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp: new Date(timestamp),
  });

  return Response.json(documentsDeleted, { status: 200 });
}
