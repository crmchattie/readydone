import { DataStreamWriter, tool } from 'ai';
import { Session } from 'next-auth';
import { z } from 'zod';
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
    description: 'Use a browser to accomplish a task. Note: This tool only STARTS the browser task - it does not wait for completion. The task will continue executing after this tool returns. Do not assume the task is complete when this tool call finishes.',
    parameters: z.object({
      task: z.string().describe('The task to accomplish'),
      url: z.string().url().optional().describe('The URL to start from'),
      variables: z.record(z.string()).optional().describe('Variables to use in the task'),
      extractionSchema: z.record(z.any()).optional().describe('Schema for data extraction'),
      maxAttempts: z.number().optional().describe('Maximum number of attempts'),
    }),
    execute: async ({ task, url, variables, extractionSchema, maxAttempts }) => {
      debug('Starting browser task', { task, url });
      
      // Return initial configuration for the browser preview and explicitly indicate task is starting
      return {
        state: 'result' as const,
        result: {
          state: 'result',
          message: 'Browser task has been initiated and is in progress. The task will continue executing in the background. Please wait for updates.',
          steps: [],
          currentStep: 0,
          task,
          url,
          variables,
          extractionSchema,
          maxAttempts
        } as BrowserResult
      };
    },
  }); 