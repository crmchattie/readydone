import axios, { isAxiosError } from 'axios';
import { HunterResponse } from '../db/types';

const HUNTER_API_KEY = process.env.HUNTER_API_KEY;

if (!HUNTER_API_KEY) {
  throw new Error('HUNTER_API_KEY environment variable is not set');
}

export enum Department {
  EXECUTIVE = 'executive',
  IT = 'it',
  FINANCE = 'finance',
  MANAGEMENT = 'management',
  SALES = 'sales',
  LEGAL = 'legal',
  SUPPORT = 'support',
  HR = 'hr',
  MARKETING = 'marketing',
  COMMUNICATION = 'communication',
  EDUCATION = 'education',
  DESIGN = 'design',
  HEALTH = 'health',
  OPERATIONS = 'operations'
}

interface EmailSearchOptions {
  domain: string;
  minConfidence?: number;
  department?: Department;
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
    
    // Filter emails based on department if specified
    const filteredEmails = data.data.emails
      .filter(email => 
        (!department || email.department === department) && 
        email.confidence >= minConfidence
      )
      .sort((a, b) => b.confidence - a.confidence)
      .map(email => email.value);

    if (filteredEmails.length > 0) {
      console.log(`Hunter API: Found ${filteredEmails.length} email(s) matching criteria:`);
      filteredEmails.forEach((email, index) => {
        console.log(`  ${index + 1}. ${email}`);
      });
    } else {
      console.log('Hunter API: No emails found matching the specified criteria');
    }
    
    return filteredEmails;
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
    // If the input doesn't start with http:// or https://, add https://
    const urlWithProtocol = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;
    
    const domain = new URL(urlWithProtocol).hostname;
    const cleanDomain = domain.startsWith('www.') ? domain.slice(4) : domain;
    console.log(`Hunter API: Extracted domain "${cleanDomain}"`);
    return cleanDomain;
  } catch (error) {
    console.error(`Hunter API: Failed to parse URL "${url}" - using as is:`, error);
    return url;
  }
} 