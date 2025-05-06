import { test as base } from '@playwright/test';
import { createAuthenticatedContext } from '../auth-helper';
import { TestContext } from './types';
import { DataStreamWriter } from 'ai';

// Real implementation of DataStream that uses actual API
class RealDataStream implements DataStreamWriter {
  private chunks: any[] = [];

  async write(data: string | Uint8Array): Promise<void> {
    if (typeof data === 'string') {
      this.chunks.push(data);
    } else {
      this.chunks.push(new TextDecoder().decode(data));
    }
  }

  async writeData(data: any): Promise<void> {
    this.chunks.push(data);
  }

  async writeMessageAnnotation(value: any): Promise<void> {
    this.chunks.push({ type: 'annotation', value });
  }

  async writeSource(source: any): Promise<void> {
    this.chunks.push({ type: 'source', value: source });
  }

  async merge(stream: ReadableStream<any>): Promise<void> {
    const reader = stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await this.write(value);
      }
    } finally {
      reader.releaseLock();
    }
  }

  onError(error: any): string {
    return error?.toString() || 'Unknown error';
  }

  async close(): Promise<void> {
    // Implement if needed
  }

  getData(): any[] {
    return this.chunks;
  }

  clear(): void {
    this.chunks = [];
  }
}

// Extend the test context with real AI tool utilities
export const realTest = base.extend<{
  aiContext: TestContext;
}>({
  aiContext: async ({ browser }, use) => {
    const userContext = await createAuthenticatedContext({
      browser,
      name: 'ai-tools-real-test',
    });

    const realDataStream = new RealDataStream();

    const testContext: TestContext = {
      session: {
        ...userContext,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      dataStream: realDataStream,
    };

    await use(testContext);
  },
});

export { expect } from '@playwright/test'; 