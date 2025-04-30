import { tool, generateText } from 'ai';
import { z } from 'zod';
import { myProvider } from '@/lib/ai/providers';
import { planningPrompt } from '@/lib/ai/prompts';

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
    try {
      const prompt = `Please help me plan this task:\n\n${task}${context ? `\n\nAdditional context:\n${context}` : ''}`;
      
      const { text } = await generateText({
        model: myProvider.languageModel('chat-model-large'),
        system: planningPrompt,
        prompt
      });

      // Parse the generated JSON plan
      const plan = JSON.parse(text);

      // Validate the basic structure
      if (!plan.goal || !plan.steps || !Array.isArray(plan.steps)) {
        throw new Error('Generated plan does not match expected structure');
      }

      return plan;
    } catch (error) {
      console.error('Failed to plan task:', error);
      return {
        goal: task,
        steps: []
      };
    }
  },
}); 