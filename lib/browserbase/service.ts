import { Browserbase } from "@browserbasehq/sdk";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

// Initialize Browserbase client
const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });

// Schema for structured data extraction
export const ExtractDataSchema = z.object({
  content: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type ExtractDataResult = z.infer<typeof ExtractDataSchema>;

// Schema for action planning
export const ActionPlanSchema = z.object({
  nextAction: z.string(),
  reason: z.string(),
  extractAfter: z.boolean().optional(),
});

export type ActionPlan = z.infer<typeof ActionPlanSchema>;

// Initialize Stagehand instance with better configuration
export async function createStagehandInstance() {
  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!
  });

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    modelName: "claude-3-5-sonnet-latest",
    modelClientOptions: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
  });

  await stagehand.init();
  return { stagehand, session };
}

// Plan next action based on current page state and task
export async function planNextAction(page: any, task: string): Promise<ActionPlan> {
  // Use observe() to get actionable suggestions from the current page
  const suggestions = await page.observe();
  
  // Extract the task-relevant action using the page's extract method
  const plan = await page.extract({
    instruction: `Given the task "${task}" and the current page state, determine the next best action to take. Consider:
    1. What elements are visible and interactive
    2. Which action would get us closer to completing the task
    3. Whether we need to extract data after this action`,
    schema: ActionPlanSchema
  });

  return plan;
}

// Execute an action with proper error handling and validation
export async function executeAction(page: any, action: string, variables?: Record<string, string>) {
  try {
    // Use observe to preview the action first
    const [suggestion] = await page.observe(action);
    
    if (!suggestion) {
      throw new Error(`No valid action found for: ${action}`);
    }

    // If we have variables, use them securely
    if (variables) {
      await page.act({
        ...suggestion,
        variables
      });
    } else {
      await page.act(suggestion);
    }

    return true;
  } catch (error) {
    console.error('Action execution failed:', error);
    return false;
  }
}

// Close browser session
export async function closeBrowserSession(session: any) {
  try {
    await bb.sessions.update(session.id, {
      status: "REQUEST_RELEASE",
      projectId: process.env.BROWSERBASE_PROJECT_ID!
    });
  } catch (error) {
    console.error("Error closing browser session:", error);
  }
} 