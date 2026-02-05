interface Location {
  address_line_1: string;
  address_line_2: string;
  city: string;
  country: string;
  county: string;
  postcode: string;
  latitude: string;
  longitude: string;
}

interface DayOpeningTime {
  open: string;
  close: string;
  is_24_hours: boolean;
}

interface UsualDays {
  monday: DayOpeningTime;
  tuesday: DayOpeningTime;
  wednesday: DayOpeningTime;
  thursday: DayOpeningTime;
  friday: DayOpeningTime;
  saturday: DayOpeningTime;
  sunday: DayOpeningTime;
}

interface BankHoliday {
  type: string;
  open_time: string;
  close_time: string;
  is_24_hours: boolean;
}

interface OpeningTimes {
  usual_days: UsualDays;
  bank_holiday: BankHoliday;
}

interface FuelPrice {
  fuel_type: string;
  price: string;
  price_last_updated: string;
}

export interface BaseResponse {
  node_id: string;
  mft_organisation_name: string;
  public_phone_number: string | null;
  trading_name: string;
}

export interface OAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface OAuthResponse {
  success: boolean;
  data: OAuthToken;
  message: string;
}

export interface FuelStationResponse extends BaseResponse {
  is_same_trading_and_brand_name: boolean;
  brand_name: string;
  temporary_closure: boolean;
  permanent_closure: boolean | null;
  permanent_closure_date: string | null;
  is_motorway_service_station: boolean;
  is_supermarket_service_station: boolean;
  location: Location;
  amenities: string[];
  opening_times: OpeningTimes;
  fuel_types: string[];
}

export interface FuelPriceResponse extends BaseResponse {
  fuel_prices: FuelPrice[];
}

export type FuelStationNode = Omit<BaseResponse, "node_id">;
