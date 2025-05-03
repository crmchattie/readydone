import { tool } from 'ai';
import { z } from 'zod';
import { searchPlaces } from '@/lib/places';
import { getCoordinatesFromAddress } from '@/lib/places/geocoding';
import { Place } from '@/lib/db/types';

export const findPhone = tool({
  description: 'Find phone numbers and business hours for businesses using Google Places API',
  parameters: z.object({
    business: z.string().describe('The business name to find phone numbers for'),
    location: z.string().describe('The location or address to search in (e.g., "New York, NY")'),
    limit: z.number().optional().describe('Maximum number of results to return'),
  }),
  execute: async ({ business, location, limit = 5 }) => {
    try {
      // Get coordinates for the location
      const { latitude, longitude } = await getCoordinatesFromAddress(location);
      
      // Search for the business
      const results = await searchPlaces({
        query: business,
        latitude,
        longitude,
        radius: 5000, // 5km radius for more precise results
      });

      if (!results.places || results.places.length === 0) {
        return `No phone numbers found for "${business}" in ${location}.`;
      }

      // Filter to places with phone numbers and apply limit
      const placesWithPhones = results.places
        .filter(place => place.phoneNumber)
        .slice(0, limit);

      if (placesWithPhones.length === 0) {
        return `Found ${results.places.length} locations for "${business}" in ${location}, but none have phone numbers listed.`;
      }

      return `Found ${placesWithPhones.length} phone number(s) for "${business}" in ${location}:\n\n${placesWithPhones
        .map((place, index) => {
          const hoursInfo = place.opening_hours
            ? `\n   🕒 Hours: ${formatOpeningHours(place.opening_hours)}`
            : '\n   🕒 Hours: Not available';
            
          return `${index + 1}. ${place.title}\n   📞 ${place.phoneNumber}\n   📍 ${place.address}${hoursInfo}`;
        })
        .join('\n\n')}`;
    } catch (error) {
      console.error('Failed to find phone numbers:', error);
      throw error;
    }
  },
});

function formatOpeningHours(hours: Place['opening_hours']): string {
  if (!hours?.weekday_text?.length) {
    return 'Not available';
  }
  return hours.weekday_text.join(', ');
} 