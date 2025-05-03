import { tool } from 'ai';
import { z } from 'zod';
import { searchPlaces, nearbySearch } from '@/lib/places';
import { PlaceType, SerperPlacesResponse } from '@/lib/db/types';
import axios from 'axios';

const GOOGLE_PLACES_API = process.env.GOOGLE_PLACES_API;

async function getCoordinatesFromAddress(address: string): Promise<{ latitude: number; longitude: number }> {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_PLACES_API}`
    );

    if (response.data.status !== 'OK') {
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }

    const location = response.data.results[0].geometry.location;
    return {
      latitude: location.lat,
      longitude: location.lng
    };
  } catch (error) {
    console.error('Error getting coordinates from address:', error);
    throw error;
  }
}

async function getPlaceDetails(place: SerperPlacesResponse['places'][0]) {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,geometry,rating,user_ratings_total,formatted_phone_number,website,opening_hours,types,price_level,reviews&key=${GOOGLE_PLACES_API}`
    );

    if (response.data.status !== 'OK') {
      throw new Error(`Failed to fetch place details: ${response.data.status}`);
    }

    const result = response.data.result;
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
    console.error('Error fetching place details:', error);
    throw error;
  }
}

function formatPlaceDetails(place: SerperPlacesResponse['places'][0], index?: number) {
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
  return content;
}

export const getSpecificPlaceTool = tool({
  description: 'Get detailed information about a specific place',
  parameters: z.object({
    query: z.string().describe('The exact name of the place (e.g., "Statue of Liberty")'),
    address: z.string().describe('The location or address to search near (e.g., "New York, NY")'),
  }),
  execute: async ({ query, address }) => {
    try {
      // First get coordinates from the address
      const { latitude, longitude } = await getCoordinatesFromAddress(address);
      
      // Search for the specific place
      const results = await searchPlaces({
        query,
        latitude,
        longitude,
        radius: 5000, // Smaller radius for more precise results
      });

      if (!results.places || results.places.length === 0) {
        return 'No place found matching your criteria.';
      }

      // Find the most relevant result (first result)
      const place = results.places[0];
      
      // Get detailed information about the place
      const placeDetails = await getPlaceDetails(place);

      return formatPlaceDetails(placeDetails);
    } catch (error) {
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
    try {
      // Validate address is a string
      const validatedAddress = z.string().parse(address);
      const validatedRadius = z.number().parse(radius);
      const validatedType = z.nativeEnum(PlaceType).parse(type).toLowerCase();
      
      // Get coordinates from address
      const { latitude, longitude } = await getCoordinatesFromAddress(validatedAddress);
      
      let results;
      
      if (query) {
        // Use text search if query is provided
        const validatedQuery = z.string().parse(query);
        results = await searchPlaces({
          query: validatedQuery,
          latitude,
          longitude,
          radius: validatedRadius,
          type: validatedType,
        });
      } else {
        // Use nearby search if no query is provided
        results = await nearbySearch({
          latitude,
          longitude,
          radius: validatedRadius,
          type: validatedType,
        });
      }

      if (!results.places || results.places.length === 0) {
        return 'No places found matching your criteria.';
      }

      const validatedLimit = z.number().parse(limit);

      // Apply limit if specified
      const places = limit ? results.places.slice(0, validatedLimit) : results.places;

      return `Found ${places.length} places${query ? ` matching "${query}"` : ''} near ${address}:\n\n${places
        .map((place, index) => formatPlaceDetails(place, index))
        .join('\n')}`;
    } catch (error) {
      console.error('Failed to search for places:', error);
      throw error;
    }
  },
}); 