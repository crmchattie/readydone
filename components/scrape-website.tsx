'use client';

import cx from 'classnames';
import { GlobeIcon } from 'lucide-react';

interface ScrapeWebsiteProps {
  args?: {
    url: string;
  };
  result?: {
    markdown: string;
    metadata: {
      title?: string;
      description?: string;
      [key: string]: unknown;
    };
  };
}

export function ScrapeWebsite({ args, result }: ScrapeWebsiteProps) {
  // If we're in the scraping state (args present, no result)
  if (args && !result) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl p-4 skeleton-bg max-w-[500px] bg-blue-50">
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            <div className="size-10 rounded-md skeleton-div bg-blue-200 flex items-center justify-center">
              <GlobeIcon className="text-blue-600" size={20} />
            </div>
            <div className="text-4xl font-medium text-blue-900">
              Scraping...
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-blue-800">URL: {args.url}</div>
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
              <GlobeIcon className="text-green-600" size={20} />
            </div>
            <div className="text-4xl font-medium text-green-900">
              Scrape was Successful!
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
} 