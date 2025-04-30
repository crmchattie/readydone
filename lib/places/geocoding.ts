import axios from 'axios';

const GOOGLE_PLACES_API = process.env.GOOGLE_PLACES_API;

if (!GOOGLE_PLACES_API) {
  throw new Error('GOOGLE_PLACES_API environment variable is not set');
}

export async function getCoordinatesFromAddress(address: string): Promise<{ latitude: number; longitude: number }> {
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