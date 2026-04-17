const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

export interface ValidateTicketInput {
  code: string;
}

export class ValidateTicketValidator {
  validate(input: any): { valid: boolean; errors: string[]; data?: ValidateTicketInput } {
    const errors: string[] = [];
    
    let body = input;
    if (typeof input === 'string') {
      try {
        body = JSON.parse(input);
      } catch {
        return { valid: false, errors: ['Invalid JSON body'] };
      }
    }

    const code = body?.code?.trim();
    if (!code) {
      errors.push('code is required');
    } else if (code.length > 50) {
      errors.push('code too long');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return {
      valid: true,
      errors: [],
      data: { code },
    };
  }
}

export const validateTicketValidator = new ValidateTicketValidator();

export interface GetOrderInput {
  id: string;
}

export class GetOrderValidator {
  validate(input: any): { valid: boolean; errors: string[]; data?: GetOrderInput } {
    const errors: string[] = [];
    
    const id = input?.id?.trim();
    if (!id) {
      errors.push('id is required');
    } else if (!isValidUUID(id)) {
      errors.push('id must be a valid UUID');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return {
      valid: true,
      errors: [],
      data: { id },
    };
  }
}

export const getOrderValidator = new GetOrderValidator();