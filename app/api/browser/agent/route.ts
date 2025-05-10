import { NextResponse } from 'next/server';
import { BrowserStep } from '@/lib/db/types';
import { executeStep, getNextStep } from '@/lib/browserbase/service';

export async function POST(request: Request) {
  try {
    const { sessionId, action, step, goal, previousSteps = [] } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'GET_NEXT_STEP': {
        if (!goal) {
          return NextResponse.json(
            { error: 'Goal is required for GET_NEXT_STEP' },
            { status: 400 }
          );
        }
        
        const nextStep = await getNextStep(sessionId, goal, previousSteps);
        return NextResponse.json({
          success: true,
          result: nextStep,
          done: nextStep.tool === 'CLOSE'
        });
      }

      case 'EXECUTE_STEP': {
        if (!step) {
          return NextResponse.json(
            { error: 'Step is required for EXECUTE_STEP' },
            { status: 400 }
          );
        }
        
        const result = await executeStep(sessionId, step);
        return NextResponse.json({
          success: true,
          ...result,
          done: step.tool === 'CLOSE'
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in agent route:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 