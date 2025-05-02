import { test, expect } from '../../test-helper';
import { findEmail } from '@/lib/ai/tools/find-email';

test.describe('find-email tool', () => {
  test('finds email successfully', async ({ aiContext }) => {
    const result = await findEmail.execute({
      website: 'https://test.com',
      department: 'sales'
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result).toContain('test@example.com');
    expect(result).toContain('confidence: 0.9');
  });

  test('handles no email found', async ({ aiContext }) => {
    const result = await findEmail.execute({
      website: 'https://no-email.com',
      department: 'support'
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result).toBe('No email address found.');
  });

  test('validates URL format', async ({ aiContext }) => {
    await expect(async () => {
      await findEmail.execute({
        website: 'invalid-url',
        department: 'marketing'
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow();
  });

  test('handles search errors', async ({ aiContext }) => {
    await expect(async () => {
      await findEmail.execute({
        website: 'https://error.com',
        department: 'engineering'
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow();
  });

  test('finds multiple email addresses', async ({ aiContext }) => {
    const result = await findEmail.execute({
      website: 'https://multiple-emails.com',
      department: 'hr'
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result).toContain('Found multiple email addresses');
    expect(result).toContain('primary@example.com');
    expect(result).toContain('secondary@example.com');
  });

  test('respects search depth parameter', async ({ aiContext }) => {
    const result = await findEmail.execute({
      website: 'https://deep-site.com',
      department: 'executive'
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result).toContain('Searched 2 levels deep');
  });
}); 