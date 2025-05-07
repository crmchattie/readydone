import { tool } from 'ai';
import { z } from 'zod';
import { searchPlaces, nearbySearch } from '@/lib/places';
import { PlaceType, SerperPlacesResponse } from '@/lib/db/types';
import axios from 'axios';

const GOOGLE_PLACES_API = process.env.GOOGLE_PLACES_API;

// Debug helper
const debug = (message: string, data?: any) => {
  console.debug(`[Search Places Tool] ${message}`, data ? data : '');
};

async function getCoordinatesFromAddress(address: string): Promise<{ latitude: number; longitude: number }> {
  debug('Getting coordinates for address', { address });
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_PLACES_API}`
    );
    debug('Geocoding response received', { status: response.data.status });

    if (response.data.status !== 'OK') {
      debug('Geocoding failed', { status: response.data.status });
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }

    const location = response.data.results[0].geometry.location;
    debug('Coordinates obtained', { latitude: location.lat, longitude: location.lng });
    return {
      latitude: location.lat,
      longitude: location.lng
    };
  } catch (error) {
    debug('Error getting coordinates', { error: error instanceof Error ? error.message : 'Unknown error' });
    console.error('Error getting coordinates from address:', error);
    throw error;
  }
}

async function getPlaceDetails(place: SerperPlacesResponse['places'][0]) {
  debug('Fetching place details', { placeId: place.place_id });
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,geometry,rating,user_ratings_total,formatted_phone_number,website,opening_hours,types,price_level,reviews&key=${GOOGLE_PLACES_API}`
    );
    debug('Place details response received', { status: response.data.status });

    if (response.data.status !== 'OK') {
      debug('Failed to fetch place details', { status: response.data.status });
      throw new Error(`Failed to fetch place details: ${response.data.status}`);
    }

    const result = response.data.result;
    debug('Place details retrieved', {
      hasOpeningHours: !!result.opening_hours,
      hasPriceLevel: !!result.price_level,
      reviewCount: result.reviews?.length || 0
    });

    return {
      ...place,
      openingHours: result.opening_hours?.weekday_text || [],
      priceLevel: result.price_level,
      reviews: result.reviews?.map((review: any) => ({
        rating: review.rating,
        text: review.text,
        time: review.time,
        authorName: review.author_name
      })) || []
    };
  } catch (error) {
    debug('Error fetching place details', { error: error instanceof Error ? error.message : 'Unknown error' });
    console.error('Error fetching place details:', error);
    throw error;
  }
}

function formatPlaceDetails(place: SerperPlacesResponse['places'][0], index?: number) {
  debug('Formatting place details', { placeTitle: place.title, hasIndex: index !== undefined });
  let content = index !== undefined ? `${index + 1}. ${place.title}\n` : `Details for ${place.title}:\n\n`;
  content += `📍 Address: ${place.address}\n`;
  content += `⭐ Rating: ${place.rating} (${place.ratingCount} reviews)\n`;
  content += `🏷️ Category: ${place.category}\n`;
  
  if (place.phoneNumber) {
    content += `📞 Phone: ${place.phoneNumber}\n`;
  }
  if (place.website) {
    content += `🌐 Website: ${place.website}\n`;
  }
  
  // Add extended details if available
  if ('priceLevel' in place) {
    content += `💰 Price Level: ${Array((place as any).priceLevel + 1).join('$')}\n`;
  }
  if ('openingHours' in place && (place as any).openingHours?.length > 0) {
    content += `\n⏰ Opening Hours:\n${(place as any).openingHours.join('\n')}\n`;
  }
  if ('reviews' in place && (place as any).reviews?.length > 0) {
    content += `\n📝 Recent Reviews:\n`;
    (place as any).reviews.slice(0, 3).forEach((review: any) => {
      content += `\n${review.authorName} - ${review.rating}⭐\n`;
      content += `${review.text}\n`;
    });
  }
  debug('Place details formatted');
  return content;
}

export const getSpecificPlaceTool = tool({
  description: 'Get detailed information about a specific place',
  parameters: z.object({
    query: z.string().describe('The exact name of the place (e.g., "Statue of Liberty")'),
    address: z.string().describe('The location or address to search near (e.g., "New York, NY")'),
  }),
  execute: async ({ query, address }) => {
    debug('Starting specific place search', { query, address });
    try {
      debug('Getting coordinates for address');
      const { latitude, longitude } = await getCoordinatesFromAddress(address);
      debug('Coordinates obtained', { latitude, longitude });
      
      debug('Searching for specific place');
      const results = await searchPlaces({
        query,
        latitude,
        longitude,
        radius: 5000, // Smaller radius for more precise results
      });
      debug('Search completed', { resultCount: results.places?.length || 0 });

      if (!results.places || results.places.length === 0) {
        debug('No places found');
        return 'No place found matching your criteria.';
      }

      debug('Getting details for most relevant result');
      const place = results.places[0];
      const placeDetails = await getPlaceDetails(place);
      debug('Place details retrieved');

      debug('Formatting place details');
      const formattedDetails = formatPlaceDetails(placeDetails);
      debug('Search completed successfully');
      
      return formattedDetails;
    } catch (error) {
      debug('Place search failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      console.error('Failed to get place details:', error);
      throw error;
    }
  },
});

export const searchPlacesTool = tool({
  description: 'Search for places using Google Places API',
  parameters: z.object({
    query: z.string().optional().describe('The search query to find places (e.g., "italian restaurants", "coffee shops")'),
    address: z.string().describe('The address or location to search around (e.g., "New York, NY", "123 Main St, Chicago")'),
    radius: z.number().optional().describe('Search radius in meters (default: 50000)'),
    type: z.nativeEnum(PlaceType).optional().describe('Type of place to search for (e.g., "RESTAURANT", "MUSEUM")'),
    limit: z.number().optional().describe('Maximum number of results to return'),
  }),
  execute: async ({ query, address, radius, type, limit }) => {
    debug('Starting places search', { query, address, radius, type, limit });
    try {
      debug('Validating parameters');
      const validatedAddress = z.string().parse(address);
      const validatedRadius = z.number().parse(radius);
      const validatedType = z.nativeEnum(PlaceType).parse(type).toLowerCase();
      debug('Parameters validated');
      
      debug('Getting coordinates for address');
      const { latitude, longitude } = await getCoordinatesFromAddress(validatedAddress);
      debug('Coordinates obtained', { latitude, longitude });
      
      let results;
      
      if (query) {
        debug('Executing text search', { query: query });
        const validatedQuery = z.string().parse(query);
        results = await searchPlaces({
          query: validatedQuery,
          latitude,
          longitude,
          radius: validatedRadius,
          type: validatedType,
        });
      } else {
        debug('Executing nearby search');
        results = await nearbySearch({
          latitude,
          longitude,
          radius: validatedRadius,
          type: validatedType,
        });
      }
      debug('Search completed', { resultCount: results.places?.length || 0 });

      if (!results.places || results.places.length === 0) {
        debug('No places found');
        return 'No places found matching your criteria.';
      }

      debug('Validating and applying limit');
      const validatedLimit = z.number().parse(limit);
      const places = limit ? results.places.slice(0, validatedLimit) : results.places;
      debug('Results filtered', { totalPlaces: places.length, limitApplied: !!limit });

      debug('Formatting results');
      const formattedResults = `Found ${places.length} places${query ? ` matching "${query}"` : ''} near ${address}:\n\n${places
        .map((place, index) => formatPlaceDetails(place, index))
        .join('\n')}`;
      
      debug('Search completed successfully');
      return formattedResults;
    } catch (error) {
      debug('Places search failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      console.error('Failed to search for places:', error);
      throw error;
    }
  },
}); 