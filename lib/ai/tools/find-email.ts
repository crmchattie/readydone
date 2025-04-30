import { tool } from 'ai';
import { z } from 'zod';
import { findEmailsByDomain, extractDomain } from '@/lib/hunter/email';

export const findEmail = tool({
  description: 'Find email addresses associated with a website or domain using Hunter API',
  parameters: z.object({
    website: z.string().describe('The website URL or domain to find emails for'),
    department: z.string().optional().describe('Target department (e.g., "sales") to find emails for'),
  }),
  execute: async ({ website, department }) => {
    try {
      // Extract domain from website URL if needed
      const domain = extractDomain(website);
      
      // Search for emails
      const emails = await findEmailsByDomain({
        domain,
        department
      });

      if (emails.length === 0) {
        return `No email addresses found for ${domain}.`;
      }

      return `Found ${emails.length} email(s) for ${domain}:\n\n${emails
        .map((email, index) => `${index + 1}. ${email}`)
        .join('\n')}`;
    } catch (error) {
      console.error('Failed to find emails:', error);
      throw error;
    }
  },
}); 