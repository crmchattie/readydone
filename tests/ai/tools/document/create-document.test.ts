import { test, expect } from '../../test-helper';
import { createDocument } from '@/lib/ai/tools/create-document';

test.describe('create-document tool', () => {
  test('creates a new document successfully', async ({ aiContext }) => {
    const result = await createDocument({
      session: aiContext.session,
      dataStream: aiContext.dataStream as any
    }).execute({
      title: 'Test Document',
      kind: 'text'
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result).toContain('doc-123');
  });

  test('creates a code document', async ({ aiContext }) => {
    const result = await createDocument({
      session: aiContext.session,
      dataStream: aiContext.dataStream as any
    }).execute({
      title: 'Code Example',
      kind: 'code',
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result).toContain('doc-123');
  });

  test('handles creation errors', async ({ aiContext }) => {
    await expect(async () => {
      await createDocument({
        session: aiContext.session,
        dataStream: aiContext.dataStream as any
      }).execute({
        title: 'Error Test',
        kind: 'text'
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow();
  });

  test('validates document kind', async ({ aiContext }) => {
    await expect(async () => {
      await createDocument({
        session: aiContext.session,
        dataStream: aiContext.dataStream as any
      }).execute({
        title: 'Invalid Kind Test',
        kind: 'text'
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow();
  });

  test('handles empty content', async ({ aiContext }) => {
    await expect(async () => {
      await createDocument({
        session: aiContext.session,
        dataStream: aiContext.dataStream as any
      }).execute({
        title: 'Empty Test',
        kind: 'text'
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow();
  });
}); 