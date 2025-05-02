import { test, expect } from '../../test-helper';
import { searchWeb } from '@/lib/ai/tools/search-web';

test.describe('search-web tool', () => {
  test('returns valid search results', async ({ aiContext }) => {
    const result = await searchWeb.execute({
      query: 'test query',
      limit: 5
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });
    
    expect(result).toContain('Search results for "test query"');
    expect(result).toContain('Test Result');
    expect(result).toContain('https://test.com');
  });

  test('handles empty results', async ({ aiContext }) => {
    const result = await searchWeb.execute({
      query: 'no results query',
      limit: 5
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });
    
    expect(result).toBe('No search results found.');
  });

  test('respects result limit', async ({ aiContext }) => {
    const result = await searchWeb.execute({
      query: 'test query',
      limit: 1
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });
    
    const matches = result.match(/\d+\./g);
    expect(matches?.length).toBe(1);
  });

  test('includes content preview when requested', async ({ aiContext }) => {
    const result = await searchWeb.execute({
      query: 'test query',
      includeContent: true
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });
    
    expect(result).toContain('Content Preview:');
    expect(result).toContain('Test content');
  });

  test('excludes content preview when not requested', async ({ aiContext }) => {
    const result = await searchWeb.execute({
      query: 'test query',
      includeContent: false
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });
    
    expect(result).not.toContain('Content Preview:');
  });

  test('handles search errors gracefully', async ({ aiContext }) => {
    await expect(async () => {
      await searchWeb.execute({
        query: 'error trigger',
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow();
  });
}); 