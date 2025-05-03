import { VapiClient } from "@vapi-ai/server-sdk";

// Initialize Vapi with server token
export const vapi = new VapiClient({ token: process.env.VAPI_API_KEY || '' });

// Function to create assistant configuration
export const createAssistantConfig = (
  firstMessage: string, 
  systemPrompt: string, 
  phoneNumber: string,
  earliestAt: string = new Date().toISOString(), // Default to now
  latestAt?: string // Optional end time
) => {
  // Create customer object
  const customer = {
    number: phoneNumber,
    firstMessage,
    numberE164CheckEnabled: true,
  };

  return {
    name: "ReadyDone Assistant",
    type: "outboundPhoneCall" as const,
    customer,
    schedulePlan: {
      earliestAt,
      ...(latestAt && { latestAt }),
    },
    assistant: {
      name: "ReadyDone Assistant",
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
    }
  };
};

// Function to start a call with temporary assistant
export const startCall = async ({
  firstMessage,
  systemPrompt,
  phoneNumber,
  earliestAt = new Date().toISOString(),
  latestAt,
}: {
  firstMessage: string;
  systemPrompt: string;
  phoneNumber: string;
  earliestAt?: string;
  latestAt?: string;
}) => {
  try {
    const callConfig = createAssistantConfig(firstMessage, systemPrompt, phoneNumber, earliestAt, latestAt);
    const call = await vapi.calls.create(callConfig);
    return call;
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

// Event handlers will be handled through webhooks in server SDK 