import { useId, useRef } from "react";
import type { ScanPhoto } from "../../lib/scan/images";
import { MAX_PHOTOS } from "../../lib/scan/limits";

interface PhotoPickerProps {
  photos: ScanPhoto[];
  busy: boolean;
  onAdd: (files: FileList | null) => void;
  onRemove: (id: string) => void;
}

const ANGLES = [
  "The whole tool, straight on",
  "Close-up of the model-number label",
  "Any battery or kit parts included",
];

export function PhotoPicker({ photos, busy, onAdd, onRemove }: PhotoPickerProps) {
  const id = useId();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const full = photos.length >= MAX_PHOTOS;

  return (
    <div>
      <h2 className="font-display text-xl font-bold">Photos of one tool</h2>
      <p className="mt-0.5 text-[0.95rem] text-muted">
        Up to {MAX_PHOTOS}. These angles help most:
      </p>
      <ol className="mt-1 ml-5 list-decimal space-y-0.5 text-[0.95rem] text-muted">
        {ANGLES.map((angle) => (
          <li key={angle}>{angle}</li>
        ))}
      </ol>

      <input
        ref={cameraRef}
        id={`${id}-camera`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        className="sr-only"
        onChange={(e) => {
          onAdd(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={libraryRef}
        id={`${id}-library`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(e) => {
          onAdd(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={full || busy}
          aria-label="Take a photo with the camera"
          onClick={() => cameraRef.current?.click()}
          className="min-h-13 rounded-md bg-ink px-2 font-display text-base font-bold leading-tight text-bg disabled:opacity-50"
        >
          Take photo
        </button>
        <button
          type="button"
          disabled={full || busy}
          onClick={() => libraryRef.current?.click()}
          className="min-h-13 rounded-md border-2 border-line-strong bg-surface px-2 font-display text-base font-bold leading-tight text-ink disabled:opacity-50"
        >
          Choose from photos
        </button>
      </div>
      {full && <p className="mt-2 text-sm text-muted">That's {MAX_PHOTOS} photos. Remove one to swap it out.</p>}

      {photos.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <li key={photo.id} className="relative">
              <img
                src={photo.previewUrl}
                alt={`Photo ${index + 1} of the tool`}
                className="aspect-square w-full rounded-md border border-line bg-sunk object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(photo.id)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-ink/85 font-display text-xl font-bold text-bg"
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
