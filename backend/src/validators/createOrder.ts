const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TICKETS_PER_ORDER = 10;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 150;

function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

function isValidEmail(str: string): boolean {
  return EMAIL_REGEX.test(str);
}

function sanitizeString(str: string, maxLen: number): string {
  return str.trim().slice(0, maxLen);
}

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
    } else if (!isValidUUID(body.event_id)) {
      errors.push('event_id must be a valid UUID');
    }

    if (!Array.isArray(body?.tickets) || body.tickets.length === 0) {
      errors.push('tickets must be a non-empty array');
    } else if (body.tickets.length > MAX_TICKETS_PER_ORDER) {
      errors.push(`maximum ${MAX_TICKETS_PER_ORDER} tickets per order`);
    } else {
      const sanitizedTickets = body.tickets.map((ticket: any, index: number) => {
        const name = ticket?.name?.trim();
        const email = ticket?.email?.trim();
        
        if (!name) {
          errors.push(`tickets[${index}].name is required`);
        } else if (name.length > MAX_NAME_LENGTH) {
          errors.push(`tickets[${index}].name too long (max ${MAX_NAME_LENGTH})`);
        }
        
        if (!email) {
          errors.push(`tickets[${index}].email is required`);
        } else if (!isValidEmail(email)) {
          errors.push(`tickets[${index}].email is invalid`);
        }

        return {
          name: sanitizeString(name || '', MAX_NAME_LENGTH),
          email: sanitizeString(email || '', MAX_EMAIL_LENGTH),
        };
      });

      if (errors.length > 0) {
        return { valid: false, errors };
      }

      return {
        valid: true,
        errors: [],
        data: {
          event_id: body.event_id,
          tickets: sanitizedTickets,
        },
      };
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