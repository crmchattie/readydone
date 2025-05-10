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
        // Use the service directly instead of going through the client
        const browserSession = await createSession(
          Intl.DateTimeFormat().resolvedOptions().timeZone
        );
        sessionId = browserSession.sessionId;

        debug('Created browser session', { sessionId: browserSession.sessionId });

        // Return immediately to start streaming the UI
        return {
          state: 'result' as const,
          sessionId: browserSession.sessionId,
          sessionUrl: browserSession.sessionUrl,
          contextId: browserSession.contextId,
          task,
          steps: [],
          currentStep: 0,
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