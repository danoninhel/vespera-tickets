import { expireOrders } from "../services/expiration";

export async function expireOrdersHandler() {
  const result = await expireOrders();
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
}