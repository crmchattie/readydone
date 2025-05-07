import { tool } from 'ai';
import { z } from 'zod';
import { getFirecrawlClient } from '@/lib/firecrawl';
import { RateLimiter } from '@/lib/utils';

interface FirecrawlError {
  statusCode?: number;
  message: string;
}

// Debug helper
const debug = (message: string, data?: any) => {
  console.debug(`[Search Web Tool] ${message}`, data ? data : '');
};

// Create a singleton rate limiter instance (6 requests per minute)
const rateLimiter = new RateLimiter({ maxRequests: 6, perSeconds: 60 });

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
    debug('Starting web search', { query, limit, lang, country, tbs, includeContent });
    
    try {
      debug('Waiting for rate limit token');
      await rateLimiter.waitForToken();
      debug('Rate limit token acquired');

      debug('Initializing Firecrawl client');
      const client = getFirecrawlClient();

      debug('Executing search request');
      const results = await client.search({
        query,
        limit,
        lang,
        country,
        tbs,
        scrapeOptions: includeContent ? { formats: ['markdown', 'links'] } : undefined,
      });
      debug('Search completed', { resultCount: results.length });

      if (results.length === 0) {
        debug('No results found');
        return 'No search results found.';
      }

      debug('Processing search results');
      const formattedResults = `Search results for "${query}":\n\n${results
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
      
      debug('Results formatted successfully');
      return formattedResults;
    } catch (error) {
      const firecrawlError = error as FirecrawlError;
      if (firecrawlError.statusCode === 429) {
        debug('Rate limit exceeded');
        return 'Rate limit reached. Please try again in a minute.';
      }
      console.error('Failed to perform web search:', error);
      throw error;
    }
  },
}); 