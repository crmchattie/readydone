import { tool } from 'ai';
import { z } from 'zod';

// Debug helper
const debug = (message: string, data?: any) => {
  console.debug(`[Get Weather Tool] ${message}`, data ? data : '');
};

export const getWeather = tool({
  description: 'Get the current weather at a location',
  parameters: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  execute: async ({ latitude, longitude }) => {
    debug('Starting weather request', { latitude, longitude });
    
    try {
      debug('Fetching weather data from API');
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
      );
      debug('API response received', { status: response.status });

      if (!response.ok) {
        debug('API request failed', { status: response.status });
        throw new Error(`Weather API request failed with status: ${response.status}`);
      }

      const weatherData = await response.json();
      debug('Weather data parsed successfully', {
        hasCurrentData: !!weatherData.current,
        hasHourlyData: !!weatherData.hourly,
        hasDailyData: !!weatherData.daily
      });

      return weatherData;
    } catch (error) {
      debug('Weather request failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  },
});
