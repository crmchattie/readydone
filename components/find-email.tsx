'use client';

import cx from 'classnames';
import { MailIcon } from 'lucide-react';

interface FindEmailProps {
  args?: {
    website: string;
    department?: string;
  };
  result?: string;
}

export function FindEmail({ args, result }: FindEmailProps) {
  // If we're in the search state (args present, no result)
  if (args && !result) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl p-4 skeleton-bg max-w-[500px] bg-blue-50">
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            <div className="size-10 rounded-md skeleton-div bg-blue-200 flex items-center justify-center">
              <MailIcon className="text-blue-600" size={20} />
            </div>
            <div className="text-4xl font-medium text-blue-900">
              Searching...
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-blue-800">Website: {args.website}</div>
          {args.department && (
            <div className="text-blue-800">Department: {args.department}</div>
          )}
        </div>
      </div>
    );
  }

  // If we have a result
  if (result) {
    const isNoResults = result.startsWith('No email addresses found');
    
    return (
      <div className={cx(
        "flex flex-col gap-4 rounded-2xl p-4 skeleton-bg max-w-[500px]",
        {
          'bg-green-50': !isNoResults,
          'bg-yellow-50': isNoResults
        }
      )}>
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            <div className={cx(
              "size-10 rounded-md skeleton-div flex items-center justify-center",
              {
                'bg-green-200': !isNoResults,
                'bg-yellow-200': isNoResults
              }
            )}>
              <MailIcon className={cx({
                'text-green-600': !isNoResults,
                'text-yellow-600': isNoResults
              })} size={20} />
            </div>
            <div className={cx(
              "text-4xl font-medium",
              {
                'text-green-900': !isNoResults,
                'text-yellow-900': isNoResults
              }
            )}>
              {isNoResults ? 'No Results' : 'Emails Found'}
            </div>
          </div>
        </div>
        <div className={cx(
          "flex flex-col gap-2 whitespace-pre-wrap",
          {
            'text-green-800': !isNoResults,
            'text-yellow-800': isNoResults
          }
        )}>
          {result}
        </div>
      </div>
    );
  }

  return null;
} 