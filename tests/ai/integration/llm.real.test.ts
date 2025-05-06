import { realTest as test, expect } from '../real-test-helper';

test.describe('LLM API Integration Tests', () => {
  test('should successfully stream LLM response', async ({ aiContext }) => {
    // Clear any previous data
    aiContext.dataStream.clear();

    // Test data
    const prompt = 'What is 2+2?';
    
    try {
      // Simulate streaming response
      await aiContext.dataStream.writeData('The answer');
      await aiContext.dataStream.writeData(' to');
      await aiContext.dataStream.writeData(' 2+2');
      await aiContext.dataStream.writeData(' is');
      await aiContext.dataStream.writeData(' 4');

      // Get accumulated data
      const streamedData = aiContext.dataStream.getData();
      
      // Verify the response
      expect(streamedData).toHaveLength(5);
      expect(streamedData.join('')).toContain('4');
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });

  test('should handle LLM errors gracefully', async ({ aiContext }) => {
    aiContext.dataStream.clear();

    try {
      const error = new Error('API Error');
      const errorMessage = aiContext.dataStream.onError(error);
      
      expect(errorMessage).toBe('Error: API Error');
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });

  test('should handle message annotations', async ({ aiContext }) => {
    aiContext.dataStream.clear();

    const annotation = {
      type: 'function_call',
      name: 'test_function',
      arguments: { arg1: 'value1' }
    };

    try {
      await aiContext.dataStream.writeMessageAnnotation(annotation);
      
      const data = aiContext.dataStream.getData();
      expect(data).toHaveLength(1);
      expect(data[0]).toEqual({ type: 'annotation', value: annotation });
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });
}); 