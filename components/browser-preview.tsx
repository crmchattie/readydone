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
}

function BrowserHeader({ title, isConnected, isPaused, onPause, onResume, onClose }: BrowserHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-medium">{title}</h3>
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-2 h-2 rounded-full",
          isConnected ? "bg-green-500" : "bg-red-500"
        )} />
        <span className="text-sm text-gray-500">
          {isConnected ? (isPaused ? "Paused" : "Connected") : "Disconnected"}
        </span>
        {isConnected && (
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
}

function BrowserContent({ result, args, isPaused, onExecute }: BrowserContentProps) {
  if (!result && !args) return null;

  return (
    <div className="flex flex-col gap-4">
      {args && (
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
          {!result && (
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
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Actions Taken</h4>
          <div className="space-y-2">
            {result.steps.map((step: BrowserStep, index: number) => (
              <div 
                key={index} 
                className={cn(
                  "flex items-start gap-2",
                  result.currentStep === index && "bg-blue-50 p-2 rounded"
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
  const { execute, close, result: browserResult } = useBrowser();
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (result?.sessionId && !session.sessionId) {
      setSession({
        sessionId: result.sessionId,
        sessionUrl: result.sessionUrl,
        contextId: result.contextId,
        currentStep: 0,
        steps: result.steps || [],
        extractedData: result.extractedData || null,
        error: result.error || undefined
      });
    }
  }, [
    result?.sessionId,
    result?.sessionUrl,
    result?.contextId,
    result?.steps,
    result?.extractedData,
    result?.error,
    session.sessionId,
    setSession
  ]);

  const handleExecute = async () => {
    if (!args?.task) return;
    try {
      await execute(args.task);
    } catch (error) {
      toast.error("Failed to execute browser task");
    }
  };

  const handleClose = async () => {
    try {
      await close();
      toast.success("Browser session closed");
    } catch (error) {
      toast.error("Failed to close browser session");
    }
  };

  if (!result && !args) {
    return <LoadingSkeleton />;
  }

  const finalResult = browserResult || result;
  const isConnected = !!session.sessionId;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <div className="flex flex-col gap-2">
          <BrowserHeader 
            title={args?.task || "Browser Session"} 
            isConnected={isConnected}
            isPaused={isPaused}
            onPause={() => setIsPaused(true)}
            onResume={() => setIsPaused(false)}
            onClose={handleClose}
          />
          <BrowserContent 
            result={finalResult} 
            args={args} 
            isPaused={isPaused}
            onExecute={handleExecute}
          />
          {session.sessionUrl && !isPaused && (
            <div className="mt-4 w-full aspect-video rounded-lg overflow-hidden border border-gray-200">
              <iframe
                src={session.sessionUrl}
                className="size-full"
                sandbox="allow-same-origin allow-scripts allow-forms"
                loading="lazy"
                referrerPolicy="no-referrer"
                title="Browser Session"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 