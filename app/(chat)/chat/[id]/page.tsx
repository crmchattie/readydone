import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { auth } from '@/app/(auth)/auth';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { getChatById, getMessagesByChatId, getThreadsByChatId } from '@/lib/db/queries';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DBMessage } from '@/lib/db/schema';
import { Attachment, UIMessage } from 'ai';
import { FourPanelLayout } from '@/components/four-panel-layout';
import { ChatStoreInitializer } from '@/components/chat-store-initializer';

function convertToUIMessages(messages: Array<DBMessage>): Array<UIMessage> {
  return messages.map((message) => ({
    id: message.id,
    parts: message.parts as UIMessage['parts'],
    role: message.role as UIMessage['role'],
    // Note: content will soon be deprecated in @ai-sdk/react
    content: '',
    createdAt: message.createdAt,
    experimental_attachments:
      (message.attachments as Array<Attachment>) ?? [],
  }));
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();

  if (chat.visibility === 'private') {
    if (!session || !session.user) {
      return notFound();
    }

    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  // Fetch threads early
  const threads = await getThreadsByChatId({ chatId: id });

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get('chat-model');
  const isReadonly = session?.user?.id !== chat.userId;
  const messages = convertToUIMessages(messagesFromDb);

  if (!chatModelFromCookie) {
    return (
      <>
        <ChatStoreInitializer 
          chat={chat} 
          messages={messages}
          threads={threads}
        />
        <FourPanelLayout
          selectedChatModel={DEFAULT_CHAT_MODEL}
          selectedVisibilityType={chat.visibility}
          isReadonly={isReadonly}
          user={session?.user}
        />
        <DataStreamHandler id={id} />
      </>
    );
  }

  return (
    <>
      <ChatStoreInitializer 
        chat={chat} 
        messages={messages}
        threads={threads}
      />
      <FourPanelLayout
        selectedChatModel={chatModelFromCookie.value}
        selectedVisibilityType={chat.visibility}
        isReadonly={isReadonly}
        user={session?.user}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
