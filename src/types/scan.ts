/** Contract for public.tool_scan_catalog (read-only, managed by Codex). */
export interface ToolScanCatalogRow {
  model_id: number;
  brand: string;
  model_number: string;
  tool_name: string;
  category: string;
  item_kind: string;
  battery_platform: string | null;
  power_source: string | null;
  generation: string | null;
  bare_tool_or_kit: string | null;
  image_url: string | null;
  image_alt: string | null;
  image_source_url: string | null;
  aliases: string[];
  search_text: string;
  updated_at: string;
}

export interface ScanObservations {
  brand: string | null;
  visible_model_number: string | null;
  tool_type: string | null;
  voltage_or_platform: string | null;
  kit_contents: string[];
  visible_markings: string[];
}

export interface ScanCandidate {
  model: ToolScanCatalogRow;
  /** 0 through 1. */
  confidence: number;
  evidence: string[];
  uncertainty: string[];
}

export type ScanMatchStatus = "candidates" | "unsupported_or_uncertain";

export interface IdentifyToolResponse {
  request_id: string;
  match_status: ScanMatchStatus;
  observations: ScanObservations;
  candidates: ScanCandidate[];
  needs_more_photos: boolean;
  photo_guidance: string[];
}

export interface IdentifyToolRequest {
  /** 1 to 3 data URLs, JPEG/PNG/WebP only. */
  images: string[];
  /** Optional free-text hint the user typed, e.g. a label they can read. */
  hint?: string;
}

export interface IdentifyToolErrorBody {
  error: string;
  message: string;
  request_id?: string;
  retryable?: boolean;
}
