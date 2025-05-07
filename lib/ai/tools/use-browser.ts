import { tool } from 'ai';
import { z } from 'zod';
import { 
  createStagehandInstance, 
  closeBrowserSession, 
  ExtractDataSchema,
  planNextAction,
  executeAction
} from '@/lib/browserbase/service';

// Debug helper
const debug = (message: string, data?: any) => {
  console.debug(`[Browser Tool] ${message}`, data ? data : '');
};

export const useBrowser = tool({
  description: 'Browse a website and extract information using an AI-powered browser. The tool will autonomously navigate and interact with the website to complete the given task.',
  parameters: z.object({
    url: z.string().describe('The URL to navigate to'),
    task: z.string().describe(
      'What to accomplish on the website. Example: "Find the pricing for the enterprise plan" or "Extract contact information from the about page". ' +
      'Be specific about what information to find or what actions to take.'
    ),
    variables: z.record(z.string(), z.string()).optional().describe(
      'Sensitive or dynamic values to use in the task (e.g., login credentials). ' +
      'Reference them in the task using %variable_name% syntax.'
    ),
    extractionSchema: z.object({}).optional().describe('Custom schema for data extraction. Defaults to extracting string content.'),
    maxAttempts: z.number().optional().default(10).describe('Maximum number of actions to attempt. Default is 10.'),
  }),
  execute: async ({ url, task, extractionSchema, variables, maxAttempts = 10 }) => {
    debug('Starting browser automation', { 
      url, 
      task, 
      hasVariables: !!variables,
      hasExtractionSchema: !!extractionSchema,
      maxAttempts 
    });

    try {
      debug('Initializing Stagehand and creating browser session');
      const { stagehand, session } = await createStagehandInstance();
      const page = stagehand.page;
      debug('Browser session created successfully');

      debug('Navigating to URL', { url });
      await page.goto(url);
      debug('Navigation completed');

      let result: any = {
        success: false,
        actions: [] as string[],
        data: null,
        url: url,
        taskCompleted: false
      };

      debug('Starting autonomous task execution');
      let attempts = 0;
      
      while (!result.taskCompleted && attempts < maxAttempts) {
        debug('Planning next action', { attempt: attempts + 1, maxAttempts });
        const plan = await planNextAction(page, task);
        debug('Action planned', { 
          nextAction: plan.nextAction,
          reason: plan.reason,
          shouldExtract: plan.extractAfter
        });
        
        debug('Executing planned action');
        const success = await executeAction(page, plan.nextAction, variables);
        debug('Action execution result', { success });

        if (success) {
          debug('Action succeeded, recording action');
          result.actions.push({
            action: plan.nextAction,
            reason: plan.reason,
            timestamp: new Date().toISOString()
          });
          
          if (plan.extractAfter) {
            debug('Attempting data extraction after successful action');
            const schema = extractionSchema || ExtractDataSchema;
            try {
              const extractedData = await page.extract({
                instruction: task,
                schema: schema as any,
              });

              if (extractedData) {
                debug('Data extraction successful', { 
                  dataSize: JSON.stringify(extractedData).length 
                });
                result.data = extractedData;
                result.taskCompleted = true;
              } else {
                debug('No data extracted');
              }
            } catch (error) {
              debug('Data extraction failed', { 
                error: error instanceof Error ? error.message : 'Unknown error' 
              });
            }
          }
        } else {
          debug('Action failed', { failedAction: plan.nextAction });
          result.actions.push({
            action: plan.nextAction,
            reason: plan.reason,
            status: 'failed',
            timestamp: new Date().toISOString()
          });
        }
        
        attempts++;
        debug('Attempt completed', { 
          currentAttempt: attempts, 
          remaining: maxAttempts - attempts,
          taskCompleted: result.taskCompleted
        });
      }

      if (!result.data && result.actions.length > 0) {
        debug('Attempting final data extraction');
        const schema = extractionSchema || ExtractDataSchema;
        try {
          result.data = await page.extract({
            instruction: task,
            schema: schema as any,
          });
          debug('Final extraction completed', { 
            success: !!result.data,
            dataSize: result.data ? JSON.stringify(result.data).length : 0
          });
        } catch (error) {
          debug('Final data extraction failed', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      result.success = result.taskCompleted || (result.data !== null);
      result.url = page.url();
      result.attempts = attempts;

      debug('Cleaning up browser session');
      await closeBrowserSession(session);
      debug('Browser session closed');

      debug('Task execution completed', {
        success: result.success,
        taskCompleted: result.taskCompleted,
        totalAttempts: attempts,
        actionsCount: result.actions.length,
        hasData: !!result.data,
        finalUrl: result.url
      });

      return result;
    } catch (error) {
      debug('Browser automation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  },
}); 