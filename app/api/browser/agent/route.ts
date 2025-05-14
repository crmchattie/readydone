import { NextResponse } from 'next/server';
import { executeStep, getNextStep } from '@/lib/browserbase/service';
import { BrowserStep } from '@/lib/db/types';

export async function POST(request: Request) {
  let currentStep: BrowserStep | undefined;
  
  try {
    const { sessionId, action, step, goal, previousSteps = [] } = await request.json();
    currentStep = step;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'START': {
        if (!goal) {
          return NextResponse.json(
            { success: false, error: 'Goal is required for START' },
            { status: 400 }
          );
        }
        
        // Get and execute first step
        const firstStep = await getNextStep(sessionId, goal, []);
        currentStep = firstStep;
        const result = await executeStep(sessionId, firstStep);
        
        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: 'Failed to execute first step',
            result: {
              ...firstStep,
              status: 'failed',
              error: result.error
            }
          });
        }
        
        return NextResponse.json({
          success: true,
          result: {
            ...firstStep,
            status: 'completed'
          },
          extraction: result.extraction,
          done: firstStep.tool === 'CLOSE'
        });
      }

      case 'GET_NEXT_STEP': {
        if (!goal) {
          return NextResponse.json(
            { success: false, error: 'Goal is required for GET_NEXT_STEP' },
            { status: 400 }
          );
        }
        
        const nextStep = await getNextStep(sessionId, goal, previousSteps);
        currentStep = nextStep;
        return NextResponse.json({
          success: true,
          result: {
            ...nextStep,
            status: 'pending'
          },
          done: nextStep.tool === 'CLOSE'
        });
      }

      case 'EXECUTE_STEP': {
        if (!step) {
          return NextResponse.json(
            { success: false, error: 'Step is required for EXECUTE_STEP' },
            { status: 400 }
          );
        }
        
        const result = await executeStep(sessionId, step);
        
        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: 'Failed to execute step',
            result: {
              ...step,
              status: 'failed',
              error: result.error
            }
          });
        }
        
        return NextResponse.json({
          success: true,
          result: {
            ...step,
            status: 'completed'
          },
          extraction: result.extraction,
          done: step.tool === 'CLOSE'
        });
      }

      case 'CLOSE': {
        const closeStep: BrowserStep = { 
          tool: 'CLOSE', 
          instruction: '', 
          text: 'Closing browser', 
          reasoning: 'Task completed',
          status: 'pending'
        };
        // Handle closing the browser session
        await executeStep(sessionId, closeStep);
        return NextResponse.json({ 
          success: true, 
          done: true,
          result: {
            ...closeStep,
            text: 'Browser session closed',
            status: 'completed'
          }
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process request',
        result: currentStep ? {
          ...currentStep,
          status: 'failed',
          error: error instanceof Error ? error : new Error('Failed to process request')
        } : undefined
      },
      { status: 500 }
    );
  }
} 