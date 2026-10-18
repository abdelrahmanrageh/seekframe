// Globals that film pages define (see docs/FILM_SPEC.md); used by the code that drives pages through Playwright.
interface Window {
  seek: (frame: number) => void;
  ready: Promise<boolean>;
  manifest: import('./types').Manifest;
  applyParams: (values: Record<string, unknown>) => void;
  FILM_LANG?: string; FILM_RTL?: boolean; ASSET_BASE?: string;
  BRAND?: { name: string; nameLocal?: Record<string, string>; colors: Record<string, string>; voice?: { tone?: string; tagline?: string }; logo?: unknown };
  Timeline: typeof import('./core/timeline');
}
declare const Timeline: typeof import('./core/timeline');   // the browser bundle injected into pages (dist/browser/timeline.js)
