'use client';

import cx from 'classnames';
import { MapPinIcon } from 'lucide-react';
import { useState } from 'react';

interface SearchPlacesProps {
  args?: {
    query?: string;
    address: string;
    radius?: number;
    type?: string;
    limit?: number;
  };
  result?: string;
}

export function SearchPlaces({ args, result }: SearchPlacesProps) {
  const [expandedPlace, setExpandedPlace] = useState<number | null>(null);

  // If we're in the search state (args present, no result)
  if (args && !result) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl p-4 skeleton-bg max-w-[500px] bg-blue-50">
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            <div className="size-10 rounded-md skeleton-div bg-blue-200 flex items-center justify-center">
              <MapPinIcon className="text-blue-600" size={20} />
            </div>
            <div className="text-4xl font-medium text-blue-900">
              Searching...
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {args.query && (
            <div className="text-blue-800">Query: {args.query}</div>
          )}
          <div className="text-blue-800">Location: {args.address}</div>
          {args.radius && (
            <div className="text-blue-800">Radius: {args.radius}m</div>
          )}
          {args.type && (
            <div className="text-blue-800">Type: {args.type}</div>
          )}
          {args.limit && (
            <div className="text-blue-800">Max Results: {args.limit}</div>
          )}
        </div>
      </div>
    );
  }

  // If we have a result
  if (result) {
    const isNoResults = result === 'No places found matching your criteria.';
    const places = result.split('\n\n').filter(place => place.trim().length > 0);
    
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
              <MapPinIcon className={cx({
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
              {isNoResults ? 'No Results' : 'Places Found'}
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
            {places.map((place, index) => {
              const lines = place.split('\n');
              const title = lines[0].replace(/^\d+\.\s*/, '');
              const details = lines.slice(1);
              const isExpanded = expandedPlace === index;

              return (
                <div key={index} className="flex flex-col gap-2">
                  <button
                    className="flex flex-row justify-between items-center text-left"
                    onClick={() => setExpandedPlace(isExpanded ? null : index)}
                  >
                    <div className="font-medium">{title}</div>
                    <div className="text-sm opacity-60">
                      {isExpanded ? 'Show Less' : 'Show More'}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="pl-4 flex flex-col gap-2">
                      {details.map((detail, detailIndex) => (
                        <div key={detailIndex} className="text-sm">
                          {detail}
                        </div>
                      ))}
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