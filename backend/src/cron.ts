import cron from "node-cron";
import { expireOrders } from "./services/expiration.js";

export function startCron() {
  cron.schedule("*/10 * * * *", async () => {
    console.log("Running expiration cron...");
    try {
      const result = await expireOrders();
      console.log("Expiration result:", result);
    } catch (error) {
      console.error("Expiration error:", error);
    }
  });
  console.log("Cron scheduled: expireOrders every 10 minutes");
}