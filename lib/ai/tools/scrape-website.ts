import { tool } from 'ai';
import { z } from 'zod';
import { getFirecrawlClient } from '@/lib/firecrawl';

// Debug helper
const debug = (message: string, data?: any) => {
  console.debug(`[Scrape Website Tool] ${message}`, data ? data : '');
};

export const scrapeWebsite = tool({
  description: 'Scrape a website and return its content in markdown and HTML format',
  parameters: z.object({
    url: z.string().describe('The URL of the website to scrape'),
  }),
  execute: async ({ url }) => {
    debug('Starting website scrape', { url });
    
    try {
      debug('Initializing Firecrawl client');
      const client = getFirecrawlClient();

      debug('Executing scrape request');
      const result = await client.scrape({
        url,
        formats: ['markdown'],
      });
      debug('Scrape completed', { 
        hasMarkdown: !!result.markdown,
        hasMetadata: !!result.metadata
      });

      if (!result.markdown) {
        debug('Warning: No markdown content returned');
      }

      debug('Scrape successful');
      return {
        markdown: result.markdown,
        metadata: result.metadata,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      debug('Website scrape failed', { error: errorMessage });
      console.error('Failed to scrape website:', error);
      throw new Error(`Failed to scrape website: ${errorMessage}`);
    }
  },
}); 