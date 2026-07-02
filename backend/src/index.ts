import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { healthRouter } from "./routes/health.routes";
import { findingsRouter } from "./routes/findings.routes";
import { scanRouter } from "./routes/scan.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use(healthRouter);
app.use(findingsRouter);
app.use(scanRouter);

app.listen(env.port, () => {
  console.log(`IONIX Sentinel backend listening on port ${env.port}`);
});
