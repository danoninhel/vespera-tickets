const URL_REGEX = /^https?:\/\/.+/;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_URL_LENGTH = 500;
const MAX_ARTISTS = 20;
const MAX_LOTES = 10;
const MAX_CAPACITY = 100000;

function isValidUrl(str: string): boolean {
  return URL_REGEX.test(str);
}

function sanitizeString(str: string, maxLen: number): string {
  return str.trim().slice(0, maxLen);
}

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

    const title = body?.title?.trim();
    if (!title) {
      errors.push('title is required');
    } else if (title.length > MAX_TITLE_LENGTH) {
      errors.push(`title too long (max ${MAX_TITLE_LENGTH})`);
    }

    const description = body?.description?.trim();
    if (!description) {
      errors.push('description is required');
    } else if (description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(`description too long (max ${MAX_DESCRIPTION_LENGTH})`);
    }

    const image_url = body?.image_url?.trim();
    if (!image_url) {
      errors.push('image_url is required');
    } else if (!isValidUrl(image_url)) {
      errors.push('image_url must be a valid URL');
    } else if (image_url.length > MAX_URL_LENGTH) {
      errors.push(`image_url too long (max ${MAX_URL_LENGTH})`);
    }

    const capacity = body?.capacity;
    if (!capacity || capacity <= 0) {
      errors.push('capacity must be greater than 0');
    } else if (capacity > MAX_CAPACITY) {
      errors.push(`capacity too large (max ${MAX_CAPACITY})`);
    }

    const artists = body?.artists || [];
    if (artists.length > MAX_ARTISTS) {
      errors.push(`too many artists (max ${MAX_ARTISTS})`);
    }

    const lotes = body?.lotes || [];
    if (lotes.length === 0) {
      errors.push('at least one lote is required');
    } else if (lotes.length > MAX_LOTES) {
      errors.push(`too many lotes (max ${MAX_LOTES})`);
    } else {
      lotes.forEach((lote: any, index: number) => {
        if (!lote?.name?.trim()) {
          errors.push(`lotes[${index}].name is required`);
        }
        if (!lote?.price || lote.price <= 0) {
          errors.push(`lotes[${index}].price must be greater than 0`);
        }
        if (!lote?.total || lote.total <= 0) {
          errors.push(`lotes[${index}].total must be greater than 0`);
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
        title: sanitizeString(title, MAX_TITLE_LENGTH),
        description: sanitizeString(description, MAX_DESCRIPTION_LENGTH),
        image_url: sanitizeString(image_url, MAX_URL_LENGTH),
        capacity,
        artists: artists.slice(0, MAX_ARTISTS).map((a: string) => sanitizeString(a, 100)),
        lotes: lotes.slice(0, MAX_LOTES).map((l: any) => ({
          name: sanitizeString(l.name, 100),
          price: l.price,
          total: l.total,
        })),
      },
    };
  }
}

export const createEventValidator = new CreateEventValidator();