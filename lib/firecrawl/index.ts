import FirecrawlApp from '@mendable/firecrawl-js';
import { z } from 'zod';

interface SearchOptions {
  query: string;
  limit?: number;
  lang?: string;
  country?: string;
  tbs?: string;
  scrapeOptions?: {
    formats?: ('markdown' | 'html' | 'links')[];
  };
}

interface ScrapeOptions {
  url: string;
  formats?: ('markdown' | 'html' | 'rawHtml' | 'screenshot' | 'screenshot@fullPage' | 'links' | 'json')[];
  jsonOptions?: {
    schema?: z.ZodType<any>;
    systemPrompt?: string;
    prompt?: string;
  };
  location?: {
    country?: string;
    languages?: string[];
  };
  actions?: Array<
    | { type: 'wait'; milliseconds?: number; selector?: string }
    | { type: 'click'; selector: string; all?: boolean }
    | { type: 'screenshot'; fullPage?: boolean }
    | { type: 'write'; text: string; selector?: string }
    | { type: 'press'; key: string }
    | { type: 'scrape' }
  >;
}

interface SearchResult {
  title: string;
  url: string;
  description: string;
  markdown?: string;
  html?: string;
  links?: string[];
}

interface ScrapeResult {
  markdown?: string;
  html?: string;
  rawHtml?: string;
  screenshot?: string;
  links?: string[];
  json?: Record<string, any>;
  metadata: {
    title: string;
    description: string;
    language: string;
    keywords: string;
    robots: string;
    ogTitle: string;
    ogDescription: string;
    ogUrl: string;
    ogImage: string;
    ogLocaleAlternate: string[];
    ogSiteName: string;
    sourceURL: string;
    statusCode: number;
  };
}

export class FirecrawlClient {
  private client: FirecrawlApp;

  constructor(apiKey: string) {
    this.client = new FirecrawlApp({ apiKey });
  }

  async search({
    query,
    limit = 5,
    lang,
    country,
    tbs,
    scrapeOptions = { formats: ['markdown', 'links'] },
  }: SearchOptions): Promise<SearchResult[]> {
    try {
      const searchResult = await this.client.search(query, {
        limit,
        lang,
        country,
        tbs,
        scrapeOptions,
      });

      return searchResult.data
        .map((doc) => ({
          title: doc.title || '',
          url: doc.url || '',
          description: doc.description || '',
          markdown: doc.markdown,
          links: doc.links,
        }))
        .filter((result) => result.title && result.url && result.description);
    } catch (error) {
      console.error('Firecrawl search error:', error);
      throw new Error('Failed to perform web search');
    }
  }

  async scrape({
    url,
    formats = ['markdown', 'html'],
    jsonOptions,
    location,
    actions,
  }: ScrapeOptions): Promise<ScrapeResult> {
    try {
      const scrapeResult = await this.client.scrapeUrl(url, {
        formats,
        jsonOptions,
        location,
        actions,
      });

      if ('error' in scrapeResult) {
        throw new Error(scrapeResult.error);
      }

      return scrapeResult as ScrapeResult;
    } catch (error) {
      console.error('Firecrawl scrape error:', error);
      throw new Error('Failed to scrape URL');
    }
  }
}

// Create a singleton instance
let instance: FirecrawlClient | null = null;

export function getFirecrawlClient(): FirecrawlClient {
  if (!instance) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY environment variable is not set');
    }
    instance = new FirecrawlClient(apiKey);
  }
  return instance;
}
