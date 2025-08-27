/**
 * Multi-Calendar Grid Card — Lit + TypeScript (no decorators) v0.7.0
 * - All-day end = exclusive; date-only formatting for all-day
 * - Legend persistence (localStorage), namespaced per-card
 * - slot_minutes drives grid ticks
 * - ha-dialog details (fallback overlay)
 * - Abort stale fetches; per-entity error messages
 * - getStubConfig for card picker; i18n helper; ARIA
 * - Version injected at build (__VERSION__), default "dev"
 */

import { LitElement, html, css, nothing, PropertyValues } from "lit";

// Build-time injected by CI; fallback to "dev" locally
declare const __VERSION__: string | undefined;
const VERSION = typeof __VERSION__ !== "undefined" && __VERSION__ ? __VERSION__ : "dev";

// ---------- Types ----------
export interface McgEntityConfig {
  entity: string;
  name?: string;
  color?: string;
}
export interface McgConfig {
  type?: string;
  entities: McgEntityConfig[];
  first_day?: number; // 0=Sun..6=Sat (default 1 Mon)
  slot_min_time?: string; // "HH:MM:SS"
  slot_max_time?: string; // "HH:MM:SS" (informational)
  slot_minutes?: number; // grid minor tick step
  locale?: string;
  show_now_indicator?: boolean;
  show_all_day?: boolean;
  height_vh?: number; // viewport height
  remember_offset?: boolean;
  storage_key?: string; // legacy; now we namespace automatically
  header_compact?: boolean;
  data_refresh_minutes?: number;
  px_per_min?: number; // vertical scale
}

interface HassEntityEventRaw {
  start: any;
  end: any;
  summary?: string;
  location?: string;
  description?: string;
  [k: string]: any;
}
interface NormalizedEvent {
  s: Date;
  e: Date;
  allDay: boolean;
  summary: string;
  location?: string;
  description?: string;
  color: string;
  src: string;
  raw: HassEntityEventRaw;
}
interf
