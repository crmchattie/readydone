import { DataStreamWriter, tool } from 'ai';
import { Session } from 'next-auth';
import { z } from 'zod';
import { createSession, endSession } from '@/lib/browserbase/service';
import { BrowserResult } from '@/lib/db/types';

// Debug helper
const debug = (message: string, data?: any) => {
  console.debug(`[Browser Tool] ${message}`, data ? data : '');
};

interface BrowserToolProps {
  session: Session;
  dataStream: DataStreamWriter;
  chatId: string;
}

export const runBrowser = ({ session, dataStream, chatId }: BrowserToolProps) =>
  tool({
    description: 'Use a browser to accomplish a task',
    parameters: z.object({
      task: z.string().describe('The task to accomplish'),
      url: z.string().url().optional().describe('The URL to start from'),
      variables: z.record(z.string()).optional().describe('Variables to use in the task'),
      extractionSchema: z.record(z.any()).optional().describe('Schema for data extraction'),
      maxAttempts: z.number().optional().describe('Maximum number of attempts'),
    }),
    execute: async ({ task, url, variables, extractionSchema, maxAttempts }) => {
      debug('Starting browser task', { task, url });
      let sessionId: string | undefined;
      
      try {
        // Create browser session
        const browserSession = await createSession(
          Intl.DateTimeFormat().resolvedOptions().timeZone
        );
        sessionId = browserSession.sessionId;

        debug('Created browser session', { sessionId: browserSession.sessionId });

        // Start the agent immediately
        const agentResponse = await fetch('/api/browser/agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: browserSession.sessionId,
            goal: task,
            action: 'START'
          })
        });

        if (!agentResponse.ok) {
          const errorData = await agentResponse.json();
          throw new Error(errorData.error || 'Failed to start browser agent');
        }

        const agentData = await agentResponse.json();
        debug('Agent started successfully', agentData);

        // Return with initial state and first step if available
        return {
          state: 'result' as const,
          sessionId: browserSession.sessionId,
          sessionUrl: browserSession.sessionUrl,
          contextId: browserSession.contextId,
          task,
          steps: agentData.steps || [],
          currentStep: 0,
          extractedData: agentData.extraction || null,
        };
      } catch (error) {
        debug('Error in browser tool', error);
        if (sessionId) {
          try {
            await endSession(sessionId);
          } catch (cleanupError) {
            debug('Error cleaning up session', cleanupError);
          }
        }
        throw error;
      }
    },
  }); 