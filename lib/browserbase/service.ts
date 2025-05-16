import { Browserbase } from "@browserbasehq/sdk";
import { BrowserbaseRegion, BrowserStep } from "@/lib/db/types";
import { Stagehand } from "@browserbasehq/stagehand";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { CoreMessage, generateObject, UserContent } from "ai";
import { generateUUID } from '../utils';
import { saveDocument } from '../db/queries';

// Initialize Browserbase client
const bb = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY!,
});

const LLMClient = openai("gpt-4.1");

// Region mapping configuration
const exactTimezoneMap: Record<string, BrowserbaseRegion> = {
  "America/New_York": "us-east-1",
  "America/Detroit": "us-east-1",
  "America/Toronto": "us-east-1",
  "America/Montreal": "us-east-1",
  "America/Boston": "us-east-1",
  "America/Chicago": "us-east-1",
};

const prefixToRegion: Record<string, BrowserbaseRegion> = {
  America: "us-west-2",
  US: "us-west-2",
  Canada: "us-west-2",
  Europe: "eu-central-1",
  Africa: "eu-central-1",
  Asia: "ap-southeast-1",
  Australia: "ap-southeast-1",
  Pacific: "ap-southeast-1",
};

const offsetRanges: {
  min: number;
  max: number;
  region: BrowserbaseRegion;
}[] = [
  { min: -24, max: -4, region: "us-west-2" }, // UTC-24 to UTC-4
  { min: -3, max: 4, region: "eu-central-1" }, // UTC-3 to UTC+4
  { min: 5, max: 24, region: "ap-southeast-1" }, // UTC+5 to UTC+24
];

async function runStagehand({
  sessionID,
  method,
  instruction,
}: {
  sessionID: string;
  method: "GOTO" | "ACT" | "EXTRACT" | "CLOSE" | "SCREENSHOT" | "OBSERVE" | "WAIT" | "NAVBACK";
  instruction?: string;
}) {
  const stagehand = new Stagehand({
    browserbaseSessionID: sessionID,
    env: "BROWSERBASE",
    logger: () => {}
  });
  await stagehand.init();

  const page = await stagehand.page;

  try {
    switch (method) {
      case "GOTO":
        await page.goto(instruction!, {
          waitUntil: "commit",
          timeout: 60000,
        });
        break;

      case "ACT":
        await page.act(instruction!);
        break;

      case "EXTRACT": {
        const { extraction } = await page.extract(instruction!);
        return extraction;
      }

      case "OBSERVE":
        return instruction ? await page.observe(instruction) : await page.observe();

      case "SCREENSHOT": {
        const cdpSession = await page.context().newCDPSession(page);
        const { data } = await cdpSession.send("Page.captureScreenshot");
        return data;
      }

      case "WAIT":
        await new Promise((resolve) => setTimeout(resolve, Number(instruction)));
        break;

      case "NAVBACK":
        await page.goBack();
        break;

      case "CLOSE":
        await stagehand.close();
        break;
    }
  } catch (error) {
    await stagehand.close();
    throw error;
  } finally {
    if (method !== "CLOSE") {
      await stagehand.close();
    }
  }
}

async function selectStartingUrl(goal: string) {
  const message: CoreMessage = {
    role: "user",
    content: [{
      type: "text",
      text: `Given the goal: "${goal}", determine the best URL to start from.
Choose from:
1. A relevant search engine (Google, Bing, etc.)
2. A direct URL if you're confident about the target website
3. Any other appropriate starting point

Return a URL that would be most effective for achieving this goal.`
    }]
  };

  const result = await generateObject({
    model: LLMClient,
    schema: z.object({
      url: z.string().url(),
      reasoning: z.string()
    }),
    messages: [message]
  });

  return result.object;
}

async function sendPrompt({
  goal,
  sessionID,
  previousSteps = [],
  previousExtraction,
}: {
  goal: string;
  sessionID: string;
  previousSteps?: BrowserStep[];
  previousExtraction?: any;
}) {
  let currentUrl = "";
  let screenshot = null;

  try {
    const stagehand = new Stagehand({
      browserbaseSessionID: sessionID,
      env: "BROWSERBASE",
      logger: () => {}
    });
    await stagehand.init();
    currentUrl = await stagehand.page.url();
    
    if (previousSteps.length > 0 && previousSteps.some(step => step.tool === "GOTO")) {
      screenshot = await runStagehand({
        sessionID,
        method: "SCREENSHOT"
      });
    }
    
    await stagehand.close();
  } catch (error) {
    console.error('Error getting page info:', error);
  }

  const content: UserContent = [
    {
      type: "text" as const,
      text: `Consider the following screenshot of a web page${currentUrl ? ` (URL: ${currentUrl})` : ''}, with the goal being "${goal}".
${previousSteps.length > 0
    ? `Previous steps taken:
${previousSteps
  .map(
    (step, index) => `
Step ${index + 1}:
- Action: ${step.text}
- Reasoning: ${step.reasoning}
- Tool Used: ${step.tool}
- Instruction: ${step.instruction}
`
  )
  .join("\n")}`
    : ""
}
Determine the immediate next step to take to achieve the goal.`
    },
    ...(screenshot && typeof screenshot === 'string' ? [{
      type: "image" as const,
      image: Buffer.from(screenshot, 'base64')
    }] : []),
    ...(previousExtraction ? [{
      type: "text" as const,
      text: `Previous extraction result: ${JSON.stringify(previousExtraction)}`
    }] : [])
  ];

  const result = await generateObject({
    model: LLMClient,
    schema: z.object({
      text: z.string(),
      reasoning: z.string(),
      tool: z.enum([
        "GOTO",
        "ACT",
        "EXTRACT",
        "OBSERVE",
        "CLOSE",
        "WAIT",
        "NAVBACK",
      ]),
      instruction: z.string(),
    }),
    messages: [{ role: "user", content }],
  });

  return {
    result: result.object,
    previousSteps: [...previousSteps, result.object],
  };
}

export async function getClosestRegion(timezone?: string): Promise<BrowserbaseRegion> {
  try {
    if (!timezone) {
      return "us-west-2"; // Default if no timezone provided
    }

    // Check exact matches first
    if (timezone in exactTimezoneMap) {
      return exactTimezoneMap[timezone];
    }

    // Check prefix matches
    const prefix = timezone.split("/")[0];
    if (prefix in prefixToRegion) {
      return prefixToRegion[prefix];
    }

    // Use offset-based fallback
    const date = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    const timeString = formatter.format(date);
    const testDate = new Date(timeString);
    const hourOffset = (testDate.getTime() - date.getTime()) / (1000 * 60 * 60);

    const matchingRange = offsetRanges.find(
      (range) => hourOffset >= range.min && hourOffset <= range.max
    );

    return matchingRange?.region ?? "us-west-2";
  } catch {
    return "us-west-2";
  }
}

export async function createSession(timezone?: string, contextId?: string, options?: { keepAlive?: boolean }) {
  const browserSettings: { 
    context?: { id: string; persist: boolean };
    timeout?: number;
    keepAliveInterval?: number;
  } = {};
  
  if (contextId) {
    browserSettings.context = { id: contextId, persist: true };
  } else {
    const context = await bb.contexts.create({
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
    });
    browserSettings.context = { id: context.id, persist: true };
  }

  // Add timeout and keepalive settings
  browserSettings.timeout = 300000; // 5 minutes
  browserSettings.keepAliveInterval = 30000; // 30 seconds

  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    browserSettings,
    keepAlive: options?.keepAlive ?? true,
    region: await getClosestRegion(timezone),
  });

  const debugInfo = await bb.sessions.debug(session.id);

  return {
    sessionId: session.id,
    sessionUrl: debugInfo.debuggerFullscreenUrl,
    contextId: browserSettings.context?.id,
  };
}

export async function saveBrowserDocument({
  sessionId,
  title,
  chatId,
  documentId
}: {
  sessionId: string;
  title: string;
  chatId: string;
  documentId: string;
}) {
  return await saveDocument({
    id: documentId,
    title,
    kind: 'browser',
    content: sessionId, // Store just the session ID
    chatId,
  });
}

export async function endSession(sessionId: string) {
  await bb.sessions.update(sessionId, {
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    status: "REQUEST_RELEASE",
  });
}

export async function getRecordingEvents(sessionId: string) {
  try {
    const recording = await bb.sessions.recording.retrieve(sessionId);
    if (!recording || recording.length === 0) {
      throw new Error('Recording not available');
    }
    console.log("getRecordingEvents", recording)
    // The recording endpoint returns an array of recording events
    // Each event has a data property that contains the recording URL
    return recording;
  } catch (error) {
    console.error('[getRecordingEvents] Error fetching recording:', error);
    throw error;
  }
}

export async function executeStep(sessionId: string, step: BrowserStep) {
  try {
    const stagehand = new Stagehand({
      browserbaseSessionID: sessionId,
      env: "BROWSERBASE",
      logger: () => {}
    });
    await stagehand.init();

    const extraction = await runStagehand({
      sessionID: sessionId,
      method: step.tool,
      instruction: step.instruction,
    });

    return { success: true, extraction };
  } catch (error) {
    return { success: false, error };
  }
}

export async function getNextStep(sessionId: string, goal: string, previousSteps: BrowserStep[] = []) {
  // For the first step, select a starting URL
  if (previousSteps.length === 0) {
    const { url, reasoning } = await selectStartingUrl(goal);
    return {
      text: `Navigating to ${url}`,
      reasoning,
      tool: "GOTO" as const,
      instruction: url,
    };
  }

  // For subsequent steps, use LLM to determine next action
  const { result } = await sendPrompt({
    goal,
    sessionID: sessionId,
    previousSteps,
  });

  return result;
} 