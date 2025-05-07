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
        formats: ['markdown', 'html'],
      });
      debug('Scrape completed', { 
        hasMarkdown: !!result.markdown,
        hasHtml: !!result.html,
        hasMetadata: !!result.metadata
      });

      debug('Scrape successful');
      return {
        markdown: result.markdown,
        html: result.html,
        metadata: result.metadata,
      };
    } catch (error) {
      debug('Website scrape failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      console.error('Failed to scrape website:', error);
      throw error;
    }
  },
}); 