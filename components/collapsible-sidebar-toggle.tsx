'use client';

import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { PanelLeftIcon, PanelRightIcon } from 'lucide-react';
import { useNavigation } from '../lib/navigation-context';

export function CollapsibleSidebarToggle() {
  const { open, setOpen } = useSidebar();
  const { openLevels } = useNavigation();

  // Only show the toggle button on levels 2, 3, and 4
  if (!openLevels.some(lvl => lvl >= 2)) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="absolute top-4 left-4 z-50 size-6 md:hidden"
      onClick={() => setOpen(!open)}
    >
      {open ? (
        <PanelLeftIcon className="size-4" />
      ) : (
        <PanelRightIcon className="size-4" />
      )}
    </Button>
  );
} 