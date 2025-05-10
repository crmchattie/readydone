'use client';

import { useCallback, useEffect } from "react";
import { useAtom } from "jotai";
import { browserStateAtom } from "../lib/browserbase/store";
import { 
  createBrowserSession,
  endBrowserSession,
  executeBrowserStep,
  getNextStep
} from "../lib/browserbase/client";
import { BrowserStep } from "@/lib/db/types";

export function useBrowser() {
  const [state, setState] = useAtom(browserStateAtom);

  const execute = useCallback(async (task: string) => {
    try {
      // Only create a new session if we don't have one
      if (!state.sessionId) {
        const { sessionId, sessionUrl, contextId } = await createBrowserSession(
          Intl.DateTimeFormat().resolvedOptions().timeZone
        );
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
      }

      // Start the agent with current session
      const { result: firstStep } = await getNextStep(state.sessionId!, task, []);

      // Add first step
      const step: BrowserStep = {
        ...firstStep,
        stepNumber: 1,
        status: 'running'
      };

      setState(prev => ({
        ...prev,
        steps: [...prev.steps, step],
        currentStep: prev.currentStep + 1
      }));

      // Execute first step
      const { success, error, extraction } = await executeBrowserStep(
        state.sessionId!,
        step
      );

      if (!success) {
        throw error || new Error("Failed to execute first step");
      }

      if (extraction) {
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

      // Continue with subsequent steps
      while (true) {
        // Get next step
        const { result: nextStep } = await getNextStep(
          state.sessionId!,
          task,
          state.steps
        );

        // Add the next step
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

        // Break if we're done
        if (nextStep.tool === "CLOSE") {
          break;
        }

        // Execute the step
        const { success, error, extraction } = await executeBrowserStep(
          state.sessionId!,
          step
        );

        if (!success) {
          throw error || new Error("Failed to execute step");
        }

        if (extraction) {
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
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error as Error,
        steps: prev.steps.map(s => 
          s.status === 'running' 
            ? { ...s, status: 'failed', error: error as Error }
            : s
        )
      }));
    }
  }, [state.sessionId, state.steps, setState]);

  const close = useCallback(async () => {
    if (state.sessionId) {
      try {
        await endBrowserSession(state.sessionId);
        setState(prev => ({
          ...prev,
          sessionId: undefined,
          sessionUrl: undefined,
          contextId: undefined,
          steps: [],
          currentStep: 0,
          extractedData: null,
          error: undefined
        }));
      } catch (error) {
        console.error("Error closing session:", error);
      }
    }
  }, [state.sessionId, setState]);

  useEffect(() => {
    return () => {
      close();
    };
  }, [close]);

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