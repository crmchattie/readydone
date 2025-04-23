'use client';

import { type ReactNode } from 'react';
import { memo } from 'react';

function PureChatHeader({
  toggle,
}: {
  toggle?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2 p-2 sticky top-0 bg-background">
      <div className="flex w-full min-w-0 flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex-1" />
          {/* Right side controls */}
          <div className="flex items-center gap-1">
            {toggle}
          </div>
        </div>
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader);
