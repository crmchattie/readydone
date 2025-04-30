import { tool } from 'ai';
import { z } from 'zod';
import { getFirecrawlClient } from '@/lib/firecrawl';

export const scrapeWebsite = tool({
  description: 'Scrape a website and return its content in markdown and HTML format',
  parameters: z.object({
    url: z.string().describe('The URL of the website to scrape'),
  }),
  execute: async ({ url }) => {
    try {
      const client = getFirecrawlClient();
      const result = await client.scrape({
        url,
        formats: ['markdown', 'html'],
      });

      return {
        markdown: result.markdown,
        html: result.html,
        metadata: result.metadata,
      };
    } catch (error) {
      console.error('Failed to scrape website:', error);
      throw error;
    }
  },
}); 