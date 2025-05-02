import { test as base } from '@playwright/test';
import { createAuthenticatedContext } from '../auth-helper';
import { mockResponses } from './mocks/responses';
import { MockDataStream } from './mocks/data-stream';
import { TestContext } from './types';

// Extend the test context with AI tool specific utilities
export const test = base.extend<{
  aiContext: TestContext;
}>({
  aiContext: async ({ browser }, use) => {
    const userContext = await createAuthenticatedContext({
      browser,
      name: 'ai-tools-test',
    });

    const mockDataStream = new MockDataStream();

    const testContext: TestContext = {
      session: {
        ...userContext,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      dataStream: mockDataStream,
    };

    await use(testContext);
  },
});

export { expect } from '@playwright/test';
export { mockResponses }; 