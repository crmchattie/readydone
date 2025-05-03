import { test, expect } from '../../test-helper';
import { useBrowser } from '@/lib/ai/tools/use-browser';

test.describe('use-browser tool', () => {
  test('successfully navigates and extracts data', async ({ aiContext }) => {
    const result = await useBrowser.execute({
      url: 'https://example.com',
      task: 'Find the main heading and extract its text',
      maxAttempts: 3
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result.success).toBe(true);
    expect(result.actions).toBeInstanceOf(Array);
    expect(result.data).toBeTruthy();
    expect(result.url).toBe('https://example.com');
  });

  test('handles sensitive variables correctly', async ({ aiContext }) => {
    const result = await useBrowser.execute({
      url: 'https://example.com/login',
      task: 'Log in using %username% and %password% then extract the dashboard title',
      variables: {
        username: 'testuser',
        password: 'testpass123'
      },
      maxAttempts: 3
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result.success).toBe(true);
    expect(result.actions.some((action: { action: string }) => action.action.includes('login'))).toBe(true);
  });

  test('respects maxAttempts limit', async ({ aiContext }) => {
    const result = await useBrowser.execute({
      url: 'https://example.com/complex-page',
      task: 'Find an element that does not exist',
      maxAttempts: 2
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result.attempts).toBeLessThanOrEqual(2);
    expect(result.actions.length).toBeLessThanOrEqual(2);
  });

  test('uses custom extraction schema', async ({ aiContext }) => {
    const result = await useBrowser.execute({
      url: 'https://example.com/products',
      task: 'Extract product information from the page',
      extractionSchema: {
        products: {
          type: 'array',
          items: {
            name: 'string',
            price: 'number',
            description: 'string'
          }
        }
      },
      maxAttempts: 3
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('products');
    expect(Array.isArray(result.data.products)).toBe(true);
  });

  test('handles navigation errors gracefully', async ({ aiContext }) => {
    await expect(async () => {
      await useBrowser.execute({
        url: 'https://nonexistent-domain-123456789.com',
        task: 'Extract information from the page',
        maxAttempts: 2
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow();
  });

  test('tracks action history correctly', async ({ aiContext }) => {
    const result = await useBrowser.execute({
      url: 'https://example.com/multi-step',
      task: 'Click the button and extract the revealed content',
      maxAttempts: 5
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result.actions).toBeInstanceOf(Array);
    result.actions.forEach((action: { action: string; reason: string; timestamp: string }) => {
      expect(action).toHaveProperty('action');
      expect(action).toHaveProperty('reason');
      expect(action).toHaveProperty('timestamp');
    });
  });
}); 