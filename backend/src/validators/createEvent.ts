interface CreateEventInput {
  title: string;
  description: string;
  image_url: string;
  capacity: number;
  artists?: string[];
  lotes?: {
    name: string;
    price: number;
    total: number;
  }[];
}

export class CreateEventValidator {
  validate(input: any): { valid: boolean; errors: string[]; data?: CreateEventInput } {
    const errors: string[] = [];
    
    let body = input;
    if (typeof input === 'string') {
      try {
        body = JSON.parse(input);
      } catch {
        return { valid: false, errors: ['Invalid JSON body'] };
      }
    }

    if (!body?.title?.trim()) {
      errors.push('title is required');
    }

    if (!body?.description?.trim()) {
      errors.push('description is required');
    }

    if (!body?.image_url?.trim()) {
      errors.push('image_url is required');
    }

    if (!body?.capacity || body.capacity <= 0) {
      errors.push('capacity must be greater than 0');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return {
      valid: true,
      errors: [],
      data: {
        title: body.title,
        description: body.description,
        image_url: body.image_url,
        capacity: body.capacity,
        artists: body.artists,
        lotes: body.lotes,
      },
    };
  }
}

export const createEventValidator = new CreateEventValidator();