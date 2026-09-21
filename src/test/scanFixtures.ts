import type { ToolScanCatalogRow } from "../types/scan";

export function makeScanRow(overrides: Partial<ToolScanCatalogRow> = {}): ToolScanCatalogRow {
  return {
    model_id: 2,
    brand: "Milwaukee Tool",
    model_number: "2904-20",
    tool_name: "M18 FUEL 1/2 in. Hammer Drill/Driver",
    category: "Drills",
    item_kind: "tool",
    battery_platform: "M18",
    power_source: "cordless",
    generation: null,
    bare_tool_or_kit: "bare_tool",
    image_url: "https://images.example.com/milwaukee-2904-20.jpg",
    image_alt: "Milwaukee Tool 2904-20 — M18 FUEL 1/2 in. Hammer Drill/Driver",
    image_source_url: "https://example.com/products/2904-20",
    aliases: ["290420"],
    search_text: "milwaukee tool 2904-20 m18 fuel hammer drill drills",
    updated_at: "2026-09-19T17:07:00.239301+00:00",
    ...overrides,
  };
}

export const scanCatalog: ToolScanCatalogRow[] = [
  makeScanRow(),
  makeScanRow({
    model_id: 19,
    brand: "DEWALT",
    model_number: "DCN680B",
    tool_name: "20V MAX XR 18 Gauge Brad Nailer",
    category: "Nailers",
    battery_platform: "20V MAX",
    image_url: "https://images.example.com/dewalt-dcn680b.jpg",
    image_alt: "DEWALT DCN680B — 20V MAX XR 18 Gauge Brad Nailer",
    aliases: ["DCN 680B"],
  }),
];

/** A 1x1 JPEG, enough to satisfy the data-URL validator in tests. */
export const TINY_JPEG_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDIzNP/AABEIAAEAAQMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/aAAwDAQACEQMRAD8A/v4ooooA/9k=";

export function makeAiOutput(overrides: Record<string, unknown> = {}) {
  return {
    observations: {
      brand: "Milwaukee",
      visible_model_number: "2904-20",
      tool_type: "Hammer drill/driver",
      voltage_or_platform: "M18",
      kit_contents: [],
      visible_markings: ["FUEL"],
    },
    candidates: [{ model_id: 2, confidence: 0.93, evidence: ["Model number readable"], uncertainty: [] }],
    needs_more_photos: false,
    photo_guidance: [],
    ...overrides,
  };
}
