import { tool, generateText } from 'ai';
import { z } from 'zod';
import { myProvider } from '@/lib/ai/providers';
import { planningPrompt } from '@/lib/ai/prompts';

// Debug helper
const debug = (message: string, data?: any) => {
  console.debug(`[Plan Task Tool] ${message}`, data ? data : '');
};

interface PlanStep {
  description: string;  // What needs to be done
  reason: string;      // Why this step is needed
  tool: string;        // Which tool to use
  input: {            // What input the tool needs
    [key: string]: unknown;
  };
  requires?: string[];  // IDs of steps that must complete first
}

interface PlanResult {
  goal: string;        // What we're trying to achieve
  steps: PlanStep[];   // Steps to achieve the goal
}

export const planTask = tool({
  description: 'Create a structured plan for LLM execution',
  parameters: z.object({
    task: z.string().describe('The task to plan'),
    context: z.string().optional().describe('Additional context about the task'),
  }),
  execute: async ({ task, context }): Promise<PlanResult> => {
    debug('Starting task planning', { task, hasContext: !!context });
    
    try {
      debug('Generating planning prompt');
      const prompt = `Please help me plan this task:\n\n${task}${context ? `\n\nAdditional context:\n${context}` : ''}`;
      
      debug('Requesting plan generation');
      const { text } = await generateText({
        model: myProvider.languageModel('chat-model-large'),
        system: planningPrompt,
        prompt
      });
      debug('Plan text generated', { textLength: text.length });

      debug('Parsing generated plan');
      const plan = JSON.parse(text);
      debug('Plan parsed successfully', { 
        hasGoal: !!plan.goal,
        stepCount: plan.steps?.length || 0
      });

      // Validate the basic structure
      if (!plan.goal || !plan.steps || !Array.isArray(plan.steps)) {
        debug('Plan validation failed', {
          hasGoal: !!plan.goal,
          hasSteps: !!plan.steps,
          isStepsArray: Array.isArray(plan.steps)
        });
        throw new Error('Generated plan does not match expected structure');
      }

      debug('Plan validation successful', {
        goal: plan.goal,
        stepCount: plan.steps.length,
        toolsUsed: plan.steps.map((step: PlanStep) => step.tool)
      });

      return plan;
    } catch (error) {
      debug('Task planning failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackGoal: task
      });
      console.error('Failed to plan task:', error);
      return {
        goal: task,
        steps: []
      };
    }
  },
}); 