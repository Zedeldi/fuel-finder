import express, { type RequestHandler } from "express";

import config from "./config.js";
import ClientService from "./service.js";

const service = new ClientService(config);

const app = express();
const host = process.env.HOST || "127.0.0.1";
const port = parseInt(process.env.PORT || "5000");

const parseUrlParams: RequestHandler = (req, res, next) => {
  const batchNumber = parseInt(req.query["batch-number"] as string);
  const effectiveStartTimestamp = new Date(
    req.query["effective-start-timestamp"] as string,
  );
  res.locals.batchNumber =
    isNaN(batchNumber) || !isFinite(batchNumber) ? undefined : batchNumber;
  res.locals.effectiveStartTimestamp = isNaN(effectiveStartTimestamp.getTime())
    ? undefined
    : effectiveStartTimestamp;
  next();
};

app.get("/pfs", parseUrlParams, async (_req, res) => {
  res.send(
    await service.getFuelStations(
      res.locals.batchNumber,
      res.locals.effectiveStartTimestamp,
    ),
  );
});

app.get("/pfs/all", async (_req, res) => {
  res.send(await service.getAllFuelStations());
});

app.get("/pfs/fuel-prices", parseUrlParams, async (_req, res) => {
  res.send(
    await service.getFuelPrices(
      res.locals.batchNumber,
      res.locals.effectiveStartTimestamp,
    ),
  );
});

app.get("/pfs/fuel-prices/all", async (_req, res) => {
  res.send(await service.getAllFuelPrices());
});

app.get("/node", async (_req, res) => {
  res.send(service.nodes);
});

app.get("/node/:nodeId", async (req, res) => {
  res.send(service.nodes[req.params.nodeId]);
});

app.listen(port, host, async () => {
  await service.start(60, true);
  console.log(`Server listening on http://${host}:${port}`);
});
