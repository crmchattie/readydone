import { test, expect } from '../../test-helper';
import { callPhone } from '@/lib/ai/tools/call-phone';

test.describe('call-phone tool', () => {
  test('initiates call successfully', async ({ aiContext }) => {
    const result = await callPhone.execute({
      phoneNumber: '+1234567890',
      messages: ['This is a test call'],
      chatId: 'test-chat',
      earliestAt: new Date().toISOString(),
      latestAt: new Date(Date.now() + 3600000).toISOString()
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result.message).toContain('Call initiated successfully');
  });

  test('validates phone numbers', async ({ aiContext }) => {
    await expect(async () => {
      await callPhone.execute({
        phoneNumber: 'invalid-number',
        messages: ['This is a test call'],
        chatId: 'test-chat'
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow();
  });

  test('requires message and purpose', async ({ aiContext }) => {
    await expect(async () => {
      await callPhone.execute({
        phoneNumber: '+1234567890',
        messages: [''],
        chatId: 'test-chat'
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow();
  });

  test('handles call service errors', async ({ aiContext }) => {
    await expect(async () => {
      await callPhone.execute({
        phoneNumber: '+9999999999',
        messages: ['This should trigger an error'],
        chatId: 'test-chat'
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow();
  });

  test('supports international numbers', async ({ aiContext }) => {
    const result = await callPhone.execute({
      phoneNumber: '+44123456789',
      messages: ['International test call'],
      chatId: 'test-chat'
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result.message).toContain('Call initiated successfully');
  });

  test('handles scheduling', async ({ aiContext }) => {
    const result = await callPhone.execute({
      phoneNumber: '+1234567890',
      messages: ['Test call with scheduling'],
      chatId: 'test-chat',
      earliestAt: new Date().toISOString(),
      latestAt: new Date(Date.now() + 3600000).toISOString()
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result.message).toContain('Call initiated successfully');
  });
}); 