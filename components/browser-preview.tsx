'use client';

import { useEffect, useRef, useState, memo } from "react";
import { motion } from "framer-motion";
import { BrowserResult, BrowserStep, BrowserState } from "@/lib/db/types";
import { FullscreenIcon, LoaderIcon } from './icons';
import { cn } from '@/lib/utils';
import { useArtifact } from '@/hooks/use-artifact';
import { useBrowser } from '@/hooks/use-browser';
import { BrowserContent } from '@/components/browser-content';

export interface BrowserPreviewProps {
  result?: BrowserResult;
  args?: {
    task: string;
    url?: string;
    variables?: Record<string, string>;
    extractionSchema?: Record<string, any>;
    maxAttempts?: number;
  };
  isReadonly?: boolean;
  isInline?: boolean;
}

function LoadingSkeleton() {
  return (
    <div className="w-full">
      <div className="p-4 border rounded-t-2xl flex flex-row gap-2 items-center justify-between dark:bg-muted h-[57px] dark:border-zinc-700 border-b-0">
        <div className="flex flex-row items-center gap-3">
          <div className="text-muted-foreground">
            <div className="animate-pulse rounded-md size-4 bg-muted-foreground/20" />
          </div>
          <div className="animate-pulse rounded-lg h-4 bg-muted-foreground/20 w-24" />
        </div>
        <div>
          <FullscreenIcon />
        </div>
      </div>
      <div className="overflow-y-scroll border rounded-b-2xl bg-muted border-t-0 dark:border-zinc-700">
        <div className="animate-pulse h-[257px] bg-muted-foreground/20 w-full" />
      </div>
    </div>
  );
}

interface BrowserHeaderProps {
  title: string;
  isConnected: boolean;
  isLoading?: boolean;
  onToggleFullscreen: () => void;
}

const PureBrowserHeader = ({ 
  title, 
  isConnected,
  isLoading,
  onToggleFullscreen
}: BrowserHeaderProps) => (
  <div className="p-4 border rounded-t-2xl flex flex-row gap-2 items-start sm:items-center justify-between dark:bg-muted border-b-0 dark:border-zinc-700">
    <div className="flex flex-row items-start sm:items-center gap-3">
      <div className="text-muted-foreground">
        {isLoading ? (
          <div className="animate-spin">
            <LoaderIcon />
          </div>
        ) : (
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-blue-500" : "bg-red-500"
          )} />
        )}
      </div>
      <div className="-translate-y-1 sm:translate-y-0 font-medium">{title}</div>
    </div>
    <div 
      className={cn(
        "p-2 rounded-md cursor-pointer",
        isConnected 
          ? "hover:dark:bg-zinc-700 hover:bg-zinc-100" 
          : "opacity-50 cursor-not-allowed"
      )}
      onClick={isConnected ? onToggleFullscreen : undefined}
    >
      <FullscreenIcon />
    </div>
  </div>
);

const BrowserHeader = memo(PureBrowserHeader, (prevProps, nextProps) => {
  if (prevProps.title !== nextProps.title) return false;
  if (prevProps.isConnected !== nextProps.isConnected) return false;
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  return true;
});

export function BrowserPreview({ result: initialResult, args, isReadonly, isInline = true }: BrowserPreviewProps) {
  const { artifact, setArtifact } = useArtifact();
  // Create a stable instance ID using the task as a key
  const instanceId = useRef(args?.task ? 
    `browser-${args.task.slice(0, 32).replace(/[^a-zA-Z0-9]/g, '-')}` : 
    Math.random().toString(36).substring(7)
  ).current;
  const { session, execute } = useBrowser(instanceId);
  const hitboxRef = useRef<HTMLDivElement>(null);
  const hasAttemptedExecution = useRef(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Handle task execution
  useEffect(() => {
    const executeTask = async () => {
      try {
        if (args?.task && !session.sessionId && !session.isLoading && !initialResult && !hasAttemptedExecution.current && !isExecuting) {
          hasAttemptedExecution.current = true;
          setIsExecuting(true);
          try {
            await execute(args.task);
          } catch (error) {
            throw error;
          } finally {
            setIsExecuting(false);
          }
        }
      } catch (error) {
        console.error('Failed to execute browser task:', error);
        setIsExecuting(false);
      }
    };

    executeTask();
  }, [args?.task, session.sessionId, session.isLoading, execute, initialResult, instanceId, isExecuting]);

  // Handle URL resolution
  const sessionUrl = session.sessionUrl || initialResult?.sessionUrl;
  
  useEffect(() => {
  }, [session.sessionUrl, initialResult?.sessionUrl, sessionUrl, instanceId]);

  // Handle artifact updates
  useEffect(() => {
    const boundingBox = hitboxRef.current?.getBoundingClientRect();
    if (boundingBox && sessionUrl) {
      setArtifact((artifact) => ({
        ...artifact,
        kind: 'browser',
        title: args?.task || "Browser Session",
        content: sessionUrl,
        boundingBox: {
          left: boundingBox.x,
          top: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height,
        },
      }));
    }
  }, [setArtifact, sessionUrl, initialResult?.sessionUrl, args?.task, instanceId, artifact.isVisible, session.steps]);

  if (!initialResult && !args) {
    return <LoadingSkeleton />;
  }

  const isConnected = !!session.sessionId || !!initialResult?.sessionId;
  const steps = session.steps.length > 0 ? session.steps : (initialResult?.steps || []);
  const isCompleted = !session.isLoading && steps.length > 0 && 
    steps.every(step => step.status === 'completed' || step.status === 'failed');
  const isLoading = session.isLoading || isExecuting || (steps.length > 0 && !isCompleted);

  return (
    <motion.div 
      className="flex flex-col rounded-2xl border border-gray-200 overflow-hidden bg-white dark:bg-muted dark:border-zinc-700"
      variants={{
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
          opacity: 1,
          scale: 1,
          transition: {
            type: "spring",
            stiffness: 350,
            damping: 30,
          }
        },
        exit: {
          opacity: 0,
          scale: 0.95,
          transition: { duration: 0.2 },
        }
      }}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="relative" ref={hitboxRef}>
        <BrowserHeader 
          title={args?.task || "Browser Session"} 
          isConnected={isConnected}
          isLoading={isLoading}
          onToggleFullscreen={() => {
            if (sessionUrl) {
              setArtifact(current => ({
                ...current,
                isVisible: true,
                kind: 'browser',
                title: args?.task || "Browser Session", 
                content: sessionUrl,
                metadata: {
                  sessionId: session.sessionId,
                  instanceId,
                  steps: session.steps,
                  isLoading: session.isLoading
                }
              }));
            }
          }}
        />
      </div>

      <div className="flex-1">
        {sessionUrl ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className={cn(
              "w-full rounded-lg overflow-hidden",
              {
                "aspect-video": isInline,
                "h-[calc(100vh-57px)]": !isInline
              }
            )}
          >
            <iframe
              src={sessionUrl}
              className="w-full h-full"
              sandbox="allow-same-origin allow-scripts"
              allow="clipboard-read; clipboard-write"
              loading="lazy"
              referrerPolicy="no-referrer"
              title={args?.task || "Browser Session"}
            />
          </motion.div>
        ) : (
          <div className="w-full aspect-video flex items-center justify-center border border-gray-200 rounded-lg dark:border-zinc-700 bg-muted">
            <div className="text-muted-foreground">
              {session.isLoading ? 'Loading browser session...' : 'No content available'}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function BrowserToolComponent({ toolInvocation, isReadonly }: { 
  toolInvocation: any;
  isReadonly: boolean;
}) {
  const { args, state, result } = toolInvocation;
  return (
    <BrowserPreview 
      args={args} 
      result={state === 'result' ? result : undefined} 
      isReadonly={isReadonly} 
    />
  );
}