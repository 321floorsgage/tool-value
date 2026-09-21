import { describe, expect, it, vi } from "vitest";
import {
  approximateBytes,
  exceedsRequestBudget,
  fitWithin,
  releasePhoto,
  validatePhotoFile,
  type ScanPhoto,
} from "../lib/scan/images";
import { MAX_IMAGE_EDGE, MAX_SOURCE_FILE_BYTES } from "../lib/scan/limits";

const photo = (dataUrl: string): ScanPhoto => ({
  id: "1",
  dataUrl,
  previewUrl: "blob:preview",
  fileName: "tool.jpg",
  width: 1280,
  height: 960,
  bytes: approximateBytes(dataUrl),
  mimeType: "image/jpeg",
});

describe("fitWithin", () => {
  it("caps the long edge and keeps the aspect ratio", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 960, height: 1280 });
    expect(Math.max(...Object.values(fitWithin(6000, 200)))).toBe(MAX_IMAGE_EDGE);
  });

  it("never upscales a small photo", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(0, 0)).toEqual({ width: 0, height: 0 });
  });
});

describe("validatePhotoFile", () => {
  it("accepts the three supported types", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validatePhotoFile({ type, size: 1_000 })).toBeNull();
    }
  });

  it.each(["image/gif", "image/heic", "application/pdf", "image/svg+xml", ""])("rejects %s", (type) => {
    expect(validatePhotoFile({ type, size: 1_000 })?.code).toBe("unsupported_type");
  });

  it("rejects an enormous source file", () => {
    expect(validatePhotoFile({ type: "image/jpeg", size: MAX_SOURCE_FILE_BYTES + 1 })?.code).toBe("source_too_large");
  });
});

describe("request budget", () => {
  it("allows a normal set of three photos", () => {
    const small = photo(`data:image/jpeg;base64,${"A".repeat(400_000)}`);
    expect(exceedsRequestBudget([small, small], small)).toBe(false);
  });

  it("blocks a set that would exceed the function payload limit", () => {
    const large = photo(`data:image/jpeg;base64,${"A".repeat(2_000_000)}`);
    expect(exceedsRequestBudget([large, large], large)).toBe(true);
  });
});

describe("releasePhoto", () => {
  it("revokes the thumbnail URL and survives a missing API", () => {
    const revoke = vi.fn();
    const original = URL.revokeObjectURL;
    URL.revokeObjectURL = revoke;
    releasePhoto(photo("data:image/jpeg;base64,AAAA"));
    expect(revoke).toHaveBeenCalledWith("blob:preview");
    URL.revokeObjectURL = () => {
      throw new Error("unsupported");
    };
    expect(() => releasePhoto(photo("data:image/jpeg;base64,AAAA"))).not.toThrow();
    URL.revokeObjectURL = original;
  });
});
