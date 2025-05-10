'use client';

import { BrowserResult, BrowserStep, UseBrowserProps } from '@/lib/db/types';
import cx from 'classnames';
import { ChevronDown, ChevronUp, GlobeIcon, RefreshCw } from 'lucide-react';
import { useState } from 'react';

// Subcomponent for displaying browser steps
function BrowserStepList({ steps, expandedAction, setExpandedAction }: {
  steps: BrowserStep[];
  expandedAction: number | null;
  setExpandedAction: (index: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="font-medium">Actions Taken:</div>
      {steps.map((step, index) => {
        const isExpanded = expandedAction === index;
        const isFailed = step.status === 'failed';
        const isRunning = step.status === 'running';

        return (
          <div key={index} className="flex flex-col gap-2">
            <button
              className={cx(
                "flex flex-row justify-between items-center text-left p-2 rounded-md transition-colors",
                {
                  'bg-red-50 text-red-600': isFailed,
                  'bg-blue-50 text-blue-600': isRunning,
                  'hover:bg-gray-50': !isFailed && !isRunning
                }
              )}
              onClick={() => setExpandedAction(isExpanded ? null : index)}
            >
              <div className="flex items-center gap-2">
                {isRunning && (
                  <RefreshCw className="animate-spin size-4" />
                )}
                <span className="font-medium">
                  {step.text}
                </span>
              </div>
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {isExpanded && (
              <div className="pl-4 flex flex-col gap-2 bg-gray-50 p-3 rounded-md">
                <div className="text-sm">
                  <span className="font-medium">Tool:</span> {step.tool}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Reason:</span> {step.reasoning}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Status:</span> {step.status}
                </div>
                {isFailed && step.error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {step.error.message}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Main component
export function UseBrowser({ args, result, isReadonly }: UseBrowserProps) {
  const [expandedAction, setExpandedAction] = useState<number | null>(null);

  // Loading state
  if (args && !result) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl p-4 bg-blue-50 border border-blue-100">
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            <div className="size-10 rounded-md bg-blue-200 flex items-center justify-center">
              <RefreshCw className="text-blue-600 animate-spin" size={20} />
            </div>
            <div className="text-2xl font-medium text-blue-900">
              Browsing {args.url}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-blue-800">
          <div>Task: {args.task}</div>
          {args.maxAttempts && (
            <div>Max Attempts: {args.maxAttempts}</div>
          )}
          {args.variables && Object.keys(args.variables).length > 0 && (
            <div>
              Variables: {Object.entries(args.variables).map(([key, value]) => (
                <span key={key} className="inline-flex items-center gap-1 bg-blue-100 px-2 py-1 rounded mr-2">
                  {key}: <code>{value}</code>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Result state
  if (result) {
    const success = !result.error && (!!result.extractedData || result.steps.length > 0);
    const isComplete = result.steps.every(step => step.status === 'completed');
    
    return (
      <div className={cx(
        "flex flex-col gap-4 rounded-2xl p-4 border",
        {
          'bg-green-50 border-green-100': success && isComplete,
          'bg-blue-50 border-blue-100': success && !isComplete,
          'bg-red-50 border-red-100': !success
        }
      )}>
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            <div className={cx(
              "size-10 rounded-md flex items-center justify-center",
              {
                'bg-green-200': success && isComplete,
                'bg-blue-200': success && !isComplete,
                'bg-red-200': !success
              }
            )}>
              <GlobeIcon className={cx({
                'text-green-600': success && isComplete,
                'text-blue-600': success && !isComplete,
                'text-red-600': !success
              })} size={20} />
            </div>
            <div className={cx(
              "text-2xl font-medium",
              {
                'text-green-900': success && isComplete,
                'text-blue-900': success && !isComplete,
                'text-red-900': !success
              }
            )}>
              {success && isComplete ? 'Task Completed' : 
               success && !isComplete ? 'In Progress' : 
               'Task Failed'}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="font-medium">Details:</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>URL:</div>
              <div className="font-mono">{result.sessionUrl || args?.url}</div>
              <div>Task:</div>
              <div>{args?.task}</div>
              <div>Progress:</div>
              <div>{result.currentStep} / {result.steps.length} steps</div>
            </div>
          </div>

          <BrowserStepList 
            steps={result.steps}
            expandedAction={expandedAction}
            setExpandedAction={setExpandedAction}
          />

          {result.extractedData && (
            <div className="flex flex-col gap-2">
              <div className="font-medium">Extracted Data:</div>
              <pre className="text-sm bg-white/50 p-3 rounded-md overflow-x-auto border">
                {JSON.stringify(result.extractedData, null, 2)}
              </pre>
            </div>
          )}

          {result.error && (
            <div className="text-red-600 bg-red-50 p-3 rounded-md border border-red-100">
              {result.error.message}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
} 