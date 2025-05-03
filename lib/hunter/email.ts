import axios, { isAxiosError } from 'axios';
import { HunterResponse } from '../db/types';

const HUNTER_API_KEY = process.env.HUNTER_API_KEY;

if (!HUNTER_API_KEY) {
  throw new Error('HUNTER_API_KEY environment variable is not set');
}

interface EmailSearchOptions {
  domain: string;
  minConfidence?: number;
  department?: string;
}

/**
 * Find email addresses for a domain using Hunter API
 * @param options Search options including domain and filters
 */
export async function findEmailsByDomain(options: EmailSearchOptions): Promise<string[]> {
  const { domain, minConfidence = 0, department } = options;
  
  console.log(`Hunter API: Searching emails for domain "${domain}"`);
  console.log(`Hunter API: Filters - department: ${department || 'any'}, minConfidence: ${minConfidence}%`);
  
  try {
    console.log('Hunter API: Making API request...');
    const response = await axios.get(
      `https://api.hunter.io/v2/domain-search?domain=${domain}&limit=25&api_key=${HUNTER_API_KEY}`
    );

    const data = response.data as HunterResponse;
    console.log(`Hunter API: Found ${data.data.emails.length} total email(s) for domain`);
    
    if (data.data.emails.length > 0) {
      console.log('Hunter API: Email details:');
      data.data.emails.forEach((email, index) => {
        console.log(`  ${index + 1}. ${email.value}`);
        console.log(`     Department: ${email.department || 'unknown'}`);
        console.log(`     Confidence: ${email.confidence}%`);
      });
    }
    
    // First try to find sales department emails
    let salesEmails = data.data.emails
      .filter(email => 
        email.department === 'sales' && 
        email.confidence >= minConfidence
      )
      .sort((a, b) => b.confidence - a.confidence)
      .map(email => email.value);

    if (salesEmails.length > 0) {
      console.log('Hunter API: Found sales department emails:');
      salesEmails.forEach((email, index) => {
        console.log(`  ${index + 1}. ${email}`);
      });
      return salesEmails;
    }

    console.log('Hunter API: No sales department emails found, falling back to highest confidence emails');
    
    // If no sales emails found, return highest confidence emails
    const highConfidenceEmails = data.data.emails
      .filter(email => email.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .map(email => email.value);
    
    if (highConfidenceEmails.length > 0) {
      console.log('Hunter API: Final sorted emails by confidence:');
      highConfidenceEmails.forEach((email, index) => {
        console.log(`  ${index + 1}. ${email}`);
      });
    }
    
    return highConfidenceEmails;
  } catch (error) {
    if (isAxiosError(error)) {
      console.error('Hunter API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.error(`Hunter API: Unexpected error for domain ${domain}:`, error);
    }
    return [];
  }
}

/**
 * Extract domain from a website URL
 */
export function extractDomain(url: string): string {
  console.log(`Hunter API: Extracting domain from URL "${url}"`);
  try {
    const domain = new URL(url).hostname;
    const cleanDomain = domain.startsWith('www.') ? domain.slice(4) : domain;
    console.log(`Hunter API: Extracted domain "${cleanDomain}"`);
    return cleanDomain;
  } catch (error) {
    console.error(`Hunter API: Failed to parse URL "${url}" - using as is:`, error);
    return url;
  }
} 