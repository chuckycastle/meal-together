/**
 * HTTP helpers: JSON responses, typed errors, and request body validation
 */

export class HttpError extends Error {
  status: number;
  extra?: Record<string, unknown>;

  constructor(status: number, message: string, extra?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export type Body = Record<string, unknown>;

const MAX_BODY_BYTES = 256 * 1024;

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

/** Parse a JSON object body. An empty body is an empty object. */
export async function readJson(request: Request): Promise<Body> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) throw new HttpError(413, 'Request body is too large');

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, 'Request body is too large');
  if (!text.trim()) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpError(400, 'Request body must be a JSON object');
  }
  return parsed as Body;
}

export const nowIso = (): string => new Date().toISOString();

interface TextOptions {
  max: number;
  required?: boolean;
}

/** Trim a text field and enforce its length. Empty optional text is null. */
export function text(value: unknown, field: string, { max, required = false }: TextOptions): string | null {
  if (value === undefined || value === null) {
    if (required) throw new HttpError(400, `${field} is required`);
    return null;
  }
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be text`);
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw new HttpError(400, `${field} is required`);
    return null;
  }
  if (trimmed.length > max) throw new HttpError(400, `${field} must be ${max} characters or fewer`);
  return trimmed;
}

export function requiredText(value: unknown, field: string, max: number): string {
  return text(value, field, { max, required: true }) as string;
}

interface IntOptions {
  min: number;
  max: number;
}

export function integer(value: unknown, field: string, { min, max }: IntOptions): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new HttpError(400, `${field} must be a whole number`);
  }
  if (value < min || value > max) throw new HttpError(400, `${field} must be between ${min} and ${max}`);
  return value;
}

/** Whole number, or null when the field is missing, null, or NaN (an empty number input) */
export function optionalInteger(value: unknown, field: string, options: IntOptions): number | null {
  if (value === undefined || value === null || (typeof value === 'number' && Number.isNaN(value))) return null;
  return integer(value, field, options);
}

export function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new HttpError(400, `${field} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

/** An http or https URL, or null. Other schemes are rejected. */
export function httpUrl(value: unknown, field: string, max = 500): string | null {
  const raw = text(value, field, { max });
  if (!raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new HttpError(400, `${field} must be a web address`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new HttpError(400, `${field} must start with http or https`);
  }
  return raw;
}

/** Parse an ISO 8601 date and time into canonical UTC text */
export function isoDateTime(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    throw new HttpError(400, `${field} must be an ISO 8601 date and time`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, `${field} must be an ISO 8601 date and time`);
  return date.toISOString();
}

export function list(value: unknown, field: string, max: number): Body[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new HttpError(400, `${field} must be a list`);
  if (value.length > max) throw new HttpError(400, `${field} can have at most ${max} entries`);
  return value.map((entry) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new HttpError(400, `${field} entries must be objects`);
    }
    return entry as Body;
  });
}
