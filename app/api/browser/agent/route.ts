import { NextResponse } from 'next/server';
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
      case 'START': {
        if (!goal) {
          return NextResponse.json(
            { error: 'Goal is required for START' },
            { status: 400 }
          );
        }
        
        // Get and execute first step
        const firstStep = await getNextStep(sessionId, goal, []);
        const result = await executeStep(sessionId, firstStep);
        
        return NextResponse.json({
          success: true,
          result: firstStep,
          extraction: result.extraction,
          steps: [firstStep],
          done: firstStep.tool === 'CLOSE'
        });
      }

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
          steps: [...previousSteps, nextStep],
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
          extraction: result.extraction,
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