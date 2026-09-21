import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_QUALITY,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_EDGE,
  MAX_REQUEST_BYTES,
  MAX_SOURCE_FILE_BYTES,
} from "./limits";
import { requestPayloadBytes } from "./dataUrl";

export interface ScanPhoto {
  id: string;
  /** Base64 data URL sent to the function. Memory only. */
  dataUrl: string;
  /** Object URL for the thumbnail; must be revoked when removed. */
  previewUrl: string;
  fileName: string;
  width: number;
  height: number;
  bytes: number;
  mimeType: string;
}

export type PhotoError =
  | { code: "unsupported_type"; message: string }
  | { code: "source_too_large"; message: string }
  | { code: "decode_failed"; message: string }
  | { code: "compress_failed"; message: string };

export class PhotoPrepareError extends Error {
  code: PhotoError["code"];
  constructor(error: PhotoError) {
    super(error.message);
    this.name = "PhotoPrepareError";
    this.code = error.code;
  }
}

/** Scales a photo so its longest edge is at most `maxEdge`, never upscaling. */
export function fitWithin(width: number, height: number, maxEdge = MAX_IMAGE_EDGE) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest === 0) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function validatePhotoFile(file: { type: string; size: number }): PhotoError | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return { code: "unsupported_type", message: "Use a JPEG, PNG, or WebP photo." };
  }
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    return { code: "source_too_large", message: "That photo is too large. Try a smaller one." };
  }
  return null;
}

/** Would adding this photo push the request over the budget? */
export function exceedsRequestBudget(existing: ScanPhoto[], next?: ScanPhoto, hint = ""): boolean {
  const images = [...existing.map((p) => p.dataUrl), ...(next ? [next.dataUrl] : [])];
  return requestPayloadBytes(images, hint) > MAX_REQUEST_BYTES;
}

const PREFERRED_TYPES = ["image/webp", "image/jpeg"] as const;

/**
 * Corrects EXIF orientation, resizes to the long-edge cap, and re-encodes at a
 * modest quality. Runs entirely in the browser; the original file is never
 * uploaded and nothing is persisted.
 */
export async function prepareScanPhoto(file: File): Promise<ScanPhoto> {
  const invalid = validatePhotoFile(file);
  if (invalid) throw new PhotoPrepareError(invalid);

  let bitmap: ImageBitmap;
  try {
    // "from-image" applies the EXIF orientation flag for us.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoPrepareError({ code: "decode_failed", message: "That photo couldn't be read. Try again." });
  }

  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new PhotoPrepareError({ code: "compress_failed", message: "This browser can't resize photos." });
    }
    context.drawImage(bitmap, 0, 0, width, height);

    let encoded: { dataUrl: string; mimeType: string } | null = null;
    for (const type of PREFERRED_TYPES) {
      for (const quality of [IMAGE_QUALITY, 0.62, 0.5]) {
        const dataUrl = canvas.toDataURL(type, quality);
        if (!dataUrl.startsWith(`data:${type}`)) break; // type unsupported here
        if (approximateBytes(dataUrl) <= MAX_IMAGE_BYTES) {
          encoded = { dataUrl, mimeType: type };
          break;
        }
      }
      if (encoded) break;
    }
    if (!encoded) {
      throw new PhotoPrepareError({
        code: "compress_failed",
        message: "That photo is still too large after compressing. Try a plainer, closer shot.",
      });
    }

    return {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      dataUrl: encoded.dataUrl,
      previewUrl: URL.createObjectURL(file),
      fileName: file.name || "photo",
      width,
      height,
      bytes: approximateBytes(encoded.dataUrl),
      mimeType: encoded.mimeType,
    };
  } finally {
    bitmap.close?.();
  }
}

export function approximateBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length / 4) * 3) - padding);
}

/** Releases a thumbnail's object URL. Safe to call more than once. */
export function releasePhoto(photo: ScanPhoto): void {
  try {
    URL.revokeObjectURL(photo.previewUrl);
  } catch {
    // Nothing to release in environments without object URLs.
  }
}
