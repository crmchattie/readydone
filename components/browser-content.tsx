'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useBrowser } from '@/hooks/use-browser';
import { useArtifact } from '@/hooks/use-artifact';
import { RecordingPlayer } from './recording-player';

interface BrowserContentProps {
  title: string;
  content: string;
  isInline: boolean;
  status: 'streaming' | 'idle';
  mode: 'edit' | 'diff';
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  getDocumentContentById: (index: number) => string;
  onSaveContent: (content: string, debounce: boolean) => void;
  isLoading: boolean;
  recordingEvents?: any[] | null;
  metadata?: {
    sessionId?: string;
    instanceId?: string;
    steps?: any[];
    isLoading?: boolean;
    isRecording?: boolean;
  };
}

export function BrowserContent({
  title,
  content,
  isInline,
  status,
  metadata,
  mode,
  isCurrentVersion,
  currentVersionIndex,
  getDocumentContentById,
  onSaveContent,
  isLoading: isDocumentLoading,
  recordingEvents
}: BrowserContentProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { metadata: artifactMetadata } = useArtifact();
  
  const sessionMetadata = metadata || artifactMetadata;
  const { session } = useBrowser(sessionMetadata?.instanceId || 'default');

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      if (content && isCurrentVersion) {
        onSaveContent(content, true);
      }
    };

    const handleError = (error: ErrorEvent) => {
      console.error('Browser iframe error:', error);
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError as any);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError as any);
    };
  }, [content, status, sessionMetadata, isCurrentVersion, onSaveContent]);

  useEffect(() => {
    return () => {
      if (!sessionMetadata?.instanceId) {
        console.log('[BrowserContent] Cleaning up session');
      }
    };
  }, [session.sessionId, sessionMetadata]);

  const displayContent = isCurrentVersion ? content : getDocumentContentById(currentVersionIndex);
  const isLoading = isDocumentLoading || session.isLoading || status === 'streaming';

  return (
    <div className={cn(
      "size-full",
      {
        "h-full": !isInline
      }
    )}>
      {recordingEvents ? (
        <RecordingPlayer events={recordingEvents} isInline={isInline} />
      ) : displayContent ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={cn(
            "w-full rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700",
            {
              "aspect-video": isInline,
              "h-full": !isInline
            }
          )}
        >
          <iframe
            ref={iframeRef}
            src={displayContent}
            className="size-full"
            sandbox="allow-same-origin allow-scripts"
            allow="clipboard-read; clipboard-write"
            loading="lazy"
            referrerPolicy="no-referrer"
            title={title}
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "w-full flex items-center justify-center border border-gray-200 rounded-lg dark:border-zinc-700 bg-muted",
            {
              "aspect-video": isInline,
              "h-full": !isInline
            }
          )}
        >
          <div className="text-muted-foreground">
            {isLoading ? 'Loading browser session...' : 'No content available'}
          </div>
        </motion.div>
      )}
    </div>
  );
} 