import Client, { type ClientConfig } from "./client.js";
import type { BaseResponse, FuelStationNode, OAuthToken } from "./interface.js";
import { unpaginate } from "./utils.js";

export default class ClientService extends Client {
  private interval?: NodeJS.Timeout;
  private updating: boolean = false;
  nodes: Record<string, FuelStationNode>;

  constructor(config: ClientConfig, token?: OAuthToken) {
    super(config, token);
    this.nodes = {};
  }

  private static transform(data: BaseResponse[]) {
    return Object.fromEntries(
      data.map((response) => {
        const { node_id, ...item } = response;
        return [node_id, item];
      }),
    );
  }

  private static async getAll(
    fn: (batchNumber?: number, ...args: any[]) => Promise<BaseResponse[]>,
    ...args: any[]
  ) {
    return unpaginate(async (batchNumber?: number) => {
      try {
        return await fn(batchNumber, ...args);
      } catch {
        return [];
      }
    }, Client.MIN_BATCH_NUMBER);
  }

  async getAllFuelPrices() {
    return ClientService.getAll(this.getFuelPrices.bind(this));
  }

  async getAllFuelStations() {
    return ClientService.getAll(this.getFuelStations.bind(this));
  }

  async update() {
    if (this.updating) {
      return;
    }
    this.updating = true;
    const stations = ClientService.transform(await this.getAllFuelStations());
    const prices = ClientService.transform(await this.getAllFuelPrices());
    this.nodes = Object.fromEntries(
      Object.entries(stations).map(([key, value]) => [
        key,
        {
          ...value,
          ...prices[key],
        },
      ]),
    );
    this.updating = false;
  }

  async start(interval: number, wait?: boolean) {
    if (this.interval) {
      throw new Error("Service already started");
    }
    if (wait) {
      await this.update();
    }
    this.interval = setInterval(
      async () => await this.update(),
      interval * 1000,
    );
  }

  async stop() {
    if (!this.interval) {
      throw new Error("Service has not been started");
    }
    clearInterval(this.interval);
  }
}
