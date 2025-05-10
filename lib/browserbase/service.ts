import { Browserbase } from "@browserbasehq/sdk";
import { BrowserbaseRegion, BrowserStep } from "@/lib/db/types";
import { Stagehand } from "@browserbasehq/stagehand";

// Initialize Browserbase client
const bb = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY!,
});

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

export async function createSession(timezone?: string, contextId?: string) {
  const browserSettings: { context?: { id: string; persist: boolean } } = {};
  
  if (contextId) {
    browserSettings.context = { id: contextId, persist: true };
  } else {
    const context = await bb.contexts.create({
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
    });
    browserSettings.context = { id: context.id, persist: true };
  }

  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    browserSettings,
    keepAlive: true,
    region: await getClosestRegion(timezone),
  });

  const debugInfo = await bb.sessions.debug(session.id);

  return {
    sessionId: session.id,
    sessionUrl: debugInfo.debuggerFullscreenUrl,
    contextId: browserSettings.context?.id,
  };
}

export async function endSession(sessionId: string) {
  await bb.sessions.update(sessionId, {
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    status: "REQUEST_RELEASE",
  });
}

export async function executeStep(sessionId: string, step: BrowserStep) {
  const stagehand = new Stagehand({
    apiKey: process.env.BROWSERBASE_API_KEY!,
    browserbaseSessionID: sessionId,
    env: "BROWSERBASE"
  });
  
  await stagehand.init();
  const page = await stagehand.page;
  
  try {
    switch (step.tool) {
      case 'GOTO':
        await page.goto(step.instruction, {
          waitUntil: "commit",
          timeout: 60000,
        });
        break;
        
      case 'ACT':
        await page.act(step.instruction);
        break;
        
      case 'EXTRACT':
        const data = await page.extract(step.instruction);
        return { data };
        
      case 'OBSERVE':
        return await page.observe(step.instruction);
        
      case 'WAIT':
        await page.waitForTimeout(parseInt(step.instruction));
        break;
        
      case 'NAVBACK':
        await page.goBack();
        break;
        
      case 'CLOSE':
        await stagehand.close();
        break;
        
      default:
        throw new Error(`Unsupported step type: ${step.tool}`);
    }

    return { success: true };
  } catch (error) {
    console.error(`Error executing step ${step.tool}:`, error);
    throw error;
  } finally {
    if (step.tool !== 'CLOSE') {
      await stagehand.close();
    }
  }
}

export async function getNextStep(sessionId: string, goal: string, previousSteps: BrowserStep[]) {
  const stagehand = new Stagehand({
    apiKey: process.env.BROWSERBASE_API_KEY!,
    browserbaseSessionID: sessionId,
    env: "BROWSERBASE"
  });
  
  await stagehand.init();
  const page = await stagehand.page;
  
  try {
    const currentUrl = await page.url();
    const pageState = await page.observe();
    
    // Here you would use an LLM to determine the next step based on:
    // - goal
    // - currentUrl
    // - pageState
    // - previousSteps
    
    // For now, return a simple navigation step
    const nextStep: BrowserStep = {
      text: 'Navigate to example.com',
      reasoning: 'Starting with a simple navigation',
      tool: 'GOTO',
      instruction: 'https://example.com',
      stepNumber: previousSteps.length + 1,
      status: 'running'
    };

    return nextStep;
  } finally {
    await stagehand.close();
  }
} 