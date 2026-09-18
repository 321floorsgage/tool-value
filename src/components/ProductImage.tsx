import { useState } from "react";

interface ProductImageProps {
  src: string | null;
  alt: string | null;
  brand: string;
  modelNumber: string;
  sourceUrl: string | null;
}

/**
 * One image for the selected model, straight from the catalog row. A missing or
 * broken image falls back to a placeholder of the same size, so the page never
 * shifts and the valuation is never blocked.
 */
export function ProductImage({ src, alt, brand, modelNumber, sourceUrl }: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const canShowImage = src !== null && failedSrc !== src;
  const resolvedAlt = alt ?? `${brand} ${modelNumber} product image`;

  return (
    <figure data-testid="product-image" className="m-0">
      <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface p-2 sm:h-48 sm:w-48">
        {canShowImage ? (
          <img
            data-testid="product-image-img"
            src={src}
            alt={resolvedAlt}
            width={800}
            height={800}
            loading="eager"
            decoding="async"
            onError={() => setFailedSrc(src)}
            className="h-full w-full object-contain"
          />
        ) : (
          <div
            role="img"
            aria-label={`${brand} ${modelNumber}: image unavailable`}
            data-testid="product-image-placeholder"
            className="flex h-full w-full flex-col items-center justify-center gap-1 rounded bg-sunk px-2 text-center"
          >
            <span className="num font-display text-xl font-bold leading-tight">{modelNumber}</span>
            <span className="text-sm text-muted">Image unavailable</span>
          </div>
        )}
      </div>
      {sourceUrl && (
        <figcaption className="mt-1 w-40 text-center sm:w-48">
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted underline decoration-line-strong underline-offset-2 hover:text-ink"
          >
            View image source ↗
          </a>
        </figcaption>
      )}
    </figure>
  );
}
