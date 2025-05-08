'use client';

import cx from 'classnames';
import { GlobeIcon } from 'lucide-react';
import { useState } from 'react';

interface BrowserAction {
  action: string;
  reason: string;
  status?: 'failed';
  timestamp: string;
}

interface UseBrowserProps {
  args?: {
    url: string;
    task: string;
    variables?: Record<string, string>;
    extractionSchema?: Record<string, any>;
    maxAttempts?: number;
  };
  result?: {
    success: boolean;
    actions: BrowserAction[];
    data: any;
    url: string;
    taskCompleted: boolean;
    attempts: number;
  };
}

export function UseBrowser({ args, result }: UseBrowserProps) {
  const [expandedAction, setExpandedAction] = useState<number | null>(null);

  // If we're in the browsing state (args present, no result)
  if (args && !result) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl p-4 skeleton-bg max-w-[500px] bg-blue-50">
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            <div className="size-10 rounded-md skeleton-div bg-blue-200 flex items-center justify-center">
              <GlobeIcon className="text-blue-600" size={20} />
            </div>
            <div className="text-4xl font-medium text-blue-900">
              Browsing...
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-blue-800">URL: {args.url}</div>
          <div className="text-blue-800">Task: {args.task}</div>
          {args.maxAttempts && (
            <div className="text-blue-800">Max Attempts: {args.maxAttempts}</div>
          )}
          {args.variables && Object.keys(args.variables).length > 0 && (
            <div className="text-blue-800">
              Variables: {Object.keys(args.variables).join(', ')}
            </div>
          )}
        </div>
      </div>
    );
  }

  // If we have a result
  if (result) {
    return (
      <div className={cx(
        "flex flex-col gap-4 rounded-2xl p-4 skeleton-bg max-w-[500px]",
        {
          'bg-green-50': result.success,
          'bg-yellow-50': !result.success
        }
      )}>
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            <div className={cx(
              "size-10 rounded-md skeleton-div flex items-center justify-center",
              {
                'bg-green-200': result.success,
                'bg-yellow-200': !result.success
              }
            )}>
              <GlobeIcon className={cx({
                'text-green-600': result.success,
                'text-yellow-600': !result.success
              })} size={20} />
            </div>
            <div className={cx(
              "text-4xl font-medium",
              {
                'text-green-900': result.success,
                'text-yellow-900': !result.success
              }
            )}>
              {result.success ? 'Task Completed' : 'Task Incomplete'}
            </div>
          </div>
        </div>

        <div className={cx(
          "flex flex-col gap-4",
          {
            'text-green-800': result.success,
            'text-yellow-800': !result.success
          }
        )}>
          <div className="flex flex-col gap-2">
            <div className="font-medium">URL: {result.url}</div>
            <div>Task: {args?.task}</div>
            <div>Attempts: {result.attempts}</div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="font-medium">Actions Taken:</div>
            {result.actions.map((action, index) => {
              const isExpanded = expandedAction === index;
              const isFailed = action.status === 'failed';

              return (
                <div key={index} className="flex flex-col gap-2">
                  <button
                    className={cx(
                      "flex flex-row justify-between items-center text-left",
                      {
                        'text-red-600': isFailed
                      }
                    )}
                    onClick={() => setExpandedAction(isExpanded ? null : index)}
                  >
                    <div className="font-medium">
                      {action.action}
                    </div>
                    <div className="text-sm opacity-60">
                      {isExpanded ? 'Show Less' : 'Show More'}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="pl-4 flex flex-col gap-2">
                      <div className="text-sm">
                        <span className="font-medium">Reason:</span> {action.reason}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Time:</span> {new Date(action.timestamp).toLocaleString()}
                      </div>
                      {isFailed && (
                        <div className="text-sm text-red-600">
                          This action failed to execute
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {result.data && (
            <div className="flex flex-col gap-2">
              <div className="font-medium">Extracted Data:</div>
              <pre className="text-sm bg-white/50 p-2 rounded-md overflow-x-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
} 