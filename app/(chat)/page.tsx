import { cookies } from 'next/headers';
import { auth } from '@/app/(auth)/auth';

import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { FourPanelLayout } from '@/components/four-panel-layout';
import { getChatsByUserId } from '@/lib/db/queries';

export default async function Page() {
  const id = generateUUID();

  const [cookieStore, session] = await Promise.all([cookies(), auth()]);
  const modelIdFromCookie = cookieStore.get('chat-model');
  
  // Fetch initial chats if user is authenticated
  const chatsResponse = session?.user?.id ? await getChatsByUserId({
    id: session.user.id,
    limit: 50,
    startingAfter: null,
    endingBefore: null
  }) : { chats: [] };
  
  // Transform the chats to the correct format
  const initialChats = chatsResponse.chats.map(item => ({
    id: item.chat.id,
    createdAt: new Date(item.chat.createdAt),
    title: item.chat.title,
    visibility: item.chat.visibility
  }));

  if (!modelIdFromCookie) {
    return (
      <>
        <FourPanelLayout
          selectedChatModel={DEFAULT_CHAT_MODEL}
          selectedVisibilityType="private"
          isReadonly={false}
          user={session?.user}
          initialChats={initialChats}
        />
        <DataStreamHandler id={id} />
      </>
    );
  }

  return (
    <>
      <FourPanelLayout
        selectedChatModel={modelIdFromCookie.value}
        selectedVisibilityType="private"
        isReadonly={false}
        user={session?.user}
        initialChats={initialChats}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
