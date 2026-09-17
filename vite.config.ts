import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Two targets share every component, calculation, and style:
//  - default mode  -> the Netlify app, which reads Supabase live.
//  - "artifact"    -> a single self-contained HTML file for the Claude Artifact
//                     preview. Artifact pages cannot make network requests, so
//                     this target swaps ONLY the catalog source for a labeled
//                     snapshot of the live catalog (see preview/).
export default defineConfig(({ mode }) => {
  const isArtifact = mode === "artifact";
  const catalogSource = isArtifact
    ? "./preview/catalogSource.snapshot.ts"
    : "./src/lib/catalogSource.live.ts";

  return {
    plugins: [react(), tailwindcss(), ...(isArtifact ? [viteSingleFile()] : [])],
    resolve: {
      alias: {
        "@catalog-source": fileURLToPath(new URL(catalogSource, import.meta.url)),
      },
    },
    build: {
      outDir: isArtifact ? "dist-artifact" : "dist",
      sourcemap: false,
    },
  };
});
