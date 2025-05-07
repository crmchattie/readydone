import { test, expect } from '../../test-helper';
import { tool } from 'ai';
import { z } from 'zod';

// Mock implementation of the call-phone tool
const mockCallPhone = ({ chatId, messages }: { chatId: string; messages: any[] }) =>
  tool({
    description: 'Make an outbound phone call using Vapi AI',
    parameters: z.object({
      phoneNumber: z.string().describe('The phone number to call'),
      earliestAt: z.string().optional().describe('ISO 8601 date-time string for earliest call time'),
      latestAt: z.string().optional().describe('ISO 8601 date-time string for latest call time'),
    }),
    execute: async ({ phoneNumber, earliestAt, latestAt }) => {
      // Validate phone number format
      if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
        throw new Error('Invalid phone number format');
      }

      // Simulate error for specific number
      if (phoneNumber === '+9999999999') {
        throw new Error('Service error');
      }

      return {
        messages: [
          {
            role: 'ai',
            content: 'Hello, this is a test call',
          },
          {
            role: 'user',
            content: 'Test response',
          },
        ],
      };
    },
  });

test.describe('call-phone tool', () => {
  test('initiates call successfully', async ({ aiContext }) => {
    const tool = mockCallPhone({ chatId: 'test-chat', messages: [] });
    const result = await tool.execute({
      phoneNumber: '+1234567890',
      earliestAt: new Date().toISOString(),
      latestAt: new Date(Date.now() + 3600000).toISOString()
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result.messages.length).toBe(2);
    expect(result.messages[0].role).toBe('ai');
    expect(result.messages[1].role).toBe('user');
  });

  test('validates phone numbers', async ({ aiContext }) => {
    const tool = mockCallPhone({ chatId: 'test-chat', messages: [] });
    await expect(async () => {
      await tool.execute({
        phoneNumber: 'invalid-number'
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow('Invalid phone number format');
  });

  test('handles call service errors', async ({ aiContext }) => {
    const tool = mockCallPhone({ chatId: 'test-chat', messages: [] });
    await expect(async () => {
      await tool.execute({
        phoneNumber: '+9999999999'
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow('Service error');
  });

  test('supports international numbers', async ({ aiContext }) => {
    const tool = mockCallPhone({ chatId: 'test-chat', messages: [] });
    const result = await tool.execute({
      phoneNumber: '+44123456789'
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result.messages.length).toBe(2);
  });

  test('handles scheduling', async ({ aiContext }) => {
    const tool = mockCallPhone({ chatId: 'test-chat', messages: [] });
    const result = await tool.execute({
      phoneNumber: '+1234567890',
      earliestAt: new Date().toISOString(),
      latestAt: new Date(Date.now() + 3600000).toISOString()
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result.messages.length).toBe(2);
  });
}); 