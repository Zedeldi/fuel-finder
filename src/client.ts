import Cache from "./cache.js";
import type {
  FuelStationResponse,
  FuelPriceResponse,
  OAuthResponse,
  OAuthToken,
} from "./interface.js";
import { unpaginate } from "./utils.js";

export interface ClientConfig {
  baseUrl: URL;
  apiVersion: number;
  clientId: string;
  clientSecret: string;
}

interface RequestOptions extends RequestInit {
  authenticate?: boolean; // Prevent authentication loop
}

export default class Client {
  static readonly MIN_BATCH_NUMBER = 1;
  static readonly CACHE_TTL = 60 * 5;

  config: ClientConfig;
  token: OAuthToken | null;

  constructor(config: ClientConfig, token?: OAuthToken) {
    this.config = config;
    this.token = token ?? null;
    if (this.config.apiVersion > 1) {
      throw new Error(`API version ${this.config.apiVersion} is not supported`);
    }
  }

  get headers() {
    return {
      ...(this.token && {
        Authorization: `${this.token.token_type} ${this.token.access_token}`,
      }),
      "Content-Type": "application/json",
    };
  }

  get apiUrl() {
    return new URL(`v${this.config.apiVersion}/`, this.config.baseUrl).href;
  }

  async request(url: string | URL, request: RequestOptions): Promise<any> {
    const input = new URL(url, this.apiUrl);
    const { authenticate = true } = request;
    console.debug(`${(request.method || "get").toUpperCase()} ${input}`);
    try {
      const response = await fetch(input, {
        headers: this.headers,
        ...request,
      });
      if (response.ok) {
        return await response.json();
      } else if ([401, 403].includes(response.status) && authenticate) {
        try {
          await this.refreshToken();
        } catch {
          await this.authenticate();
        }
        return this.request(url, request);
      }
      throw new Error(`Received ${response.status} ${response.statusText}`);
    } catch (error) {
      console.error(error);
    }
  }

  async get(url: string | URL, request?: RequestOptions) {
    return this.request(url, { ...request, method: "GET" });
  }

  async post(url: string | URL, request?: RequestOptions) {
    return this.request(url, { ...request, method: "POST" });
  }

  async authenticate() {
    const response = (await this.post("oauth/generate_access_token", {
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
      authenticate: false,
    })) as OAuthResponse;
    const token = response.data;
    if (!token || !token.access_token) {
      throw new Error("Authentication failed");
    }
    this.token = token;
    console.debug("Received access token");
  }

  async refreshToken() {
    if (!this.token?.refresh_token) {
      throw new Error("Refresh token does not exist");
    }
    const token = (await this.post("oauth/regenerate_access_token", {
      body: JSON.stringify({
        client_id: this.config.clientId,
        refresh_token: this.token.refresh_token,
      }),
      authenticate: false,
    })) as Omit<OAuthToken, "refresh_token">;
    if (!token || !token.access_token) {
      throw new Error("Failed to refresh token");
    }
    this.token = { ...this.token, ...token };
    console.debug("Refreshed access token");
  }

  @Cache.cache(Client.CACHE_TTL)
  async getFuelStations(
    batchNumber: number = Client.MIN_BATCH_NUMBER,
  ): Promise<FuelStationResponse[]> {
    return this.get(`pfs?batch-number=${batchNumber}`);
  }

  async getAllFuelStations() {
    return unpaginate(
      async (batchNumber?: number) => this.getFuelStations(batchNumber),
      Client.MIN_BATCH_NUMBER,
    );
  }

  @Cache.cache(Client.CACHE_TTL)
  async getFuelPrices(
    batchNumber: number = Client.MIN_BATCH_NUMBER,
  ): Promise<FuelPriceResponse[]> {
    return this.get(`pfs/fuel-prices?batch-number=${batchNumber}`);
  }

  async getAllFuelPrices() {
    return unpaginate(
      async (batchNumber?: number) => this.getFuelPrices(batchNumber),
      Client.MIN_BATCH_NUMBER,
    );
  }
}
