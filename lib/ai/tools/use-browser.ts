import { tool } from 'ai';
import { z } from 'zod';
import { 
  createStagehandInstance, 
  closeBrowserSession, 
  ExtractDataSchema,
  planNextAction,
  executeAction
} from '@/lib/browserbase/service';

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
    try {
      // Initialize Stagehand and create a browser session
      const { stagehand, session } = await createStagehandInstance();
      const page = stagehand.page;

      // Navigate to the URL
      await page.goto(url);

      let result: any = {
        success: false,
        actions: [] as string[],
        data: null,
        url: url,
        taskCompleted: false
      };

      // Use autonomous planning to complete the task
      let attempts = 0;
      
      while (!result.taskCompleted && attempts < maxAttempts) {
        // Plan next action based on current page state and task
        const plan = await planNextAction(page, task);
        
        // Execute the planned action
        const success = await executeAction(page, plan.nextAction, variables);
        if (success) {
          result.actions.push({
            action: plan.nextAction,
            reason: plan.reason,
            timestamp: new Date().toISOString()
          });
          
          // Check if we should extract data after this action
          if (plan.extractAfter) {
            // Try to extract data based on the task
            const schema = extractionSchema || ExtractDataSchema;
            try {
              const extractedData = await page.extract({
                instruction: task,
                schema: schema as any,
              });

              if (extractedData) {
                result.data = extractedData;
                result.taskCompleted = true;
              }
            } catch (error) {
              console.warn('Data extraction failed, continuing with task:', error);
            }
          }
        } else {
          console.warn(`Action failed: ${plan.nextAction}`);
          // Add failed action to history for debugging
          result.actions.push({
            action: plan.nextAction,
            reason: plan.reason,
            status: 'failed',
            timestamp: new Date().toISOString()
          });
        }
        
        attempts++;
      }

      // If we haven't extracted data yet but have taken actions, try one final extraction
      if (!result.data && result.actions.length > 0) {
        const schema = extractionSchema || ExtractDataSchema;
        try {
          result.data = await page.extract({
            instruction: task,
            schema: schema as any,
          });
        } catch (error) {
          console.warn('Final data extraction failed:', error);
        }
      }

      result.success = result.taskCompleted || (result.data !== null);
      result.url = page.url();
      result.attempts = attempts;

      // Clean up
      await closeBrowserSession(session);

      return result;
    } catch (error) {
      console.error('Browser automation error:', error);
      throw error;
    }
  },
}); 