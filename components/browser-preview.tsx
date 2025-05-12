'use client';

import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { motion } from "framer-motion";
import { browserStateAtom } from "@/lib/browserbase/store";
import { BrowserResult, BrowserStep } from "@/lib/db/types";
import { PauseIcon, PlayIcon, RefreshIcon } from './icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useBrowser } from "@/hooks/use-browser";
import { Button } from "./ui/button";

// Debug helper
const debug = (message: string, data?: any) => {
  console.debug(`[BrowserPreview] ${message}`, data ? data : '');
};

export interface BrowserPreviewProps {
  result?: BrowserResult;
  args?: {
    url: string;
    task: string;
    variables?: Record<string, string>;
    extractionSchema?: Record<string, any>;
    maxAttempts?: number;
  };
  isReadonly?: boolean;
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
      <div className="h-64 bg-gray-200 rounded" />
    </div>
  );
}

interface BrowserHeaderProps {
  title: string;
  isConnected: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onClose: () => void;
  isCompleted?: boolean;
}

function BrowserHeader({ title, isConnected, isPaused, onPause, onResume, onClose, isCompleted }: BrowserHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-medium">{title}</h3>
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-2 h-2 rounded-full",
          isCompleted ? "bg-green-500" :
          isConnected ? "bg-blue-500" : "bg-red-500"
        )} />
        <span className="text-sm text-gray-500">
          {isCompleted ? "Completed" :
           isConnected ? (isPaused ? "Paused" : "Connected") : "Disconnected"}
        </span>
        {isConnected && !isCompleted && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={isPaused ? onResume : onPause}
            >
              {isPaused ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <RefreshIcon size={16} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface BrowserContentProps {
  result?: BrowserResult;
  args?: BrowserPreviewProps['args'];
  isPaused: boolean;
  onExecute: () => void;
  isCompleted?: boolean;
}

function BrowserContent({ result, args, isPaused, onExecute, isCompleted }: BrowserContentProps) {
  if (!result && !args) return null;

  return (
    <div className="flex flex-col gap-4">
      {args && !isCompleted && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Task Details</h4>
          <p className="text-sm text-gray-600">URL: {args.url}</p>
          <p className="text-sm text-gray-600">Task: {args.task}</p>
          {args.maxAttempts && (
            <p className="text-sm text-gray-600">Max Attempts: {args.maxAttempts}</p>
          )}
          {args.variables && Object.keys(args.variables).length > 0 && (
            <p className="text-sm text-gray-600">
              Variables: {Object.keys(args.variables).join(', ')}
            </p>
          )}
          {!result?.sessionId && (
            <Button
              className="mt-4"
              onClick={onExecute}
              disabled={isPaused}
            >
              Start Task
            </Button>
          )}
        </div>
      )}

      {result?.steps && result.steps.length > 0 && (
        <div className={cn(
          "p-4 rounded-lg",
          isCompleted ? "bg-green-50" : "bg-gray-50"
        )}>
          <h4 className="font-medium mb-2">Actions Taken</h4>
          <div className="space-y-2">
            {result.steps.map((step: BrowserStep, index: number) => (
              <div 
                key={index} 
                className={cn(
                  "flex items-start gap-2",
                  !isCompleted && result.currentStep === index && "bg-blue-50 p-2 rounded"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-sm",
                  step.status === 'completed' ? "bg-green-100 text-green-600" :
                  step.status === 'failed' ? "bg-red-100 text-red-600" :
                  step.status === 'running' ? "bg-blue-100 text-blue-600" :
                  "bg-gray-100 text-gray-600"
                )}>
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-medium">{step.text}</p>
                  <p className="text-xs text-gray-500">{step.reasoning}</p>
                  {step.status === 'failed' && step.error && (
                    <p className="text-xs text-red-600">Error: {step.error.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result?.error && (
        <div className="p-4 bg-red-50 rounded-lg">
          <h4 className="font-medium text-red-600 mb-2">Error</h4>
          <p className="text-sm text-red-600">{result.error.message}</p>
        </div>
      )}

      {result?.extractedData && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Extracted Data</h4>
          <pre className="text-sm bg-white p-2 rounded border">
            {JSON.stringify(result.extractedData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function BrowserPreview({ result, args, isReadonly }: BrowserPreviewProps) {
  const [session, setSession] = useAtom(browserStateAtom);
  const { execute, close } = useBrowser();
  const [isPaused, setIsPaused] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  debug('Render', { result, session, isPaused });

  // Handle session state updates from result
  useEffect(() => {
    if (result?.sessionId) {
      debug('Updating session from result', { result });
      setSession({
        sessionId: result.sessionId,
        sessionUrl: result.sessionUrl,
        contextId: result.contextId,
        currentStep: result.currentStep || 0,
        steps: result.steps || [],
        extractedData: result.extractedData || null,
        error: result.error || undefined
      });
    }
  }, [result, setSession]);

  // Handle cleanup when the component unmounts or when the session should be cleared
  useEffect(() => {
    // If we have a session but the result indicates no session (completed/failed state)
    // then we should clean up our session
    if (session.sessionId && result && !result.sessionId) {
      debug('Cleaning up session state', { session, result });
      setSession({
        sessionId: undefined,
        sessionUrl: undefined,
        contextId: undefined,
        steps: result.steps || [],
        currentStep: result.currentStep || 0,
        extractedData: result.extractedData || null,
        error: result.error || undefined
      });
    }

    // Cleanup on unmount
    return () => {
      if (session.sessionId) {
        debug('Component unmounting, closing session');
        close().catch(error => {
          debug('Error in cleanup', error);
        });
      }
    };
  }, [session.sessionId, result, setSession, close, session]);

  // Combine the tool result with our session state
  const finalResult: BrowserResult = {
    state: "result",
    sessionId: session.sessionId || result?.sessionId,
    sessionUrl: session.sessionUrl || result?.sessionUrl,
    contextId: session.contextId || result?.contextId,
    steps: session.steps.length > 0 ? session.steps : result?.steps || [],
    currentStep: session.currentStep || result?.currentStep || 0,
    extractedData: session.extractedData || result?.extractedData,
    error: session.error || result?.error
  };

  debug('Combined result state', { finalResult });

  const isConnected = !!finalResult.sessionId;
  // Consider a session completed if all steps are completed or failed
  const isCompleted = finalResult.steps.length > 0 && 
    finalResult.steps.every(step => step.status === 'completed' || step.status === 'failed');

  debug('Session status', { isConnected, isCompleted });

  const handleExecute = async () => {
    if (!args?.task || isRetrying) return;
    debug('Executing task', { task: args.task });
    try {
      setIsRetrying(true);
      await execute(args.task);
    } catch (error) {
      debug('Error executing task', error);
      toast.error("Failed to execute browser task");
    } finally {
      setIsRetrying(false);
    }
  };

  const handleClose = async () => {
    if (!session.sessionId) return;
    
    debug('Closing session', { sessionId: session.sessionId });
    try {
      await close();
      debug('Session closed, updating state');
      setSession({
        sessionId: undefined,
        sessionUrl: undefined,
        contextId: undefined,
        steps: finalResult.steps,
        currentStep: finalResult.currentStep,
        extractedData: finalResult.extractedData,
        error: undefined
      });
      toast.success("Browser session closed");
    } catch (error) {
      debug('Error closing session', error);
      toast.error("Failed to close browser session");
    }
  };

  const handleRetry = async () => {
    if (isRetrying) return;
    
    debug('Retrying task');
    try {
      setIsRetrying(true);
      await handleClose();
      // Wait for a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
      await handleExecute();
    } catch (error) {
      debug('Error retrying task', error);
      toast.error("Failed to retry task");
    } finally {
      setIsRetrying(false);
    }
  };

  if (!result && !args) {
    debug('No result or args, showing skeleton');
    return <LoadingSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <div className="flex flex-col gap-2">
          <BrowserHeader 
            title={args?.task || "Browser Session"} 
            isConnected={isConnected}
            isPaused={isPaused}
            onPause={() => {
              debug('Pausing session');
              setIsPaused(true);
            }}
            onResume={() => {
              debug('Resuming session');
              setIsPaused(false);
            }}
            onClose={handleClose}
            isCompleted={isCompleted}
          />
          <BrowserContent 
            result={finalResult} 
            args={args} 
            isPaused={isPaused}
            onExecute={handleExecute}
            isCompleted={isCompleted}
          />
          {finalResult.sessionUrl && !isPaused && !isCompleted && (
            <div className="mt-4 w-full aspect-video rounded-lg overflow-hidden border border-gray-200 relative">
              <iframe
                src={finalResult.sessionUrl}
                className="size-full"
                sandbox="allow-same-origin allow-scripts allow-forms"
                loading="lazy"
                referrerPolicy="no-referrer"
                title="Browser Session"
              />
              {finalResult.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                  <div className="bg-white p-4 rounded-lg shadow-lg max-w-md">
                    <h4 className="text-red-600 font-medium mb-2">Browser Session Error</h4>
                    <p className="text-sm text-gray-600 mb-4">{finalResult.error.message}</p>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isRetrying}
                      >
                        Close Session
                      </Button>
                      <Button
                        onClick={handleRetry}
                        disabled={isRetrying}
                      >
                        {isRetrying ? 'Retrying...' : 'Retry Task'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
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