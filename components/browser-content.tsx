'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useBrowser } from '@/hooks/use-browser';
import { useArtifact } from '@/hooks/use-artifact';

interface BrowserContentProps {
  title: string;
  content: string;
  isInline: boolean;
  status: 'streaming' | 'idle';
  metadata?: {
    sessionId?: string;
    instanceId?: string;
    steps?: any[];
    isLoading?: boolean;
  };
}

export function BrowserContent({
  title,
  content,
  isInline,
  status,
  metadata
}: BrowserContentProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { metadata: artifactMetadata } = useArtifact();
  
  const sessionMetadata = metadata || artifactMetadata;
  const { session } = useBrowser(sessionMetadata?.instanceId || 'default');

  useEffect(() => {
    if (!iframeRef.current) return;

    const handleLoad = () => {
      // Handle iframe load
    };

    const handleError = (error: ErrorEvent) => {
      console.error('Browser iframe error:', error);
    };

    iframeRef.current.addEventListener('load', handleLoad);
    iframeRef.current.addEventListener('error', handleError as any);

    return () => {
      iframeRef.current?.removeEventListener('load', handleLoad);
      iframeRef.current?.removeEventListener('error', handleError as any);
    };
  }, [content, status, sessionMetadata]);

  useEffect(() => {
    return () => {
      if (!sessionMetadata?.instanceId) {
        // Clean up browser session
      }
    };
  }, [session.sessionId, sessionMetadata]);

  return (
    <div className={cn(
      "w-full h-full",
      {
        "h-full": !isInline
      }
    )}>
      {content ? (
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
            src={content}
            className="w-full h-full"
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
            {status === 'streaming' ? 'Loading browser session...' : 'No content available'}
          </div>
        </motion.div>
      )}
    </div>
  );
} 