import { test, expect } from '@/tests/ai/test-helper';
import type { TestContext } from '@/tests/ai/types';

test('finds phone number successfully', async ({ aiContext }: { aiContext: TestContext }) => {
  const result = await aiContext.findPhone({
    business: 'Example Business',
    location: 'San Francisco, CA'
  });
  expect(result).toContain('Found 1 phone number(s) for "Example Business" in San Francisco, CA');
  expect(result).toContain('📞');
});

test('handles no phone found', async ({ aiContext }: { aiContext: TestContext }) => {
  const result = await aiContext.findPhone({
    business: 'Nonexistent Business',
    location: 'San Francisco, CA'
  });
  expect(result).toBe('No phone numbers found for "Nonexistent Business" in San Francisco, CA.');
});

test('validates location format', async ({ aiContext }: { aiContext: TestContext }) => {
  await expect(aiContext.findPhone({
    business: 'Example Business',
    location: ''
  })).rejects.toThrow();
});

test('handles search errors', async ({ aiContext }: { aiContext: TestContext }) => {
  await expect(aiContext.findPhone({
    business: 'Error Business',
    location: 'Error Location'
  })).rejects.toThrow();
});

test('finds multiple phone numbers', async ({ aiContext }: { aiContext: TestContext }) => {
  const result = await aiContext.findPhone({
    business: 'Chain Business',
    location: 'San Francisco, CA',
    limit: 3
  });
  expect(result).toContain('Found 3 phone number(s) for "Chain Business" in San Francisco, CA');
  expect(result).toContain('1.');
  expect(result).toContain('2.');
  expect(result).toContain('3.');
});

test('respects result limit', async ({ aiContext }: { aiContext: TestContext }) => {
  const result = await aiContext.findPhone({
    business: 'Chain Business',
    location: 'San Francisco, CA',
    limit: 2
  });
  expect(result).toContain('Found 2 phone number(s) for "Chain Business" in San Francisco, CA');
  expect(result).toContain('1.');
  expect(result).toContain('2.');
}); 