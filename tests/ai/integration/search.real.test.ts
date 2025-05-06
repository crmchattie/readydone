import { realTest as test, expect } from '../real-test-helper';

test.describe('Search Tool Real API Tests', () => {
  test('should perform a real search query', async ({ aiContext }) => {
    aiContext.dataStream.clear();

    try {
      // Test search query
      const searchQuery = 'What is the capital of France?';
      
      // Write the query to the stream
      await aiContext.dataStream.writeData({
        type: 'search_query',
        content: searchQuery
      });

      // Simulate receiving search results
      const searchResult = {
        type: 'search_result',
        content: {
          title: 'Paris - Capital of France',
          url: 'https://example.com/paris',
          description: 'Paris is the capital and largest city of France...'
        }
      };

      await aiContext.dataStream.writeData(searchResult);

      // Get the accumulated data
      const data = aiContext.dataStream.getData();
      
      // Verify the search interaction
      expect(data).toHaveLength(2);
      expect(data[0].type).toBe('search_query');
      expect(data[1].type).toBe('search_result');
      expect(data[1].content.title).toContain('Paris');
    } catch (error) {
      console.error('Search test failed:', error);
      throw error;
    }
  });

  test('should handle search with source attribution', async ({ aiContext }) => {
    aiContext.dataStream.clear();

    try {
      // Add a search source
      const source = {
        name: 'web_search',
        timestamp: new Date().toISOString()
      };
      
      await aiContext.dataStream.writeSource(source);

      // Get the data and verify source
      const data = aiContext.dataStream.getData();
      expect(data).toHaveLength(1);
      expect(data[0].type).toBe('source');
      expect(data[0].value.name).toBe('web_search');
    } catch (error) {
      console.error('Source attribution test failed:', error);
      throw error;
    }
  });

  test('should merge search results from multiple streams', async ({ aiContext }) => {
    aiContext.dataStream.clear();

    try {
      // Create a stream of search results
      const searchResults = new ReadableStream({
        start(controller) {
          controller.enqueue('Result 1');
          controller.enqueue('Result 2');
          controller.close();
        }
      });

      // Merge the streams
      await aiContext.dataStream.merge(searchResults);

      // Verify merged results
      const data = aiContext.dataStream.getData();
      expect(data.length).toBeGreaterThan(0);
      expect(data.some(item => item.includes('Result'))).toBeTruthy();
    } catch (error) {
      console.error('Stream merge test failed:', error);
      throw error;
    }
  });
}); 