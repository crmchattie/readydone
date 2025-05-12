'use client';

import { useCallback, useEffect, useState } from "react";
import { useAtom } from "jotai";
import { browserStateAtom } from "../lib/browserbase/store";
import { 
  createBrowserSession,
  endBrowserSession,
  executeBrowserStep,
  getNextStep
} from "../lib/browserbase/client";
import { BrowserStep } from "@/lib/db/types";

// Debug helper
const debug = (message: string, data?: any) => {
  console.debug(`[use-browser] ${message}`, data ? data : '');
};

export function useBrowser() {
  const [state, setState] = useAtom(browserStateAtom);
  const [isClosing, setIsClosing] = useState(false);

  const handleError = async (error: Error) => {
    debug('Handling error', error);
    if (state.sessionId && !isClosing) {
      try {
        setIsClosing(true);
        // Try to close the agent first
        await fetch('/api/browser/agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: state.sessionId,
            action: 'CLOSE'
          })
        });
        // Then end the session
        await endBrowserSession(state.sessionId);
        debug('Session cleaned up after error');
      } catch (cleanupError) {
        debug('Error cleaning up session after failure', cleanupError);
      } finally {
        setIsClosing(false);
        setState(prev => ({
          ...prev,
          sessionId: undefined,
          sessionUrl: undefined,
          contextId: undefined,
          error: error,
          steps: prev.steps.map(s =>
            s.status === 'running'
              ? { ...s, status: 'failed', error }
              : s
          )
        }));
      }
    }
  };

  const execute = useCallback(async (task: string) => {
    debug('Executing task', { task });
    try {
      // Only create a new session if we don't have one
      if (!state.sessionId) {
        debug('Creating new browser session');
        const { sessionId, sessionUrl, contextId } = await createBrowserSession(
          Intl.DateTimeFormat().resolvedOptions().timeZone,
          undefined,
          { keepAlive: true }
        );
        debug('Browser session created', { sessionId, sessionUrl, contextId });

        setState(prev => ({
          ...prev,
          sessionId,
          sessionUrl,
          contextId,
          currentStep: 0,
          steps: [],
          extractedData: null,
          error: undefined
        }));

        // Start the agent with current session
        debug('Starting browser agent', { sessionId });
        const response = await fetch('/api/browser/agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            goal: task,
            action: 'START'
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to start browser task');
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to start browser task');
        }

        debug('First step received', data);

        // Add first step
        const step: BrowserStep = {
          ...data.result,
          stepNumber: 1,
          status: 'running'
        };

        setState(prev => ({
          ...prev,
          steps: [step],
          currentStep: 1
        }));

        if (data.extraction) {
          debug('Extraction data received', data.extraction);
          setState(prev => ({
            ...prev,
            extractedData: data.extraction,
            steps: prev.steps.map(s =>
              s.stepNumber === step.stepNumber
                ? { ...s, status: 'completed' }
                : s
            )
          }));
        }

        // Continue with subsequent steps if not done
        if (!data.done) {
          debug('Continuing with subsequent steps');
          while (true) {
            // Get next step
            debug('Getting next step');
            const { result: nextStep, done } = await getNextStep(
              sessionId,
              task,
              state.steps
            );
            debug('Next step received', { nextStep, done });

            // Add the step
            const step: BrowserStep = {
              ...nextStep,
              stepNumber: state.steps.length + 1,
              status: 'running'
            };

            setState(prev => ({
              ...prev,
              steps: [...prev.steps, step],
              currentStep: prev.currentStep + 1
            }));

            // Execute the step
            debug('Executing step', step);
            const { success, error, extraction } = await executeBrowserStep(
              sessionId,
              step
            );
            debug('Step execution result', { success, error, extraction });

            if (!success) {
              throw error || new Error("Failed to execute step");
            }

            if (extraction) {
              debug('Extraction data received', extraction);
              setState(prev => ({
                ...prev,
                extractedData: extraction,
                steps: prev.steps.map(s =>
                  s.stepNumber === step.stepNumber
                    ? { ...s, status: 'completed' }
                    : s
                )
              }));
            }

            if (done) {
              debug('Browser task completed');
              break;
            }
          }
        }
      }
    } catch (error) {
      debug('Error executing browser task', error);
      await handleError(error as Error);
    }
  }, [state.sessionId, state.steps, setState]);

  const close = useCallback(async () => {
    if (!state.sessionId || isClosing) return;

    debug('Attempting to close browser session', { sessionId: state.sessionId });
    try {
      setIsClosing(true);
      // First try to gracefully end the session via the agent
      await fetch('/api/browser/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: state.sessionId,
          action: 'CLOSE'
        })
      });

      // Then release the session
      await endBrowserSession(state.sessionId);
      debug('Browser session closed successfully');

      setState(prev => ({
        ...prev,
        sessionId: undefined,
        sessionUrl: undefined,
        contextId: undefined,
        error: undefined
      }));
    } catch (error) {
      debug('Error closing browser session', error);
      console.error("Error closing session:", error);
      // Even if there's an error, clear the session state
      setState(prev => ({
        ...prev,
        sessionId: undefined,
        sessionUrl: undefined,
        contextId: undefined,
        error: error as Error
      }));
    } finally {
      setIsClosing(false);
    }
  }, [state.sessionId, setState, isClosing]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (state.sessionId && !isClosing) {
        debug('Cleanup effect running, closing session', { sessionId: state.sessionId });
        close().catch(error => {
          debug('Error in cleanup effect', error);
        });
      }
    };
  }, [close, state.sessionId, isClosing]);

  return {
    execute,
    close,
    result: {
      state: "result" as const,
      sessionId: state.sessionId,
      sessionUrl: state.sessionUrl,
      contextId: state.contextId,
      steps: state.steps,
      currentStep: state.currentStep,
      error: state.error,
      extractedData: state.extractedData,
    },
  };
} 