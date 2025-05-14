import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { BrowserStep } from '@/lib/db/types';

// Debug helper
const debug = (message: string, data?: any) => {
  console.log(`[BrowserStore] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

interface BrowserState {
  sessionId?: string;
  sessionUrl?: string;
  contextId?: string;
  steps: BrowserStep[];
  currentStep: number;
  extractedData: any | null;
  error?: Error;
  isLoading: boolean;
}

const defaultState: BrowserState = {
  steps: [],
  currentStep: 0,
  extractedData: null,
  isLoading: false,
};

// Create an atom family keyed by instance ID
export const browserStateAtom = atomFamily((instanceId: string) => {
  debug('Creating browser state atom', { instanceId });
  const baseAtom = atom<BrowserState>({
    ...defaultState
  });

  // Create a wrapper atom that logs state changes
  const wrappedAtom = atom(
    (get) => get(baseAtom),
    (get, set, update: BrowserState | ((prev: BrowserState) => BrowserState)) => {
      const prev = get(baseAtom);
      const next = typeof update === 'function' ? update(prev) : update;
      
      debug('Updating browser state', { 
        instanceId,
        previous: prev,
        next,
        hasSessionUrl: !!next.sessionUrl,
        sessionUrl: next.sessionUrl
      });
      
      set(baseAtom, next);
    }
  );

  return wrappedAtom;
});

// Helper functions to update the state
export const updateBrowserState = {
  setSession: (state: BrowserState, sessionId: string, sessionUrl: string, contextId: string): BrowserState => {
    debug('Setting session state', { sessionId, sessionUrl, contextId });
    const updated = {
      ...state,
      sessionId,
      sessionUrl,
      contextId,
      currentStep: 0,
      steps: [],
      extractedData: null,
      error: undefined,
      isLoading: true // Keep loading until first step is complete
    };
    debug('Updated session state', { 
      previous: state, 
      updated,
      hasSessionUrl: !!updated.sessionUrl,
      sessionUrl: updated.sessionUrl
    });
    return updated;
  },

  addStep: (state: BrowserState, step: BrowserStep): BrowserState => {
    debug('Adding step', { step });
    const updated = {
      ...state,
      steps: [...state.steps, {
        ...step,
        status: step.status || 'running'
      }],
      currentStep: state.currentStep + 1
    };
    debug('Updated state with new step', { previous: state, updated });
    return updated;
  },

  updateStepStatus: (state: BrowserState, stepIndex: number, status: 'completed' | 'failed', error?: Error): BrowserState => {
    debug('Updating step status', { stepIndex, status, error });
    const updated = {
      ...state,
      steps: state.steps.map((step, index) => 
        index === stepIndex ? { ...step, status, error } : step
      )
    };
    debug('Updated step status', { previous: state, updated });
    return updated;
  },

  setExtractedData: (state: BrowserState, data: any): BrowserState => {
    debug('Setting extracted data', { data });
    const updated = {
      ...state,
      extractedData: data
    };
    debug('Updated extracted data', { previous: state, updated });
    return updated;
  },

  setError: (state: BrowserState, error: Error): BrowserState => {
    debug('Setting error', { error });
    const updated = {
      ...state,
      error
    };
    debug('Updated error state', { previous: state, updated });
    return updated;
  },

  reset: (): BrowserState => {
    debug('Resetting state to default');
    return {
      ...defaultState
    };
  }
}; 