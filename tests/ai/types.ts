import { DataStreamWriter } from 'ai';
import { Session } from 'next-auth';

export interface MockDataStream extends DataStreamWriter {
  writeData: (data: any) => void;
  writeMessageAnnotation: (value: any) => void;
  writeSource: (source: any) => void;
  merge: (stream: ReadableStream<any>) => void;
  onError: (error: any) => string;
  getData: () => any[];
  clear: () => void;
}

export interface TestContext {
  session: Session;
  dataStream: MockDataStream;
  findPhone?: (params: { business: string; location: string; limit?: number }) => Promise<string>;
}

export interface MockResponses {
  search: {
    success: {
      results: Array<{
        title: string;
        url: string;
        description: string;
        markdown?: string;
        links?: string[];
      }>;
    };
    empty: { results: [] };
    error: Error;
  };
  weather: {
    success: {
      temperature: number;
      condition: string;
      location: string;
    };
    error: Error;
  };
  places: {
    success: Array<{
      name: string;
      address: string;
      rating: number;
      reviews: string[];
      photos: string[];
    }>;
    empty: [];
    error: Error;
  };
  email: {
    success: {
      address: string;
      confidence: number;
    };
    notFound: null;
    error: Error;
  };
  phone: {
    success: {
      number: string;
      confidence: number;
    };
    notFound: null;
    error: Error;
  };
  memory: {
    store: {
      success: string;
      error: Error;
    };
    retrieve: {
      success: {
        memories: string[];
        relevance: number[];
      };
      empty: {
        memories: [];
        relevance: [];
      };
      error: Error;
    };
  };
  document: {
    create: {
      success: {
        id: string;
        content: string;
      };
      error: Error;
    };
    update: {
      success: {
        id: string;
        content: string;
      };
      error: Error;
    };
  };
} 