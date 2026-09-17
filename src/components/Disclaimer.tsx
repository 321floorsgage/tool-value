import { DISCLAIMER } from "../lib/constants";

export function Disclaimer() {
  return (
    <footer className="mx-auto max-w-6xl px-4 pb-10 pt-6">
      <p className="max-w-[46rem] border-t border-line pt-4 text-sm text-muted">{DISCLAIMER}</p>
    </footer>
  );
}
