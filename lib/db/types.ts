// Database types from schema
export interface Business {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  website: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// API Service types
export interface SerperPlacesResponse {
  places: Array<{
    title: string;
    address: string;
    latitude: number;
    longitude: number;
    rating: number;
    ratingCount: number;
    category: string;
    phoneNumber: string;
    website: string;
  }>;
}

export interface HunterResponse {
  data: {
    domain: string;
    disposable: boolean;
    webmail: boolean;
    accept_all: boolean;
    pattern: string;
    organization: string;
    emails: Array<{
      value: string;
      type: string;
      confidence: number;
      sources: Array<{
        domain: string;
        uri: string;
        extracted_on: string;
        last_seen_on: string;
        still_on_page: boolean;
      }>;
      first_name: string;
      last_name: string;
      position: string;
      seniority: string;
      department: string;
      verification: {
        date: string;
        status: string;
      };
    }>;
  };
  meta: {
    results: number;
    limit: number;
    offset: number;
    params: {
      domain: string;
      company: string | null;
      type: string | null;
      seniority: string | null;
      department: string | null;
    };
  };
}
