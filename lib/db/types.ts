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

// Browser automation types
export type BrowserbaseRegion = 'us-east-1' | 'us-west-2' | 'eu-central-1' | 'ap-southeast-1';

export interface BrowserSession {
  sessionId: string | null;
  sessionUrl: string | null;
  contextId: string | null;
}

export interface BrowserStep {
  text: string;
  reasoning: string;
  tool: 'GOTO' | 'ACT' | 'EXTRACT' | 'OBSERVE' | 'CLOSE' | 'WAIT' | 'NAVBACK';
  instruction: string;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  error?: Error;
}

export interface BrowserState {
  sessionId: string | undefined;
  sessionUrl: string | undefined;
  contextId: string | undefined;
  currentStep: number;
  steps: BrowserStep[];
  extractedData: any;
  error: Error | undefined;
}

export interface BrowserResult {
  state: 'result';
  sessionId?: string;
  sessionUrl?: string;
  contextId?: string;
  steps: BrowserStep[];
  currentStep: number;
  extractedData?: any;
  error?: Error;
  task?: string;
  url?: string;
  variables?: Record<string, string>;
  extractionSchema?: Record<string, any>;
  maxAttempts?: number;
}

export interface BrowserAction {
  action: string;
  reason: string;
  status?: 'failed';
  timestamp: string;
}

export interface UseBrowserProps {
  args?: {
    url: string;
    task: string;
    variables?: Record<string, string>;
    extractionSchema?: Record<string, any>;
    maxAttempts?: number;
  };
  result?: BrowserResult;
  isReadonly?: boolean;
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

export enum PlaceType {
  ACCOUNTING = 'accounting',
  AIRPORT = 'airport',
  AMUSEMENT_PARK = 'amusement_park',
  AQUARIUM = 'aquarium',
  ART_GALLERY = 'art_gallery',
  ATM = 'atm',
  BAKERY = 'bakery',
  BANK = 'bank',
  BAR = 'bar',
  BEAUTY_SALON = 'beauty_salon',
  BICYCLE_STORE = 'bicycle_store',
  BOOK_STORE = 'book_store',
  BOWLING_ALLEY = 'bowling_alley',
  BUS_STATION = 'bus_station',
  CAFE = 'cafe',
  CAMPGROUND = 'campground',
  CAR_DEALER = 'car_dealer',
  CAR_RENTAL = 'car_rental',
  CAR_REPAIR = 'car_repair',
  CAR_WASH = 'car_wash',
  CASINO = 'casino',
  CEMETERY = 'cemetery',
  CHURCH = 'church',
  CITY_HALL = 'city_hall',
  CLOTHING_STORE = 'clothing_store',
  CONVENIENCE_STORE = 'convenience_store',
  COURTHOUSE = 'courthouse',
  DENTIST = 'dentist',
  DEPARTMENT_STORE = 'department_store',
  DOCTOR = 'doctor',
  DRUGSTORE = 'drugstore',
  ELECTRICIAN = 'electrician',
  ELECTRONICS_STORE = 'electronics_store',
  EMBASSY = 'embassy',
  FIRE_STATION = 'fire_station',
  FLORIST = 'florist',
  FUNERAL_HOME = 'funeral_home',
  FURNITURE_STORE = 'furniture_store',
  GAS_STATION = 'gas_station',
  GYM = 'gym',
  HAIR_CARE = 'hair_care',
  HARDWARE_STORE = 'hardware_store',
  HINDU_TEMPLE = 'hindu_temple',
  HOME_GOODS_STORE = 'home_goods_store',
  HOSPITAL = 'hospital',
  INSURANCE_AGENCY = 'insurance_agency',
  JEWELRY_STORE = 'jewelry_store',
  LAUNDRY = 'laundry',
  LAWYER = 'lawyer',
  LIBRARY = 'library',
  LIGHT_RAIL_STATION = 'light_rail_station',
  LIQUOR_STORE = 'liquor_store',
  LOCAL_GOVERNMENT_OFFICE = 'local_government_office',
  LOCKSMITH = 'locksmith',
  LODGING = 'lodging',
  MEAL_DELIVERY = 'meal_delivery',
  MEAL_TAKEAWAY = 'meal_takeaway',
  MOSQUE = 'mosque',
  MOVIE_RENTAL = 'movie_rental',
  MOVIE_THEATER = 'movie_theater',
  MOVING_COMPANY = 'moving_company',
  MUSEUM = 'museum',
  NIGHT_CLUB = 'night_club',
  PAINTER = 'painter',
  PARK = 'park',
  PARKING = 'parking',
  PET_STORE = 'pet_store',
  PHARMACY = 'pharmacy',
  PHYSIOTHERAPIST = 'physiotherapist',
  PLUMBER = 'plumber',
  POLICE = 'police',
  POST_OFFICE = 'post_office',
  REAL_ESTATE_AGENCY = 'real_estate_agency',
  RESTAURANT = 'restaurant',
  ROOFING_CONTRACTOR = 'roofing_contractor',
  RV_PARK = 'rv_park',
  SCHOOL = 'school',
  SHOE_STORE = 'shoe_store',
  SHOPPING_MALL = 'shopping_mall',
  SPA = 'spa',
  STADIUM = 'stadium',
  STORAGE = 'storage',
  STORE = 'store',
  SUBWAY_STATION = 'subway_station',
  SUPERMARKET = 'supermarket',
  SYNAGOGUE = 'synagogue',
  TAXI_STAND = 'taxi_stand',
  TOURIST_ATTRACTION = 'tourist_attraction',
  TRAIN_STATION = 'train_station',
  TRANSIT_STATION = 'transit_station',
  TRAVEL_AGENCY = 'travel_agency',
  UNIVERSITY = 'university',
  VETERINARY_CARE = 'veterinary_care',
  ZOO = 'zoo'
}

export interface PlaceOpeningHoursPeriodDetail {
  day: number; // 0-6, starting on Sunday
  time: string; // 24-hour format (0000-2359)
  date?: string; // RFC3339 format
  truncated?: boolean;
}

export interface PlaceOpeningHoursPeriod {
  open: PlaceOpeningHoursPeriodDetail;
  close?: PlaceOpeningHoursPeriodDetail;
}

export interface PlaceSpecialDay {
  date: string; // RFC3339 format
  exceptional_hours?: boolean;
}

export interface PlaceOpeningHours {
  open_now?: boolean;
  periods?: PlaceOpeningHoursPeriod[];
  special_days?: PlaceSpecialDay[];
  type?: string;
  weekday_text?: string[];
}

export interface Place {
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  ratingCount: number;
  category: string;
  phoneNumber?: string;
  website?: string;
  place_id: string;
  opening_hours?: PlaceOpeningHours;
}

export interface SerperPlacesResponse {
  places: Place[];
}

export interface ToolResult<T = string, A = any, R = any> {
  state: "result";
  step?: number;
  sessionId?: string;
  sessionUrl?: string;
  contextId?: string;
  task?: string;
  steps?: BrowserStep[];
  extractedData?: any;
  error?: Error;
} 