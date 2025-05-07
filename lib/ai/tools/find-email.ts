import { tool } from 'ai';
import { z } from 'zod';
import { findEmailsByDomain, extractDomain } from '@/lib/hunter/email';

// Debug helper
const debug = (message: string, data?: any) => {
  console.debug(`[Find Email Tool] ${message}`, data ? data : '');
};

export const findEmail = tool({
  description: 'Find email addresses associated with a website or domain using Hunter API',
  parameters: z.object({
    website: z.string().describe('The website URL or domain to find emails for'),
    department: z.string().optional().describe('Target department (e.g., "sales") to find emails for'),
  }),
  execute: async ({ website, department }) => {
    debug('Starting email search', { website, department });
    
    try {
      debug('Extracting domain from website');
      const domain = extractDomain(website);
      debug('Domain extracted', { domain });
      
      debug('Searching for emails');
      const emails = await findEmailsByDomain({
        domain,
        department
      });
      debug('Email search completed', { emailCount: emails.length });

      if (emails.length === 0) {
        debug('No emails found');
        return `No email addresses found for ${domain}.`;
      }

      debug('Formatting email results');
      const result = `Found ${emails.length} email(s) for ${domain}:\n\n${emails
        .map((email, index) => `${index + 1}. ${email}`)
        .join('\n')}`;
      
      debug('Email search completed successfully');
      return result;
    } catch (error) {
      debug('Email search failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      console.error('Failed to find emails:', error);
      throw error;
    }
  },
}); 