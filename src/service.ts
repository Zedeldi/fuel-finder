import fs from "fs";

import Client, { type ClientConfig } from "./client.js";
import type { BaseResponse, FuelStationNode, OAuthToken } from "./interface.js";
import { exhaust, getPromiseState, unpaginate, withDefault } from "./utils.js";

interface ServiceData {
  date?: Date;
  nodes: Record<string, FuelStationNode>;
}

export default class ClientService extends Client {
  private interval?: NodeJS.Timeout;
  private promise?: Promise<void[]>;
  private data: ServiceData;

  constructor(config: ClientConfig, token?: OAuthToken, data?: ServiceData) {
    super(config, token);
    this.data = data || {
      nodes: {},
    };
  }

  get nodes() {
    return this.data.nodes;
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
    // Set date before refreshing to avoid missing data
    const date = new Date();
    this.promise = Promise.all(
      [this.getFuelStations, this.getFuelPrices].map(async (fn) => {
        for await (const response of ClientService.generate(
          fn.bind(this),
          this.data.date, // Last refresh date or undefined
        )) {
          const data = ClientService.transform(response);
          Object.entries(data).forEach(([key, item]) => {
            const node = this.data.nodes[key];
            this.data.nodes[key] = { ...node, ...item };
          });
        }
      }),
    );
    await this.promise;
    // Update last refresh date
    this.data.date = date;
    console.debug("Service nodes refreshed");
  }

  filter(fn: (entry: [string, FuelStationNode]) => unknown) {
    return Object.fromEntries(Object.entries(this.data.nodes).filter(fn));
  }

  load(path: string) {
    fs.readFile(path, "utf8", (error, data) => {
      if (error) {
        console.error(`Failed to load service data: ${error}`);
        return;
      }
      this.data = JSON.parse(data);
      console.debug(`Session data loaded from ${path}`);
    });
  }

  save(path: string) {
    fs.writeFile(path, JSON.stringify(this.data), (error) => {
      if (error) {
        console.error(`Failed to save service data: ${error}`);
        return;
      }
      console.debug(`Session data saved to ${path}`);
    });
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
