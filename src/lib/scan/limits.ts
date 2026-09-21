/** Shared upload limits. The browser checks these before sending; the
 *  function re-checks them because a client can never be trusted. */
export const MAX_PHOTOS = 3;
export const MIN_PHOTOS = 1;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** Longest edge after in-browser resizing. */
export const MAX_IMAGE_EDGE = 1280;
export const IMAGE_QUALITY = 0.78;

/** Raw file a phone may hand us before compression. */
export const MAX_SOURCE_FILE_BYTES = 25 * 1024 * 1024;
/** Per compressed image, after encoding. */
export const MAX_IMAGE_BYTES = 1_600_000;
/** Whole JSON request, safely under Netlify's synchronous 4.5 MB limit. */
export const MAX_REQUEST_BYTES = 4_200_000;
/** Free text hint. */
export const MAX_HINT_LENGTH = 120;

export const CONFIDENCE_HIGHLIGHT = 0.85;
export const CONFIDENCE_CHOICE = 0.6;
