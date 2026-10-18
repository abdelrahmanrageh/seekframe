// Ambient types for film.js files:  /// <reference path="…/dist/types/browser/film-globals.d.ts" />  plus  // @ts-check
import type { SFApi } from './api';
import type { LogoStrokes, Manifest } from '../types';
declare global {
  const SF: SFApi;
  interface Window { SF: SFApi; manifest: Manifest; BRAND?: { name: string; colors: Record<string, string>; voice?: { tone?: string; tagline?: string } }; FILM_LANG?: string; ASSET_BASE?: string }
}
export {};
