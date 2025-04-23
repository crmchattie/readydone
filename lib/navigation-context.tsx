'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type ThreadType = {
  id: string;
  name: string;
  status: 'pending' | 'replied' | 'contacted';
  lastMessage: string;
};

type NavigationContextType = {
  level: number;
  openLevels: number[];
  setLevel: (level: number) => void;
  selectedThreadId: string | null;
  setSelectedThreadId: (id: string | null) => void;
  threads: ThreadType[];
  setThreads: (threads: ThreadType[]) => void;
  navigateToThreads: (newThreads: ThreadType[]) => void;
  chatPanelExpanded: boolean;
  setChatPanelExpanded: (expanded: boolean) => void;
  chatSidebarExpanded: boolean;
  setChatSidebarExpanded: (expanded: boolean) => void;
};

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [openLevels, setOpenLevels] = useState<number[]>([2]); // Default to AI-User chat level
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadType[]>([]);
  const [chatPanelExpanded, setChatPanelExpanded] = useState(true);
  const [chatSidebarExpanded, setChatSidebarExpanded] = useState(true);

  // Function to set level with FIFO behavior (keep only 2 levels open)
  const setLevel = useCallback((newLevel: number) => {
    setOpenLevels(prev => {
      // If the level is already in the array, remove it first to avoid duplicates
      const filteredLevels = prev.filter(lvl => lvl !== newLevel);
      
      // Add the new level
      const updatedLevels = [...filteredLevels, newLevel];
      
      // If we have more than 2 levels, remove the oldest one (FIFO)
      if (updatedLevels.length > 2) {
        return updatedLevels.slice(1);
      }
      
      return updatedLevels;
    });
  }, []);

  // Stabilize setSelectedThreadId with useCallback
  const stableSetSelectedThreadId = useCallback((id: string | null) => {
    setSelectedThreadId(id);
  }, []);

  // Stabilize setThreads with useCallback
  const stableSetThreads = useCallback((newThreads: ThreadType[]) => {
    setThreads(newThreads);
  }, []);

  // Helper function to transition to thread view
  const navigateToThreads = useCallback((newThreads: ThreadType[]) => {
    stableSetThreads(newThreads);
    
    if (newThreads.length === 1) {
      // If only one thread, skip level 3 and go directly to level 4
      stableSetSelectedThreadId(newThreads[0].id);
      setLevel(4);
    } else if (newThreads.length > 1) {
      // If multiple threads, go to thread list (level 3)
      setLevel(3);
    }
  }, [stableSetThreads, stableSetSelectedThreadId, setLevel]);

  // For backward compatibility
  const level = openLevels[openLevels.length - 1] || 2;

  return (
    <NavigationContext.Provider
      value={{
        level,
        openLevels,
        setLevel,
        selectedThreadId,
        setSelectedThreadId: stableSetSelectedThreadId,
        threads,
        setThreads: stableSetThreads,
        navigateToThreads,
        chatPanelExpanded,
        setChatPanelExpanded,
        chatSidebarExpanded,
        setChatSidebarExpanded,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
} 