import { tool, generateText } from 'ai';
import { z } from 'zod';
import { myProvider } from '@/lib/ai/providers';

interface TaskContext {
    taskType: string;          // e.g., "insurance_quote", "appointment_scheduling", "price_negotiation"
    businessName?: string;     // The business being called
    businessType?: string;     // Type of business (e.g., "car_dealership", "medical_clinic", "insurance_company")
    userGoal: string;         // The specific goal of the call
    requiredInfo?: string[];  // Any information needed to complete the task
    constraints?: string[];   // Any constraints or preferences
  }
  
  async function generateFirstMessage(context: TaskContext) {
    const { text } = await generateText({
      model: myProvider.languageModel('chat-model'),
      system: `You are an AI assistant making a phone call on behalf of a user. Generate a professional, natural first message that:
      1. Greets the recipient appropriately
      2. States your name and purpose clearly
      3. Begins addressing the specific task
      
      Consider the following context:
      - Task Type: ${context.taskType}
      - Business: ${context.businessName || 'the business'}
      - Goal: ${context.userGoal}
      
      The message should be concise, professional, and focused on the specific task while maintaining a natural, conversational tone.
      DO NOT mention that you are an AI assistant.`,
      prompt: `Generate an opening message for a call to ${context.businessName || 'a ' + context.businessType} regarding ${context.userGoal}.`,
    });
  
    return text.trim();
  }
  
  async function generateSystemPrompt(context: TaskContext) {
    const { text } = await generateText({
      model: myProvider.languageModel('chat-model'),
      system: `Create a system prompt for an AI assistant making a phone call. The prompt should:
      1. Define the assistant's purpose and scope for this specific task
      2. Specify voice characteristics and persona
      3. Outline the expected conversation flow
      4. Provide task-specific guidelines and objectives
      5. Include relevant domain knowledge
      6. Define success criteria
      
      Task Context:
      ${JSON.stringify(context, null, 2)}`,
      prompt: `Create a detailed system prompt for an AI assistant that needs to ${context.userGoal} through a phone call with ${context.businessName || 'a ' + context.businessType}.`,
    });
  
    return `# Task-Specific Call Assistant Prompt
  
  ${text.trim()}
  
  ## Task Context
  - Type: ${context.taskType}
  - Business: ${context.businessName || context.businessType}
  - Goal: ${context.userGoal}
  ${context.requiredInfo ? `\nRequired Information:\n${context.requiredInfo.map(info => `- ${info}`).join('\n')}` : ''}
  ${context.constraints ? `\nConstraints:\n${context.constraints.map(constraint => `- ${constraint}`).join('\n')}` : ''}
  
  ## General Guidelines
  - Maintain professional and natural conversation flow
  - Focus on task completion while being courteous
  - Ask clarifying questions when needed
  - Confirm important details explicitly
  - Handle objections professionally
  - Know when to escalate or end the call
  - Protect user's interests and information
  - Stay within authorized boundaries
  - Document important information received`;
  }
  
  // Example usage:
  /*
  const taskContext: TaskContext = {
    taskType: "insurance_quote",
    businessName: "AllState Insurance",
    businessType: "insurance_company",
    userGoal: "obtain a comprehensive car insurance quote for a 2020 Toyota Camry",
    requiredInfo: [
      "Vehicle identification number (VIN)",
      "Coverage preferences",
      "Current insurance status"
    ],
    constraints: [
      "Budget maximum $200/month",
      "Must include collision coverage",
      "Prefer low deductible options"
    ]
  };
  
  const firstMessage = await generateFirstMessage(taskContext);
  const systemPrompt = await generateSystemPrompt(taskContext);
  */ 

export const callPhone = tool({
  description: 'Make an outbound phone call using Vapi AI',
  parameters: z.object({
    phoneNumber: z.string().describe('The phone number to call (in E.164 format, e.g., +11231231234)'),
    assistantId: z.string().describe('The Vapi assistant ID to use for the call'),
    phoneNumberId: z.string().describe('The ID of the phone number to call from'),
    scheduleTime: z.string().optional().describe('Optional ISO date-time string for scheduling the call (e.g., 2025-05-30T00:00:00Z)'),
    taskContext: z.object({
      taskType: z.string(),
      businessName: z.string().optional(),
      businessType: z.string().optional(),
      userGoal: z.string(),
      requiredInfo: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional(),
    }).describe('Context about the task being performed in the call'),
  }),
  execute: async ({ phoneNumber, assistantId, phoneNumberId, scheduleTime, taskContext }) => {
    try {
      // Generate the first message and system prompt based on the task context
      const firstMessage = await generateFirstMessage(taskContext);
      const systemPrompt = await generateSystemPrompt(taskContext);

      // Construct the request body
      const requestBody: any = {
        assistantId,
        phoneNumberId,
        customer: {
          number: phoneNumber
        },
        assistant: {
          firstMessage,
          systemPrompt
        }
      };

      // Add schedule plan if a time is specified
      if (scheduleTime) {
        requestBody.schedulePlan = {
          earliestAt: scheduleTime
        };
      }

      // Make the API call to Vapi
      const response = await fetch('https://api.vapi.ai/call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to initiate call: ${error.message || response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        message: scheduleTime 
          ? `Call scheduled to ${phoneNumber} for ${scheduleTime}`
          : `Call initiated to ${phoneNumber}`,
        callId: result.id,
        firstMessage,
        systemPrompt
      };

    } catch (error) {
      console.error('Failed to make phone call:', error);
      throw error;
    }
  },
}); 