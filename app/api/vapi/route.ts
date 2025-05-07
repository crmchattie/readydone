import { NextResponse } from 'next/server';
import { saveCallMessages } from '@/lib/ai/tools/call-phone';
import crypto from 'crypto';

// Debug helper
const debug = (message: string, data?: any) => {
  console.debug(`[Vapi Webhook] ${message}`, data ? data : '');
};

function verifyWebhookSignature(payload: string, signature: string | null) {
  if (!signature || !process.env.VAPI_SERVER_SECRET) return false;
  
  const hmac = crypto.createHmac('sha256', process.env.VAPI_SERVER_SECRET);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(request: Request) {
  debug('Received webhook request');
  try {
    const signature = request.headers.get('x-vapi-signature');
    const payload = await request.text();
    
    if (!verifyWebhookSignature(payload, signature)) {
      debug('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(payload);
    debug('Webhook payload', body);

    const { message } = body;
    if (!message) {
      debug('No message in webhook payload');
      return NextResponse.json({ error: 'No message in payload' }, { status: 400 });
    }

    // Handle different message types
    switch (message.type) {
      case 'call.ended':
        debug('Call ended event received', { callId: message.callId });
        break;

      case 'call.started':
        debug('Call started event received', { callId: message.callId });
        break;

      case 'call.failed':
        debug('Call failed event received', { callId: message.callId, error: message.error });
        break;

      case 'function':
        debug('Function call received', { 
          functionName: message.function?.name,
          parameters: message.function?.parameters 
        });
        if (message.function?.name === 'end_call' && message.function?.parameters?.threadId) {
          await saveCallMessages(message.callId, message.function.parameters.threadId);
          debug('Call messages saved successfully');
        }
        break;

      default:
        debug('Unhandled message type', { type: message.type });
    }

    // Return empty response for non-response-requiring messages
    return NextResponse.json({});
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 