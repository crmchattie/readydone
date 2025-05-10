import { atom } from 'jotai';
import { BrowserState, BrowserStep } from '@/lib/db/types';

const initialBrowserState: BrowserState = {
  sessionId: undefined,
  sessionUrl: undefined,
  contextId: undefined,
  currentStep: 0,
  steps: [],
  extractedData: null,
  error: undefined,
};

// Create a writeable atom
export const browserStateAtom = atom<BrowserState>(initialBrowserState);

// Helper functions to update the state
export const updateBrowserState = {
  setSession: (state: BrowserState, sessionId: string, sessionUrl: string, contextId: string): BrowserState => ({
    ...state,
    sessionId,
    sessionUrl,
    contextId,
    currentStep: 0,
    steps: [],
    extractedData: null,
    error: undefined
  }),

  addStep: (state: BrowserState, step: BrowserStep): BrowserState => ({
    ...state,
    steps: [...state.steps, {
      ...step,
      status: step.status || 'running',
      stepNumber: state.steps.length + 1
    }],
    currentStep: state.currentStep + 1
  }),

  updateStepStatus: (state: BrowserState, stepIndex: number, status: 'completed' | 'failed', error?: Error): BrowserState => ({
    ...state,
    steps: state.steps.map((step, index) => 
      index === stepIndex ? { ...step, status, error } : step
    )
  }),

  setExtractedData: (state: BrowserState, data: any): BrowserState => ({
    ...state,
    extractedData: data
  }),

  setError: (state: BrowserState, error: Error): BrowserState => ({
    ...state,
    error
  }),

  reset: (): BrowserState => initialBrowserState
}; 