import { orderRepository } from "../../repositories/orderRepository";

class OrderListService {
  async findById(id: string) {
    return orderRepository.findById(id);
  }

  async findByEventId(eventId: string) {
    return orderRepository.findByEventId(eventId);
  }

  async findExpiredPending() {
    return orderRepository.findExpiredPending();
  }
}

export const orderListService = new OrderListService();
export default orderListService;