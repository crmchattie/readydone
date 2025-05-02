import Vapi from "@vapi-ai/web";

// Initialize Vapi with public key
export const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || '');

// Function to create assistant configuration
export const createAssistantConfig = (firstMessage: string, systemPrompt: string) => ({
  name: "Plot Life Assistant",
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
});

// Function to start a call with temporary assistant
export const startCall = async (firstMessage: string, systemPrompt: string) => {
  try {
    const assistantConfig = createAssistantConfig(firstMessage, systemPrompt);
    const call = await vapi.start(assistantConfig);
    return call;
  } catch (error) {
    console.error('Failed to start Vapi call:', error);
    throw error;
  }
};

// Function to end the call
export const endCall = async () => {
  try {
    await vapi.stop();
  } catch (error) {
    console.error('Failed to stop Vapi call:', error);
    throw error;
  }
};

// Event handlers
vapi.on("call-start", () => {
  console.log("Call has started");
});

vapi.on("call-end", () => {
  console.log("Call has ended");
});

vapi.on("error", (error) => {
  console.error("Call error:", error);
});

vapi.on("message", (message) => {
  console.log("Received message:", message);
}); 