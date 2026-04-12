import "dotenv/config";
import { startCron } from "./src/cron.js";

startCron();

const ServerlessOffline = await import("serverless-offline").then((m) => m.default);
await ServerlessOffline();