import { test, expect } from '../../test-helper';
import { storeMemory, retrieveMemory } from '@/lib/ai/tools/with-memory';

test.describe('memory tools', () => {
  const testMessages = [
    { id: '1', role: 'user', parts: ['Remember this: test information'] },
    { id: '2', role: 'assistant', parts: ['I will remember that.'] }
  ];

  test('stores new memory successfully', async ({ aiContext }) => {
    const result = await storeMemory({
      chatId: 'test-chat',
      messages: testMessages as any,
      userId: aiContext.session.user.id
    }).execute({
      prompt: 'Remember this test information'
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result).toContain('Memory stored');
  });

  test('retrieves stored memory', async ({ aiContext }) => {
    // First store a memory
    await storeMemory({
      chatId: 'test-chat',
      messages: testMessages as any,
      userId: aiContext.session.user.id
    }).execute({
      prompt: 'Remember this test information'
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    const result = await retrieveMemory({
      chatId: 'test-chat',
      messages: testMessages as any,
      userId: aiContext.session.user.id
    }).execute({
      query: 'test information'
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result).toContain('Relevant memories');
  });

  test('handles empty memory retrieval', async ({ aiContext }) => {
    const result = await retrieveMemory({
      chatId: 'empty-chat',
      messages: [],
      userId: aiContext.session.user.id
    }).execute({
      query: 'nonexistent information'
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result).toContain('No relevant memories found');
  });

  test('merges similar memories', async ({ aiContext }) => {
    // Store first memory
    await storeMemory({
      chatId: 'test-chat',
      messages: testMessages as any,
      userId: aiContext.session.user.id
    }).execute({
      prompt: 'User likes pizza'
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    const result = await storeMemory({
      chatId: 'test-chat',
      messages: testMessages as any,
      userId: aiContext.session.user.id
    }).execute({
      prompt: 'User prefers pepperoni pizza'
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result).toContain('Updated existing memory');
  });

  test('handles memory storage errors', async ({ aiContext }) => {
    await expect(async () => {
      await storeMemory({
        chatId: 'error-chat',
        messages: testMessages as any,
        userId: aiContext.session.user.id
      }).execute({
        prompt: 'error trigger'
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow();
  });

  test('handles memory retrieval errors', async ({ aiContext }) => {
    await expect(async () => {
      await retrieveMemory({
        chatId: 'error-chat',
        messages: testMessages as any,
        userId: aiContext.session.user.id
      }).execute({
        query: 'error trigger'
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow();
  });
}); 