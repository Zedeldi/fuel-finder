import Cache from "./cache.js";
import type {
  FuelStationResponse,
  FuelPriceResponse,
  OAuthResponse,
  OAuthToken,
} from "./interface.js";
import { getUrlSearchParams } from "./utils.js";

export interface ClientConfig {
  baseUrl: URL;
  apiVersion: number;
  clientId: string;
  clientSecret: string;
  cacheTtl?: number;
}

interface RequestOptions extends RequestInit {
  retry?: boolean; // Prevent authentication loop
}

export default class Client {
  protected static readonly MIN_BATCH_NUMBER = 1;

  config: ClientConfig;
  token: OAuthToken | null;
  cache: Cache;

  constructor(config: ClientConfig, token?: OAuthToken) {
    this.config = config;
    this.token = token ?? null;
    this.cache = new Cache({ ttl: config.cacheTtl });
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

  private async fetch(
    url: string | URL,
    request: RequestOptions,
  ): Promise<any> {
    const input = new URL(url, this.apiUrl);
    const { retry = true } = request;
    console.debug(`${(request.method || "get").toUpperCase()} ${input}`);
    const response = await fetch(input, {
      headers: this.headers,
      ...request,
    });
    if (response.ok) {
      return await response.json();
    } else if ([401, 403].includes(response.status) && retry) {
      try {
        await this.refreshToken();
      } catch {
        await this.authenticate();
      }
      // Retry request
      return this.fetch(url, request);
    }
    throw new Error(`Received ${response.status} ${response.statusText}`);
  }

  private async request(url: string | URL, request: RequestOptions) {
    const input = new URL(url, this.apiUrl);
    const key = JSON.stringify({ url: input, method: request.method });
    const { cache = "default" } = request;
    switch (cache) {
      case "default":
        return (
          this.cache.get(key) ||
          this.cache.set(key, await this.fetch(input, request))
        );
      case "force-cache":
        return (
          this.cache.get(key, true) ||
          this.cache.set(key, await this.fetch(input, request))
        );
      case "reload":
      case "no-cache":
        return this.cache.set(key, await this.fetch(input, request));
      case "no-store":
        return await this.fetch(input, request);
      case "only-if-cached":
        return this.cache.get(key, true);
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
      retry: false,
      cache: "no-store",
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
      retry: false,
      cache: "no-store",
    })) as Omit<OAuthToken, "refresh_token">;
    if (!token || !token.access_token) {
      throw new Error("Failed to refresh token");
    }
    this.token = { ...this.token, ...token };
    console.debug("Refreshed access token");
  }

  async getFuelStations(
    batchNumber: number = Client.MIN_BATCH_NUMBER,
    effectiveStartTimestamp?: Date,
  ): Promise<FuelStationResponse[]> {
    const params = getUrlSearchParams({
      "batch-number": batchNumber,
      "effective-start-timestamp": effectiveStartTimestamp,
    });
    return this.get(`pfs?${params}`);
  }

  async getFuelPrices(
    batchNumber: number = Client.MIN_BATCH_NUMBER,
    effectiveStartTimestamp?: Date,
  ): Promise<FuelPriceResponse[]> {
    const params = getUrlSearchParams({
      "batch-number": batchNumber,
      "effective-start-timestamp": effectiveStartTimestamp,
    });
    return this.get(`pfs/fuel-prices?${params}`);
  }
}
