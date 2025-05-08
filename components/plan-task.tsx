'use client';

import cx from 'classnames';
import { ClipboardListIcon } from 'lucide-react';

interface PlanStep {
  description: string;
  reason: string;
  tool: string;
  input: {
    [key: string]: unknown;
  };
  requires?: string[];
}

interface PlanResult {
  goal: string;
  steps: PlanStep[];
}

interface PlanTaskProps {
  args?: {
    task: string;
    context?: string;
  };
  result?: PlanResult;
}

export function PlanTask({ args, result }: PlanTaskProps) {
  // If we're in the planning state (args present, no result)
  if (args && !result) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl p-4 skeleton-bg max-w-[500px] bg-blue-50">
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            <div className="size-10 rounded-md skeleton-div bg-blue-200 flex items-center justify-center">
              <ClipboardListIcon className="text-blue-600" size={20} />
            </div>
            <div className="text-4xl font-medium text-blue-900">
              Planning...
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-blue-800">Task: {args.task}</div>
          {args.context && (
            <div className="text-blue-800">Context: {args.context}</div>
          )}
        </div>
      </div>
    );
  }

  // If we have a result
  if (result) {
    const hasSteps = result.steps.length > 0;
    
    return (
      <div className={cx(
        "flex flex-col gap-4 rounded-2xl p-4 skeleton-bg max-w-[500px]",
        {
          'bg-green-50': hasSteps,
          'bg-yellow-50': !hasSteps
        }
      )}>
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            <div className={cx(
              "size-10 rounded-md skeleton-div flex items-center justify-center",
              {
                'bg-green-200': hasSteps,
                'bg-yellow-200': !hasSteps
              }
            )}>
              <ClipboardListIcon className={cx({
                'text-green-600': hasSteps,
                'text-yellow-600': !hasSteps
              })} size={20} />
            </div>
            <div className={cx(
              "text-4xl font-medium",
              {
                'text-green-900': hasSteps,
                'text-yellow-900': !hasSteps
              }
            )}>
              {hasSteps ? 'Plan Created' : 'Planning Failed'}
            </div>
          </div>
        </div>
        <div className={cx(
          "flex flex-col gap-4",
          {
            'text-green-800': hasSteps,
            'text-yellow-800': !hasSteps
          }
        )}>
          <div className="font-medium">Goal:</div>
          <div className="pl-4">{result.goal}</div>
          
          {hasSteps && (
            <>
              <div className="font-medium">Steps:</div>
              <div className="flex flex-col gap-4 pl-4">
                {result.steps.map((step, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <div className="font-medium">Step {index + 1}:</div>
                    <div className="pl-4">
                      <div><span className="font-medium">Description:</span> {step.description}</div>
                      <div><span className="font-medium">Reason:</span> {step.reason}</div>
                      <div><span className="font-medium">Tool:</span> {step.tool}</div>
                      {step.requires && step.requires.length > 0 && (
                        <div><span className="font-medium">Requires Steps:</span> {step.requires.join(', ')}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
} 