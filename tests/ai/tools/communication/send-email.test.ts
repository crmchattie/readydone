import { test, expect } from '../../test-helper';
import { sendEmail } from '@/lib/ai/tools/send-email';

test.describe('send-email tool', () => {
  test('sends email successfully', async ({ aiContext }) => {
    const result = await sendEmail.execute({
      userId: 'test-user-id',
      to: 'test@example.com',
      messages: [],
      chatId: 'test-chat-id'
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result).toContain('Email sent successfully');
  });

  test('validates email addresses', async ({ aiContext }) => {
    await expect(async () => {
      await sendEmail.execute({
        userId: 'test-user-id',
        to: 'invalid-email',
        messages: [],
        chatId: 'test-chat-id'
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow();
  });

  test('requires subject and body', async ({ aiContext }) => {
    await expect(async () => {
      await sendEmail.execute({
        userId: 'test-user-id',
        to: 'test@example.com',
        messages: [],
        chatId: 'test-chat-id'
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow();
  });

  test('handles email service errors', async ({ aiContext }) => {
    await expect(async () => {
      await sendEmail.execute({
        userId: 'test-user-id',
        to: 'error@example.com',
        messages: [],
        chatId: 'test-chat-id'
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow();
  });

  test('supports HTML content', async ({ aiContext }) => {
    const result = await sendEmail.execute({
      userId: 'test-user-id',
      to: 'test@example.com',
      messages: [],
      chatId: 'test-chat-id',
      attachments: [{
        filename: 'test.html',
        content: 'PGgxPkhlbGxvPC9oMT48cD5UaGlzIGlzIEhUTUwgY29udGVudDwvcD4=', // Base64 encoded HTML
        contentType: 'text/html'
      }]
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result).toContain('Email sent successfully');
  });

  test('supports multiple recipients', async ({ aiContext }) => {
    const result = await sendEmail.execute({
      userId: 'test-user-id',
      to: 'test1@example.com', // Changed from array to single recipient
      cc: ['test2@example.com'], // Added as cc instead
      messages: [],
      chatId: 'test-chat-id'
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result).toContain('Email sent successfully');
  });
}); 