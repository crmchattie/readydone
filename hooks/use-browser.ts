'use client';

import { useCallback, useEffect, useState, useRef } from "react";
import { useAtom } from "jotai";
import { browserStateAtom, updateBrowserState } from "../lib/browserbase/store";
import { 
  endBrowserSession,
} from "../lib/browserbase/client";
import { BrowserStep } from "@/lib/db/types";

// Debug helper
const debug = (message: string, data?: any) => {
  console.log(`[useBrowser] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

export function useBrowser(instanceId: string, task?: string, chatId?: string, documentId?: string) {
  debug('useBrowser hook called', { instanceId, task, chatId, documentId });
  
  const [session, setSession] = useAtom(browserStateAtom(instanceId));
  const [isClosing, setIsClosing] = useState(false);
  const isCreatingSession = useRef(false);
  const preserveSession = useRef(false);

  // Debug the initial state and any state changes
  useEffect(() => {
    debug('Browser state changed', {
      instanceId,
      chatId,
      documentId,
      sessionId: session.sessionId,
      sessionUrl: session.sessionUrl,
      isLoading: session.isLoading,
      stepsCount: session.steps.length,
      isClosing,
      preserveSession: preserveSession.current
    });
  }, [session, instanceId, chatId, isClosing]);

  // Store session info when it becomes available
  useEffect(() => {
    if (session.sessionId) {
      preserveSession.current = true;
    }
  }, [session.sessionId]);

  const handleError = async (error: Error) => {
    debug('Handling error', { error: error.message, sessionId: session.sessionId, isClosing });
    if (session.sessionId && !isClosing) {
      try {
        setIsClosing(true);
        setSession(prev => ({
          ...prev,
          isLoading: true
        }));
        
        debug('Attempting to close session after error', { sessionId: session.sessionId });
        // Try to close the agent first
        await fetch('/api/browser/agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: session.sessionId,
            action: 'CLOSE'
          })
        });
        // Then end the session
        await endBrowserSession(session.sessionId);
        debug('Session cleaned up after error', { sessionId: session.sessionId });
      } catch (cleanupError) {
        debug('Error cleaning up session after failure', { 
          sessionId: session.sessionId, 
          error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error' 
        });
      } finally {
        setIsClosing(false);
        setSession(prev => ({
          ...prev,
          sessionId: undefined,
          sessionUrl: undefined,
          contextId: undefined,
          error: error,
          isLoading: false,
          steps: prev.steps.map(s =>
            s.status === 'running'
              ? { ...s, status: 'failed', error }
              : s
          )
        }));
      }
    }
  };

  const createSession = useCallback(async () => {
    debug('Creating session', { instanceId, task, chatId });
    try {
      const response = await fetch('/api/browser/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          title: task,
          chatId,
          documentId
        })
      });
      
      const data = await response.json();
      debug('Session creation response', { data, instanceId, chatId });
      
      if (!data.success) throw new Error(data.error);
      
      const { sessionId, sessionUrl, contextId } = data.result;
      
      debug('Session created successfully', { sessionId, sessionUrl, contextId, instanceId, chatId });
      return { sessionId, sessionUrl, contextId };
    } catch (error) {
      debug('Error creating session', { error, instanceId, chatId });
      throw error;
    }
  }, [instanceId, task, chatId]);

  const startAgent = useCallback(async (sessionId: string, goal: string) => {
    debug('Starting agent', { sessionId, goal });
    try {
      const response = await fetch('/api/browser/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'START',
          goal
        })
      });
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      
      debug('Agent started', data);
      return data;
    } catch (error) {
      debug('Error starting agent', error);
      throw error;
    }
  }, []);

  const executeStep = useCallback(async (sessionId: string, step: BrowserStep) => {
    debug('Executing step', { sessionId, step });
    try {
      const response = await fetch('/api/browser/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'EXECUTE_STEP',
          step
        })
      });
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      
      debug('Step executed', data);
      return data;
    } catch (error) {
      debug('Error executing step', error);
      throw error;
    }
  }, []);

  const getNextStep = useCallback(async (sessionId: string, goal: string, previousSteps: BrowserStep[]) => {
    debug('Getting next step', { sessionId, goal, previousSteps });
    try {
      const response = await fetch('/api/browser/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'GET_NEXT_STEP',
          goal,
          previousSteps
        })
      });
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      
      debug('Got next step', data);
      return data;
    } catch (error) {
      debug('Error getting next step', error);
      throw error;
    }
  }, []);

  const execute = useCallback(async (task: string) => {
    debug('Execute called', { task, instanceId, currentSession: session });
    
    // Prevent multiple simultaneous executions
    if (session.isLoading || session.sessionId || isCreatingSession.current) {
      debug('Execution blocked', {
        isLoading: session.isLoading,
        hasSessionId: !!session.sessionId,
        isCreating: isCreatingSession.current,
        instanceId
      });
      return;
    }
    
    try {
      isCreatingSession.current = true;
      debug('Setting initial loading state', { instanceId });
      
      setSession(prev => ({
        ...prev,
        isLoading: true,
        error: undefined
      }));

      // Create session
      const { sessionId, sessionUrl, contextId } = await createSession();
      debug('Setting session state', { sessionId, sessionUrl, contextId, instanceId });
      
      setSession(prev => ({
        ...prev,
        sessionId,
        sessionUrl,
        contextId,
        isLoading: true,
        error: undefined
      }));

      // Start agent
      const { result: firstStep, extraction, done } = await startAgent(sessionId, task);
      const completedFirstStep = { ...firstStep, status: 'completed' as const };
      
      debug('Setting first step state', { 
        firstStep: completedFirstStep,
        extraction,
        done,
        sessionUrl,
        instanceId
      });

      setSession(prev => ({
        ...prev,
        sessionId,
        sessionUrl,
        contextId,
        steps: [completedFirstStep],
        currentStep: 0,
        extractedData: extraction || null,
        isLoading: !done
      }));

      // If not done, get and execute next steps
      if (!done) {
        const executeNextStep = async (previousSteps: BrowserStep[]) => {
          try {
            // Get next step with current steps
            const { result: nextStep, done } = await getNextStep(sessionId, task, previousSteps);
            if (done) {
              debug('All steps completed', { sessionUrl: session.sessionUrl });
              setSession(prev => ({ 
                ...prev, 
                isLoading: false,
                sessionUrl: prev.sessionUrl
              }));
              return;
            }

            // Execute step
            const { result: executedStep, extraction, done: stepDone, success, error } = 
              await executeStep(sessionId, nextStep);
            
            if (!success) {
              debug('Step execution failed', { error });
              throw new Error(error || 'Step execution failed');
            }
            
            // Create new completed step
            const completedStep = { ...executedStep, status: 'completed' as const };
            
            // Update state with the completed step
            setSession(prev => ({
              ...prev,
              steps: [...previousSteps, completedStep],
              currentStep: prev.currentStep + 1,
              extractedData: extraction || prev.extractedData,
              isLoading: !stepDone,
              sessionUrl: prev.sessionUrl
            }));

            // Continue if not done
            if (!stepDone) {
              await executeNextStep([...previousSteps, completedStep]);
            }
          } catch (error) {
            debug('Error executing next step', { error });
            throw error;
          }
        };

        await executeNextStep([completedFirstStep]);
      }

      return { sessionId, sessionUrl, contextId, firstStep, extraction };
    } catch (error) {
      debug('Error executing task', { error });
      setSession(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to execute task'),
        isLoading: false,
        sessionUrl: prev.sessionUrl
      }));
      throw error;
    } finally {
      isCreatingSession.current = false;
    }
  }, [createSession, setSession, startAgent, executeStep, getNextStep, session, instanceId]);

  const close = useCallback(async () => {
    if (!session.sessionId || isClosing || preserveSession.current) {
      debug('Close skipped', { 
        sessionId: session.sessionId, 
        isClosing,
        preserveSession: preserveSession.current
      });
      return;
    }
    
    debug('Starting session close', { sessionId: session.sessionId });
    try {
      setIsClosing(true);
      setSession(prev => ({
        ...prev,
        isLoading: true
      }));
      
      // First close the agent
      debug('Closing agent', { sessionId: session.sessionId });
      await fetch('/api/browser/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          action: 'CLOSE'
        })
      });
      
      // Then end the session
      debug('Ending session', { sessionId: session.sessionId });
      await endBrowserSession(session.sessionId);
      debug('Session closed successfully', { sessionId: session.sessionId });
      
      setSession(updateBrowserState.reset());
      preserveSession.current = false;
    } catch (error) {
      debug('Error closing session', { 
        sessionId: session.sessionId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      // Even if there's an error, clear the session state
      setSession(updateBrowserState.reset());
      preserveSession.current = false;
    } finally {
      setIsClosing(false);
    }
  }, [session.sessionId, setSession, isClosing]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (session.sessionId && !isClosing && !preserveSession.current) {
        debug('Cleanup effect running', { 
          sessionId: session.sessionId, 
          isClosing,
          preserveSession: preserveSession.current,
          hasSteps: session.steps.length > 0
        });
        close().catch(error => {
          debug('Error in cleanup effect', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        });
      }
    };
  }, [close, session.sessionId, isClosing]);

  return {
    session,
    execute,
    executeStep,
    getNextStep,
    close,
    setSession
  };
} 