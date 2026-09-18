// Refreshes preview/catalog-snapshot.json for the Claude Artifact preview build.
// Uses the same read-only query and publishable key as the app. Never writes to Supabase.
//   cp .env.example .env.local && npm run snapshot && npm run build:artifact
import { writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example).");
  process.exit(1);
}
if (key.startsWith("sb_secret_")) {
  console.error("Refusing to run with a secret key. Use the publishable key.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await supabase
  .from("tool_value_catalog")
  .select(
    "model_id,brand,model_number,tool_name,category,item_kind,sales_channel,condition_grade,value_low,expected_resale,value_high,fast_sale_price,maximum_recommended_buy,great_buy_price,estimated_fees,estimated_shipping,target_profit,risk_buffer,sold_sample_count,confidence_score,confidence_label,planning_note,image_url,image_alt,image_source_url,valuation_run_id,calculated_at,refreshed_at",
  )
  .order("brand")
  .order("model_number")
  .order("sales_channel");

if (error) {
  console.error(`Catalog read failed: ${error.message}`);
  process.exit(1);
}

const snapshot = {
  description:
    "Read-only snapshot of public.tool_value_catalog used ONLY by the Claude Artifact preview build (Artifact pages cannot reach Supabase). The Netlify app never imports this file. Regenerate with `npm run snapshot`.",
  captured_at: new Date().toISOString(),
  captured_as_role: "anon",
  row_count: data.length,
  rows: data,
};
await writeFile(new URL("../preview/catalog-snapshot.json", import.meta.url), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Saved ${data.length} rows to preview/catalog-snapshot.json`);
