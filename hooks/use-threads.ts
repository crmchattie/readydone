import useSWR from 'swr';
import { useNavigation, ThreadType } from '@/lib/navigation-context';
import { usePanel } from '@/lib/panel-context';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch threads');
  }
  return response.json();
};

export function useThreads(chatId: string | null) {
  const { setThreads, setSelectedThreadId } = useNavigation();
  const { showPanel } = usePanel();
  
  const { data, error, isLoading } = useSWR(
    chatId ? `/api/threads?chatId=${chatId}` : null,
    fetcher,
    {
      onSuccess: (data) => {
        const threadsForNav = data.map((thread: any) => ({
          id: thread.id,
          name: thread.name,
          status: thread.status || 'pending',
          lastMessage: thread.lastMessagePreview || 'No messages yet',
        }));
        
        setThreads(threadsForNav);
        
        if (threadsForNav.length === 1) {
          setSelectedThreadId(threadsForNav[0].id);
          showPanel('thread-chat');
        }
      },
    }
  );

  return {
    threads: data,
    error,
    isLoading,
  };
} 