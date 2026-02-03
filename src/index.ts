import express, { type RequestHandler } from "express";

import config from "./config.js";
import Client from "./client.js";

const client = new Client(config);

const app = express();
const host = process.env.HOST || "127.0.0.1";
const port = parseInt(process.env.PORT || "5000");

app.use(async (_req, _res, next) => {
  try {
    await client.refreshToken();
  } catch {
    await client.authenticate();
  }
  next();
});

const batchNumberHandler: RequestHandler = (req, res, next) => {
  const batchNumber = req.query["batch-number"];
  res.locals.batchNumber = batchNumber
    ? parseInt(batchNumber as string)
    : undefined;
  next();
};

app.get("/pfs", batchNumberHandler, async (_req, res) => {
  res.send(await client.getFuelStations(res.locals.batchNumber));
});

app.get("/pfs/all", async (_req, res) => {
  res.send(await client.getAllFuelStations());
});

app.get("/pfs/fuel-prices", batchNumberHandler, async (_req, res) => {
  res.send(await client.getFuelPrices(res.locals.batchNumber));
});

app.get("/pfs/fuel-prices/all", async (_req, res) => {
  res.send(await client.getAllFuelPrices());
});

app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
