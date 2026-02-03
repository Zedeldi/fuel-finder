import type { ClientConfig } from "./client.js";

const config: ClientConfig = {
  baseUrl: new URL("https://www.fuel-finder.service.gov.uk/api/"),
  apiVersion: 1,
  clientId: "",
  clientSecret: "",
};

export default config;
