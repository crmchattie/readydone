'use client';

import { BrowserStep } from '@/lib/db/types';

interface BrowserResponse<T> {
  success: boolean;
  error?: string;
  result?: T;
  done?: boolean;
}

// Client-side API functions that wrap server endpoints
export async function createBrowserSession(timezone?: string, contextId?: string) {
  const response = await fetch('/api/browser/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ timezone, contextId }),
  });
  
  const data: BrowserResponse<{
    sessionId: string;
    sessionUrl: string;
    contextId: string;
  }> = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to create browser session');
  }
  
  return data.result!;
}

export async function endBrowserSession(sessionId: string) {
  const response = await fetch(`/api/browser/session?sessionId=${sessionId}`, {
    method: 'DELETE',
  });
  
  const data: BrowserResponse<void> = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to end browser session');
  }
}

export async function executeBrowserStep(sessionId: string, step: BrowserStep) {
  const response = await fetch('/api/browser/agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      step,
      action: 'EXECUTE_STEP',
    }),
  });
  
  const data: BrowserResponse<{ data?: any }> = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to execute step');
  }
  
  return {
    success: true,
    error: undefined,
    extraction: data.result?.data,
    done: data.done
  };
}

export async function getNextStep(sessionId: string, goal: string, previousSteps: BrowserStep[]) {
  const response = await fetch('/api/browser/agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      goal,
      previousSteps,
      action: 'GET_NEXT_STEP',
    }),
  });
  
  const data: BrowserResponse<BrowserStep> = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to get next step');
  }
  
  return {
    success: true,
    result: data.result!,
    done: data.done
  };
} 