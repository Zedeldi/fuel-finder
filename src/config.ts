import type { ClientConfig } from "./client.js";

const config: ClientConfig = {
  baseUrl: new URL("https://www.fuel-finder.service.gov.uk/api/"),
  apiVersion: 1,
  cacheTtl: -1, // 0 = indefinite, -1 = disable
  clientId: "",
  clientSecret: "",
};

export default config;
