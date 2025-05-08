'use client';

import cx from 'classnames';
import { PhoneIcon } from 'lucide-react';

interface PhoneCallProps {
  args?: {
    phoneNumber: string;
    earliestAt?: string;
    latestAt?: string;
  };
  result?: {
    callId: string;
    threadId: string;
    messages: any[];
  };
}

export function PhoneCall({ args, result }: PhoneCallProps) {
  // If we're in the call state (args present, no result)
  if (args && !result) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl p-4 skeleton-bg max-w-[500px] bg-blue-50">
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            <div className="size-10 rounded-md skeleton-div bg-blue-200 flex items-center justify-center">
              <PhoneIcon className="text-blue-600" size={20} />
            </div>
            <div className="text-4xl font-medium text-blue-900">
              Calling...
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-blue-800">Phone Number: {args.phoneNumber}</div>
          {args.earliestAt && (
            <div className="text-blue-800">Earliest Call Time: {new Date(args.earliestAt).toLocaleString()}</div>
          )}
          {args.latestAt && (
            <div className="text-blue-800">Latest Call Time: {new Date(args.latestAt).toLocaleString()}</div>
          )}
        </div>
      </div>
    );
  }

  // If we have a result
  if (result) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl p-4 skeleton-bg max-w-[500px] bg-green-50">
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            <div className="size-10 rounded-md skeleton-div bg-green-200 flex items-center justify-center">
              <PhoneIcon className="text-green-600" size={20} />
            </div>
            <div className="text-4xl font-medium text-green-900">
              Call Initiated
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {result.messages.length > 0 && (
            <div className="text-green-800">Messages: {result.messages.length}</div>
          )}
        </div>
      </div>
    );
  }

  return null;
} 