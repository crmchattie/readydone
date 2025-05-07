import { VapiClient } from "@vapi-ai/server-sdk";
import type { Call, CreateCallDto } from "@vapi-ai/server-sdk/api";

// Initialize Vapi with server token
export const vapi = new VapiClient({ token: process.env.VAPI_API_KEY || '' });

// Function to create assistant configuration
export const createAssistantConfig = (
  firstMessage: string, 
  systemPrompt: string, 
  phoneNumber: string,
  earliestAt?: string,
  latestAt?: string, // Optional end time
  threadId?: string
): CreateCallDto => {
  // Create customer object
  const customer = {
    number: phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`, // Remove all non-digits and ensure E.164 format
  };

  return {
    name: "ReadyDone Assistant",
    customer,
    phoneNumberId: process.env.VAPI_PHONE_ID,
    ...(earliestAt && {
      schedulePlan: {
        earliestAt,
        ...(latestAt && { latestAt }),
      }
    }),
    assistant: {
      name: "ReadyDone Assistant",
      firstMessage,
      transcriber: {
        provider: "openai" as const,
        model: "gpt-4o-mini-transcribe" as const,
        language: "en" as const,
      },
      voice: {
        provider: "vapi" as const,
        voiceId: "Elliot" as const,
      },
      model: {
        provider: "openai" as const,
        model: "gpt-4o" as const,
        messages: [
          {
            role: "system" as const,
            content: systemPrompt,
          },
        ],
      },
      server: {
        url: process.env.VAPI_WEBHOOK_URL || 'https://readydone.ai/api/vapi',
        timeoutSeconds: 20,
        secret: process.env.VAPI_SERVER_SECRET
      },
      hooks: [
        {
          on: "call.ending" as const,
          do: [
            {
              type: "function" as const,
              function: {
                name: "end_call",
                description: "End the call and send threadId to server",
                parameters: {
                  type: "object",
                  required: ["threadId"],
                  properties: {
                    threadId: {
                      type: "string",
                      description: "The thread ID associated with this call",
                      value: threadId || ""
                    }
                  }
                }
              }
            }
          ]
        }
      ]
    }
  };
};

// Function to start a call with temporary assistant
export const startCall = async ({
  firstMessage,
  systemPrompt,
  phoneNumber,
  earliestAt,
  latestAt,
  threadId,
}: {
  firstMessage: string;
  systemPrompt: string;
  phoneNumber: string;
  earliestAt?: string;
  latestAt?: string;
  threadId?: string;
}): Promise<Call> => {
  try {
    const callConfig = createAssistantConfig(firstMessage, systemPrompt, phoneNumber, earliestAt, latestAt, threadId);
    const response = await vapi.calls.create(callConfig);
    return response as Call;
  } catch (error) {
    console.error('Failed to start Vapi call:', error);
    throw error;
  }
};

// Function to end the call
export const endCall = async (callId: string) => {
  try {
    await vapi.calls.delete(callId);
  } catch (error) {
    console.error('Failed to stop Vapi call:', error);
    throw error;
  }
};

// Function to get call details
export const getCall = async (callId: string) => {
  try {
    const call = await vapi.calls.get(callId);
    return call;
  } catch (error) {
    console.error('Failed to get Vapi call:', error);
    throw error;
  }
};

// Event handlers will be handled through webhooks in server SDK 