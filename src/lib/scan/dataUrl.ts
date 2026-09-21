import { ALLOWED_IMAGE_TYPES, type AllowedImageType } from "./limits";

export interface DataUrlInfo {
  mimeType: AllowedImageType;
  /** Decoded byte length of the image payload. */
  bytes: number;
}

const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

/**
 * Parses a base64 image data URL without decoding it into memory.
 * Returns null for anything that is not an allowed, well-formed image.
 */
export function inspectImageDataUrl(value: unknown): DataUrlInfo | null {
  if (typeof value !== "string") return null;
  const match = DATA_URL_PATTERN.exec(value.trim());
  if (!match) return null;

  const mimeType = match[1] as AllowedImageType;
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) return null;

  const base64 = match[2];
  // Base64 length must be a multiple of 4 to be decodable.
  if (base64.length % 4 !== 0 || base64.length === 0) return null;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const bytes = (base64.length / 4) * 3 - padding;
  if (bytes <= 0) return null;

  return { mimeType, bytes };
}

/** Approximate JSON request size for a set of data URLs plus a hint. */
export function requestPayloadBytes(images: string[], hint = ""): number {
  const imageChars = images.reduce((total, image) => total + image.length, 0);
  return imageChars + hint.length + 64;
}
