import { tool } from 'ai';
import { z } from 'zod';
import { searchPlaces } from '@/lib/places';
import { getCoordinatesFromAddress } from '@/lib/places/geocoding';
import { Place } from '@/lib/db/types';

// Debug helper
const debug = (message: string, data?: any) => {
  console.debug(`[Find Phone Tool] ${message}`, data ? data : '');
};

export const findPhone = tool({
  description: 'Find phone numbers and business hours for businesses using Google Places API',
  parameters: z.object({
    business: z.string().describe('The business name to find phone numbers for'),
    location: z.string().describe('The location or address to search in (e.g., "New York, NY")'),
    limit: z.number().optional().describe('Maximum number of results to return'),
  }),
  execute: async ({ business, location, limit = 5 }) => {
    debug('Starting phone number search', { business, location, limit });
    
    try {
      debug('Getting coordinates for location');
      const { latitude, longitude } = await getCoordinatesFromAddress(location);
      debug('Coordinates obtained', { latitude, longitude });
      
      debug('Searching for business');
      const results = await searchPlaces({
        query: business,
        latitude,
        longitude,
        radius: 5000, // 5km radius for more precise results
      });
      debug('Search completed', { 
        totalPlaces: results.places?.length || 0,
        hasResults: !!results.places && results.places.length > 0 
      });

      if (!results.places || results.places.length === 0) {
        debug('No results found');
        return `No phone numbers found for "${business}" in ${location}.`;
      }

      debug('Filtering places with phone numbers');
      const placesWithPhones = results.places
        .filter(place => place.phoneNumber)
        .slice(0, limit);
      debug('Filtered results', { 
        totalWithPhones: placesWithPhones.length,
        limitApplied: limit 
      });

      if (placesWithPhones.length === 0) {
        debug('No places with phone numbers found');
        return `Found ${results.places.length} locations for "${business}" in ${location}, but none have phone numbers listed.`;
      }

      debug('Formatting results');
      const formattedResults = `Found ${placesWithPhones.length} phone number(s) for "${business}" in ${location}:\n\n${placesWithPhones
        .map((place, index) => {
          const hoursInfo = place.opening_hours
            ? `\n   🕒 Hours: ${formatOpeningHours(place.opening_hours)}`
            : '\n   🕒 Hours: Not available';
            
          return `${index + 1}. ${place.title}\n   📞 ${place.phoneNumber}\n   📍 ${place.address}${hoursInfo}`;
        })
        .join('\n\n')}`;

      debug('Search completed successfully');
      return formattedResults;
    } catch (error) {
      debug('Phone number search failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      console.error('Failed to find phone numbers:', error);
      throw error;
    }
  },
});

function formatOpeningHours(hours: Place['opening_hours']): string {
  debug('Formatting opening hours', { hasHours: !!hours?.weekday_text?.length });
  if (!hours?.weekday_text?.length) {
    return 'Not available';
  }
  return hours.weekday_text.join(', ');
} 