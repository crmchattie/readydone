import axios from 'axios';
import { SerperPlacesResponse } from '../db/types';

const GOOGLE_PLACES_API = process.env.GOOGLE_PLACES_API;

if (!GOOGLE_PLACES_API) {
  throw new Error('GOOGLE_PLACES_API environment variable is not set');
}

interface SearchPlacesOptions {
  query: string;
  latitude: number;
  longitude: number;
  radius?: number; // in meters
  type?: string; // place type
}

interface NearbySearchOptions {
  latitude: number;
  longitude: number;
  radius?: number; // in meters
  type?: string; // place type
}

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function fetchPlaceDetails(placeId: string): Promise<any> {
  console.log('Fetching details for placeId:', placeId);

  try {
    const detailsResponse = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=website,opening_hours,formatted_phone_number&key=${GOOGLE_PLACES_API}`
    );

    console.log('Place details response:', detailsResponse.data);

    if (detailsResponse.data.status !== 'OK') {
      console.error(`Error fetching details for placeId ${placeId}:`, detailsResponse.data.error_message);
      return null;
    }

    const result = detailsResponse.data.result;
    if (!result) {
      console.log(`No details found for placeId ${placeId}`);
      return null;
    }

    let website = null;
    if (result.website) {
      try {
        const websiteUrl = new URL(result.website);
        website = `${websiteUrl.protocol}//${websiteUrl.hostname}`;
      } catch (urlError) {
        console.error(`Invalid website URL for placeId ${placeId}:`, result.website);
      }
    }

    return {
      website,
      phone_number: result.formatted_phone_number,
      opening_hours: result.opening_hours ? {
        open_now: result.opening_hours.open_now,
        periods: result.opening_hours.periods,
        special_days: result.opening_hours.special_days,
        weekday_text: result.opening_hours.weekday_text,
        type: result.opening_hours.type
      } : undefined
    };
  } catch (error) {
    console.error(`Exception fetching details for placeId ${placeId}:`, error);
    return null;
  }
}

/**
 * Search for places using Google Places API
 * @param options Search options including query, coordinates, and type
 */
export async function searchPlaces(options: SearchPlacesOptions): Promise<SerperPlacesResponse> {
  const { query, latitude, longitude, radius = 50000, type } = options;
  console.log('SearchPlaces Request:', { query, latitude, longitude, radius, type });

  let allPlaces: any[] = [];
  let nextPageToken: string | undefined;

  do {
    try {
      const placesResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${latitude},${longitude}&radius=${radius}${type ? `&type=${type}` : ''}&key=${GOOGLE_PLACES_API}` +
        (nextPageToken ? `&pagetoken=${nextPageToken}` : '')
      );

      console.log('SearchPlaces Response:', placesResponse.data);

      const operationalPlaces = placesResponse.data.results.filter((place: any) => {
        // Filter by operational status
        if (place.business_status !== 'OPERATIONAL') return false;
        
        // Calculate distance and filter by radius
        const distance = calculateDistance(
          latitude,
          longitude,
          place.geometry.location.lat,
          place.geometry.location.lng
        );
        
        console.log(`Place ${place.name} is ${distance}m from search location (radius: ${radius}m)`);
        return distance <= radius;
      });

      for (const place of operationalPlaces) {
        const details = await fetchPlaceDetails(place.place_id);
        if (details && (details.website || details.phone_number)) {
          allPlaces.push({
            title: place.name,
            address: place.formatted_address,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            rating: place.rating || 0,
            ratingCount: place.user_ratings_total || 0,
            category: place.types[0] || '',
            phoneNumber: details.phone_number || '',
            website: details.website,
            place_id: place.place_id,
            opening_hours: details.opening_hours
          });
        }
      }

      nextPageToken = placesResponse.data.next_page_token;
      if (nextPageToken) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Delay to allow next page token to become active
      }
    } catch (error) {
      console.error('Error during searchPlaces API call:', error);
      break;
    }
  } while (nextPageToken);

  return { places: allPlaces };
}

/**
 * Search for places using Google Places Nearby Search API
 * @param options Search options including coordinates, radius, and type
 */
export async function nearbySearch(options: NearbySearchOptions): Promise<SerperPlacesResponse> {
  const { latitude, longitude, radius = 50000, type } = options;
  
  console.log('NearbySearch Request:', { latitude, longitude, radius, type });

  // Search for places near the coordinates
  const placesResponse = await axios.get(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}${type ? `&type=${type}` : ''}&key=${GOOGLE_PLACES_API}`
  );

  // Log the response
  console.log('NearbySearch Response:', placesResponse.data);

  // Transform the response to match our SerperPlacesResponse type
  const places = placesResponse.data.results.map((place: any) => ({
    title: place.name,
    address: place.vicinity,
    latitude: place.geometry.location.lat,
    longitude: place.geometry.location.lng,
    rating: place.rating || 0,
    ratingCount: place.user_ratings_total || 0,
    category: place.types[0] || '',
    phoneNumber: place.formatted_phone_number || '',
    website: place.website || '',
    place_id: place.place_id
  }));

  return { places };
}

/**
 * Convert coordinates to a location string
 */
export function coordsToLocationString(latitude: number, longitude: number, country: string = 'United States'): string {
  return `${latitude},${longitude}, ${country}`;
} 