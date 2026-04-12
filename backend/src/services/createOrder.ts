import { lotes } from "../../generated/prisma/client";
import { prismaClient } from "../lib/prisma";

type CreateOrderInput = {
	eventId: string;
	tickets: {
		name: string;
		email: string;
	}[];
};

export async function createOrder(input: CreateOrderInput) {
	const { eventId, tickets } = input;
	const ticketQuantity = tickets.length;

	if (ticketQuantity === 0) {
		throw {
			type: "BUSINESS_ERROR",
			message: "At least one ticket is required",
		};
	}

	return await prismaClient.$transaction(async (tx) => {
		const event = await tx.events.findUnique({
			where: { id: eventId },
		});

		if (!event) {
			throw {
				type: "NOT_FOUND",
				message: "Event not found",
			};
		}


		const [lote] = await prismaClient.$queryRaw<lotes[]>`
				SELECT *
				FROM lotes
				WHERE event_id = ${eventId}::uuid
				AND (total - reserved) >= ${ticketQuantity}
				ORDER BY position ASC
				LIMIT 1
		`;

		if (!lote) {
			throw {
				type: "BUSINESS_ERROR",
				message: "No lote available",
			};
		}

		const updated = await tx.lotes.updateMany({
			where: {
				id: lote.id,
				total: {
					gte: lote.reserved + ticketQuantity,
				},
			},
			data: {
				reserved: {
					increment: ticketQuantity,
				},
			},
		});

		if (updated.count === 0) {
			throw {
				type: "BUSINESS_ERROR",
				message: "Lote esgotado",
			};
		}

		const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

		const order = await tx.orders.create({
			data: {
				event_id: eventId,
				status: "PENDING",
				ticket_quantity: ticketQuantity,
				expires_at: expiresAt,
			},
		});


		return {
			orderId: order.id,
			expiresAt,
			ticketQuantity,
		};
	});
}