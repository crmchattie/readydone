'use client';

import cx from 'classnames';
import { SearchIcon, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface SearchWebProps {
  args?: {
    query: string;
    limit?: number;
    lang?: string;
    country?: string;
    tbs?: string;
    includeContent?: boolean;
  };
  result?: string;
}

export function SearchWeb({ args, result }: SearchWebProps) {
  const [expandedResult, setExpandedResult] = useState<number | null>(null);

  // If we're in the search state (args present, no result)
  if (args && !result) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl p-4 skeleton-bg max-w-[500px] bg-blue-50">
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            <div className="size-10 rounded-md skeleton-div bg-blue-200 flex items-center justify-center">
              <SearchIcon className="text-blue-600" size={20} />
            </div>
            <div className="text-4xl font-medium text-blue-900">
              Searching...
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-blue-800">Query: {args.query}</div>
          {args.limit && (
            <div className="text-blue-800">Max Results: {args.limit}</div>
          )}
          {args.lang && (
            <div className="text-blue-800">Language: {args.lang}</div>
          )}
          {args.country && (
            <div className="text-blue-800">Country: {args.country}</div>
          )}
          {args.tbs && (
            <div className="text-blue-800">Time Filter: {args.tbs}</div>
          )}
        </div>
      </div>
    );
  }

  // If we have a result
  if (result) {
    const isNoResults = result === 'No search results found.' || result === 'Rate limit reached. Please try again in a minute.';
    const results = result.split('\n\n').filter(r => r.trim().length > 0);
    const query = results[0]?.match(/Search results for "(.*?)":/)?.[1] || '';
    
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
              <SearchIcon className={cx({
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
              {isNoResults ? 'No Results' : 'Search Results'}
            </div>
          </div>
        </div>

        {!isNoResults && (
          <div className={cx(
            "flex flex-col gap-4",
            {
              'text-green-800': !isNoResults,
              'text-yellow-800': isNoResults
            }
          )}>
            {results.slice(1).map((result, index) => {
              const lines = result.split('\n');
              const title = lines[0]?.replace(/^\d+\.\s*/, '') || '';
              const url = lines[1]?.replace('   URL: ', '') || '';
              const description = lines[2]?.replace('   Description: ', '') || '';
            //   const contentPreview = lines[3]?.replace('   Content Preview: ', '') || '';
              const links = lines[4]?.replace('   Links: ', '') || '';
              const isExpanded = expandedResult === index;

              // Skip rendering if we don't have the basic required fields
              if (!title || !url || !description) {
                return null;
              }

              return (
                <div key={index} className="flex flex-col gap-2">
                  <button
                    className="flex flex-row justify-between items-center text-left w-full rounded-lg p-2 transition-colors"
                    onClick={() => setExpandedResult(isExpanded ? null : index)}
                  >
                    <div className="font-medium text-lg pr-4">{title}</div>
                    <ChevronDown 
                      className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      size={20}
                    />
                  </button>
                  
                  {isExpanded && (
                    <div className="pl-4 flex flex-col gap-3 border-l-2 border-gray-100 ml-2">
                      <div className="text-sm">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                          {url}
                        </a>
                      </div>
                      <div className="text-sm text-gray-700">{description}</div>
                      {/* {contentPreview && contentPreview.length > 0 && (
                        <div className="text-sm italic text-gray-600 bg-gray-50 p-3 rounded-lg">
                          {contentPreview}
                        </div>
                      )} */}
                      {links && links.length > 0 && (
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">Related Links:</span> {links}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isNoResults && (
          <div className="text-yellow-800">
            {result}
          </div>
        )}
      </div>
    );
  }

  return null;
} 