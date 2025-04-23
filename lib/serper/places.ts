import axios from 'axios';
import { SerperPlacesResponse } from '../db/types';

const SERPER_API_KEY = process.env.SERP_API_KEY;

if (!SERPER_API_KEY) {
  throw new Error('SERP_API_KEY environment variable is not set');
}

interface SearchPlacesOptions {
  query: string;
  location: string;
  gl?: string; // Google country code
}

/**
 * Search for places using Serper Places API
 * @param options Search options including query and location
 */
export async function searchPlaces(options: SearchPlacesOptions): Promise<SerperPlacesResponse> {
  const { query, location, gl = 'us' } = options;
  
  const data = {
    q: query,
    location,
    gl
  };

  const config = {
    method: 'post',
    url: 'https://google.serper.dev/places',
    headers: { 
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json'
    },
    data
  };

  try {
    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error('Error searching places:', error);
    throw error;
  }
}

/**
 * Convert coordinates to a location string
 */
export function coordsToLocationString(latitude: number, longitude: number, country: string = 'United States'): string {
  return `${latitude},${longitude}, ${country}`;
} 