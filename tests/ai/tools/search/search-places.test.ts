import { test, expect } from '../../test-helper';
import { searchPlacesTool, PlaceType } from '@/lib/ai/tools/search-places';

test.describe('search-places tool', () => {
  test('finds places successfully', async ({ aiContext }) => {
    const result = await searchPlacesTool.execute({
      query: 'restaurants in San Francisco',
      type: PlaceType.RESTAURANT,
      address: 'San Francisco, CA'
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result).toContain('Test Place');
    expect(result).toContain('123 Test St');
    expect(result).toContain('4.5');
  });

  test('handles empty results', async ({ aiContext }) => {
    const result = await searchPlacesTool.execute({
      query: 'nonexistent place type',
      address: 'Nowhere'
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result).toBe('No places found matching your criteria.');
  });

  test('respects location radius', async ({ aiContext }) => {
    const result = await searchPlacesTool.execute({
      query: 'coffee shops',
      type: PlaceType.CAFE,
      address: 'San Francisco, CA',
      radius: 1000
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result).toContain('within 1000 meters');
  });

  test('includes place details', async ({ aiContext }) => {
    const result = await searchPlacesTool.execute({
      query: 'hotels',
      type: PlaceType.LODGING,
      address: 'San Francisco, CA',
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result).toContain('Rating');
    expect(result).toContain('Reviews');
    expect(result).toContain('Photos');
  });

  test('handles search errors', async ({ aiContext }) => {
    await expect(async () => {
      await searchPlacesTool.execute({
        query: 'error trigger',
        address: 'Error Location'
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow();
  });

  test('supports multiple place types', async ({ aiContext }) => {
    const result = await searchPlacesTool.execute({
      query: 'food',
      address: 'San Francisco, CA'
    }, {
      toolCallId: 'test-tool-call-id',
      messages: []
    });

    expect(result).toContain('Found places of type: restaurant, cafe, bakery');
  });

  test('handles invalid location format', async ({ aiContext }) => {
    await expect(async () => {
      await searchPlacesTool.execute({
        query: 'restaurants',
        type: PlaceType.RESTAURANT,
        address: ''
      }, {
        toolCallId: 'test-tool-call-id',
        messages: []
      });
    }).rejects.toThrow();
  });
}); 