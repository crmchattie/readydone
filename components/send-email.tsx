'use client';

import cx from 'classnames';
import { MailIcon } from 'lucide-react';
import { useState } from 'react';

interface SendEmailProps {
  args?: {
    to: string;
    cc?: string[];
    bcc?: string[];
    attachments?: Array<{
      filename: string;
      content: string;
      contentType: string;
    }>;
  };
  result?: string;
}

export function SendEmail({ args, result }: SendEmailProps) {
  const [showFullContent, setShowFullContent] = useState(false);

  // If we're in the sending state (args present, no result)
  if (args && !result) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl p-4 skeleton-bg max-w-[500px] bg-blue-50">
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            <div className="size-10 rounded-md skeleton-div bg-blue-200 flex items-center justify-center">
              <MailIcon className="text-blue-600" size={20} />
            </div>
            <div className="text-4xl font-medium text-blue-900">
              Sending...
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-blue-800">To: {args.to}</div>
          {args.cc && args.cc.length > 0 && (
            <div className="text-blue-800">CC: {args.cc.join(', ')}</div>
          )}
          {args.bcc && args.bcc.length > 0 && (
            <div className="text-blue-800">BCC: {args.bcc.join(', ')}</div>
          )}
          {args.attachments && args.attachments.length > 0 && (
            <div className="text-blue-800">
              Attachments: {args.attachments.map(a => a.filename).join(', ')}
            </div>
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
              <MailIcon className="text-green-600" size={20} />
            </div>
            <div className="text-4xl font-medium text-green-900">
              Email Sent
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 text-green-800">
          <div className="flex flex-col gap-2">
            <div className="font-medium">To: {args?.to}</div>
            {args?.cc && args.cc.length > 0 && (
              <div>CC: {args.cc.join(', ')}</div>
            )}
            {args?.bcc && args.bcc.length > 0 && (
              <div>BCC: {args.bcc.join(', ')}</div>
            )}
            {args?.attachments && args.attachments.length > 0 && (
              <div>
                Attachments: {args.attachments.map(a => a.filename).join(', ')}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="font-medium">Content:</div>
            <div className="text-sm whitespace-pre-wrap">
              {showFullContent ? result : result.substring(0, 200) + '...'}
            </div>
            {result.length > 200 && (
              <button
                className="text-sm text-green-600 hover:text-green-700 self-start"
                onClick={() => setShowFullContent(!showFullContent)}
              >
                {showFullContent ? 'Show Less' : 'Show More'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
} 