import Client, { type ClientConfig } from "./client.js";
import type { BaseResponse, FuelStationNode, OAuthToken } from "./interface.js";
import { exhaust, getPromiseState, unpaginate, withDefault } from "./utils.js";

export default class ClientService extends Client {
  private interval?: NodeJS.Timeout;
  private promise?: Promise<void[]>;
  nodes: Record<string, FuelStationNode>;

  constructor(config: ClientConfig, token?: OAuthToken) {
    super(config, token);
    this.nodes = {};
  }

  private get state() {
    return this.promise && getPromiseState(this.promise);
  }

  private static transform(data: BaseResponse[]) {
    return Object.fromEntries(
      data.map((response) => {
        const { node_id, ...item } = response;
        return [node_id, item];
      }),
    );
  }

  private static generate(
    fn: (batchNumber?: number, ...args: any[]) => Promise<BaseResponse[]>,
    ...args: any[]
  ) {
    return exhaust(
      withDefault(async (batchNumber: number) => fn(batchNumber, ...args), []),
      Client.MIN_BATCH_NUMBER,
    );
  }

  private static getAll(
    fn: (batchNumber?: number, ...args: any[]) => Promise<BaseResponse[]>,
    ...args: any[]
  ) {
    return unpaginate(ClientService.generate(fn, ...args));
  }

  async getAllFuelPrices() {
    return ClientService.getAll(this.getFuelPrices.bind(this));
  }

  async getAllFuelStations() {
    return ClientService.getAll(this.getFuelStations.bind(this));
  }

  async refresh() {
    // Previous refresh has not finished
    if (this.promise !== undefined && (await this.state) === undefined) {
      console.debug("Service is currently refreshing");
      return;
    }
    console.debug("Refreshing service nodes");
    this.promise = Promise.all(
      [this.getFuelStations, this.getFuelPrices].map(async (fn) => {
        for await (const response of ClientService.generate(fn.bind(this))) {
          const data = ClientService.transform(response);
          Object.entries(data).forEach(([key, item]) => {
            const node = this.nodes[key];
            this.nodes[key] = { ...node, ...item };
          });
        }
      }),
    );
    await this.promise;
    console.debug("Service nodes refreshed");
  }

  start(interval: number) {
    if (this.interval) {
      throw new Error("Service already started");
    }
    this.interval = setInterval(
      async () => await this.refresh(),
      interval * 1000,
    );
    console.debug(`Service started with refresh interval of ${interval}s`);
  }

  stop() {
    if (!this.interval) {
      throw new Error("Service has not been started");
    }
    clearInterval(this.interval);
    this.interval = undefined;
    console.debug("Service stopped");
  }
}
