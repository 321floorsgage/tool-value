import type { IdentifyToolRequest } from "../../types/scan";
import { inspectImageDataUrl, requestPayloadBytes } from "./dataUrl";
import { MAX_HINT_LENGTH, MAX_IMAGE_BYTES, MAX_PHOTOS, MAX_REQUEST_BYTES, MIN_PHOTOS } from "./limits";

export type RequestValidation =
  | { ok: true; value: IdentifyToolRequest }
  | { ok: false; error: RequestErrorCode; message: string };

export type RequestErrorCode =
  | "invalid_json"
  | "no_images"
  | "too_many_images"
  | "invalid_image"
  | "image_too_large"
  | "request_too_large"
  | "invalid_hint";

/**
 * Validates an identify-tool request body. Shared so the browser can fail fast
 * and the Netlify Function can enforce the same rules on untrusted input.
 */
export function validateIdentifyRequest(body: unknown): RequestValidation {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "invalid_json", message: "Send a JSON object with an images array." };
  }

  const { images, hint } = body as { images?: unknown; hint?: unknown };

  if (!Array.isArray(images) || images.length < MIN_PHOTOS) {
    return { ok: false, error: "no_images", message: "Add at least one photo of the tool." };
  }
  if (images.length > MAX_PHOTOS) {
    return { ok: false, error: "too_many_images", message: `Send at most ${MAX_PHOTOS} photos.` };
  }

  for (const image of images) {
    const info = inspectImageDataUrl(image);
    if (!info) {
      return {
        ok: false,
        error: "invalid_image",
        message: "Photos must be base64 JPEG, PNG, or WebP data URLs.",
      };
    }
    if (info.bytes > MAX_IMAGE_BYTES) {
      return { ok: false, error: "image_too_large", message: "One photo is too large after compression." };
    }
  }

  let cleanHint = "";
  if (hint !== undefined && hint !== null && hint !== "") {
    if (typeof hint !== "string") {
      return { ok: false, error: "invalid_hint", message: "The hint must be text." };
    }
    cleanHint = hint.trim().slice(0, MAX_HINT_LENGTH);
  }

  if (requestPayloadBytes(images as string[], cleanHint) > MAX_REQUEST_BYTES) {
    return {
      ok: false,
      error: "request_too_large",
      message: "These photos are too large to send. Remove one or retake it.",
    };
  }

  return {
    ok: true,
    value: cleanHint ? { images: images as string[], hint: cleanHint } : { images: images as string[] },
  };
}
