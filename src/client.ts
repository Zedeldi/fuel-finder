import cache from "./cache.js";

export interface ClientConfig {
  baseUrl: URL;
  apiVersion: number;
  clientId: string;
  clientSecret: string;
}

interface OAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

interface RequestOptions extends RequestInit {
  authenticate?: boolean;
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
      ...(this.token && { Authorization: `Bearer ${this.token.access_token}` }),
      "Content-Type": "application/json",
    };
  }

  get apiUrl() {
    return new URL(`v${this.config.apiVersion}/`, this.config.baseUrl).href;
  }

  async request(url: string, request: RequestOptions): Promise<any> {
    const input = new URL(url, this.apiUrl);
    const { authenticate = true } = request;
    console.debug(`${(request.method || "get").toUpperCase()} ${input}`);
    return fetch(input, {
      headers: this.headers,
      ...request,
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else if ([401, 403].includes(response.status) && authenticate) {
          return this.refreshToken()
            .catch(() => this.authenticate())
            .then(() => this.request(url, request));
        }
        return Promise.reject(response);
      })
      .catch((error) => {
        if (error instanceof Response) {
          console.error(`Received ${error.status} ${error.statusText}`);
        } else {
          console.error(error);
        }
      });
  }

  async get(url: string, request?: RequestOptions) {
    return this.request(url, { ...request, method: "GET" });
  }

  async post(url: string, request?: RequestOptions) {
    return this.request(url, { ...request, method: "POST" });
  }

  async authenticate() {
    this.token = (
      await this.post("oauth/generate_access_token", {
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
        authenticate: false,
      })
    ).data;
    if (!this.token) {
      throw new Error("Authentication failed");
    }
    console.debug("Received access token");
  }

  async refreshToken() {
    if (!this.token?.refresh_token) {
      throw new Error("Refresh token does not exist");
    }
    const token = await this.post("oauth/regenerate_access_token", {
      body: JSON.stringify({
        client_id: this.config.clientId,
        refresh_token: this.token.refresh_token,
      }),
      authenticate: false,
    });
    this.token = { ...this.token, ...token };
    console.debug("Updated access token");
  }

  private async getAll(
    fn: (batchNumber: number) => Promise<unknown[]>,
    start: number = Client.MIN_BATCH_NUMBER,
  ) {
    const results: unknown[] = [];
    let batchNumber = start;
    let data = await fn(batchNumber);
    while (data.length !== 0) {
      results.push(...data);
      batchNumber++;
      data = await fn(batchNumber);
    }
    return results;
  }

  @cache(Client.CACHE_TTL)
  async getFuelStations(batchNumber: number = Client.MIN_BATCH_NUMBER) {
    return this.get(`pfs?batch-number=${batchNumber}`);
  }

  async getAllFuelStations() {
    return this.getAll(async (batchNumber?: number) =>
      this.getFuelStations(batchNumber),
    );
  }

  @cache(Client.CACHE_TTL)
  async getFuelPrices(batchNumber: number = Client.MIN_BATCH_NUMBER) {
    return this.get(`pfs/fuel-prices?batch-number=${batchNumber}`);
  }

  async getAllFuelPrices() {
    return this.getAll(async (batchNumber?: number) =>
      this.getFuelPrices(batchNumber),
    );
  }
}
