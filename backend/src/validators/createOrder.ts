export interface CreateOrderInput {
  event_id: string;
  tickets: {
    name: string;
    email: string;
  }[];
}

export class CreateOrderValidator {
  validate(input: any): { valid: boolean; errors: string[]; data?: CreateOrderInput } {
    const errors: string[] = [];
    
    let body = input;
    if (typeof input === 'string') {
      try {
        body = JSON.parse(input);
      } catch {
        return { valid: false, errors: ['Invalid JSON body'] };
      }
    }

    if (!body?.event_id) {
      errors.push('event_id is required');
    }

    if (!Array.isArray(body?.tickets) || body.tickets.length === 0) {
      errors.push('tickets must be a non-empty array');
    } else {
      body.tickets.forEach((ticket: any, index: number) => {
        if (!ticket?.name?.trim()) {
          errors.push(`tickets[${index}].name is required`);
        }
        if (!ticket?.email?.trim()) {
          errors.push(`tickets[${index}].email is required`);
        }
      });
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return {
      valid: true,
      errors: [],
      data: {
        event_id: body.event_id,
        tickets: body.tickets,
      },
    };
  }
}

export const createOrderValidator = new CreateOrderValidator();