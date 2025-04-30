import { tool } from 'ai';
import { z } from 'zod';
import { getFirecrawlClient } from '@/lib/firecrawl';

export const searchWeb = tool({
  description: 'Search the web for information using Firecrawl\'s search API',
  parameters: z.object({
    query: z.string().describe('The search query to find information about'),
    limit: z.number().optional().describe('Maximum number of results to return (default: 5)'),
    lang: z.string().optional().describe('Language code for search results (e.g., "en", "es")'),
    country: z.string().optional().describe('Country code for search results (e.g., "us", "uk")'),
    tbs: z.string().optional().describe('Time-based search filter (e.g., "qdr:w" for past week)'),
    includeContent: z.boolean().optional().describe('Whether to include scraped content (default: true)'),
  }),
  execute: async ({ query, limit = 5, lang, country, tbs, includeContent = true }) => {
    try {
      const client = getFirecrawlClient();
      const results = await client.search({
        query,
        limit,
        lang,
        country,
        tbs,
        scrapeOptions: includeContent ? { formats: ['markdown', 'links'] } : undefined,
      });

      if (results.length === 0) {
        return 'No search results found.';
      }

      return `Search results for "${query}":\n\n${results
        .map((result, index) => {
          let content = `${index + 1}. ${result.title}\n   URL: ${result.url}\n   Description: ${result.description}\n`;
          
          if (includeContent) {
            if (result.markdown) {
              content += `   Content Preview: ${result.markdown.substring(0, 150)}...\n`;
            }
            if (result.links && result.links.length > 0) {
              content += `   Links: ${result.links.slice(0, 3).join(', ')}...\n`;
            }
          }
          
          return content;
        })
        .join('\n')}`;
    } catch (error) {
      console.error('Failed to perform web search:', error);
      throw error;
    }
  },
}); 