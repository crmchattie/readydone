import { cookies } from 'next/headers';
import { auth } from '@/app/(auth)/auth';

import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { FourPanelLayout } from '@/components/four-panel-layout';

export default async function Page() {
  const id = generateUUID();

  const [cookieStore, session] = await Promise.all([cookies(), auth()]);
  const modelIdFromCookie = cookieStore.get('chat-model');

  if (!modelIdFromCookie) {
    return (
      <>
        <FourPanelLayout
          selectedChatModel={DEFAULT_CHAT_MODEL}
          selectedVisibilityType="private"
          isReadonly={false}
          user={session?.user}
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
      />
      <DataStreamHandler id={id} />
    </>
  );
}
