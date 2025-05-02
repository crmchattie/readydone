export const mockResponses = {
  search: {
    success: {
      results: [
        {
          title: 'Test Result',
          url: 'https://test.com',
          description: 'Test description',
          markdown: 'Test content',
          links: ['https://test.com/link1', 'https://test.com/link2']
        }
      ]
    },
    empty: { results: [] },
    error: new Error('Search failed')
  },
  weather: {
    success: {
      temperature: 20,
      condition: 'sunny',
      location: 'San Francisco'
    },
    error: new Error('Weather service unavailable')
  },
  places: {
    success: [
      {
        name: 'Test Place',
        address: '123 Test St',
        rating: 4.5,
        reviews: ['Great place!'],
        photos: ['photo1.jpg']
      }
    ],
    empty: [],
    error: new Error('Places search failed')
  },
  email: {
    success: {
      address: 'test@example.com',
      confidence: 0.9
    },
    notFound: null,
    error: new Error('Email search failed')
  },
  phone: {
    success: {
      number: '+1234567890',
      confidence: 0.9
    },
    notFound: null,
    error: new Error('Phone search failed')
  },
  memory: {
    store: {
      success: 'Memory stored successfully',
      error: new Error('Failed to store memory')
    },
    retrieve: {
      success: {
        memories: ['Test memory 1', 'Test memory 2'],
        relevance: [0.9, 0.8]
      },
      empty: { memories: [], relevance: [] },
      error: new Error('Failed to retrieve memory')
    }
  },
  document: {
    create: {
      success: {
        id: 'doc-123',
        content: 'Test document content'
      },
      error: new Error('Failed to create document')
    },
    update: {
      success: {
        id: 'doc-123',
        content: 'Updated document content'
      },
      error: new Error('Failed to update document')
    }
  }
}; 