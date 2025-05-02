import { test, expect } from '../../test-helper';
import { getWeather } from '@/lib/ai/tools/get-weather';

test.describe('get-weather tool', () => {
  test('returns weather for valid location', async ({ aiContext }) => {
    const result = await getWeather.execute({
      latitude: 37.7749,
      longitude: -122.4194
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });
    
    expect(result).toContain('San Francisco');
    expect(result).toContain('20');
    expect(result).toContain('sunny');
  });

  test('handles invalid location', async ({ aiContext }) => {
    await expect(async () => {
      await getWeather.execute({
        latitude: 999,
        longitude: 999
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow('Weather service unavailable');
  });

  test('includes temperature unit', async ({ aiContext }) => {
    const result = await getWeather.execute({
      latitude: 37.7749,
      longitude: -122.4194
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });
    
    expect(result).toMatch(/\d+°[CF]/);
  });

  test('handles service errors gracefully', async ({ aiContext }) => {
    await expect(async () => {
      await getWeather.execute({
        latitude: -1,
        longitude: -1
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow();
  });
}); 