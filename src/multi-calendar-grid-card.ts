/* Multi-Calendar Grid Card
 * v0.7.1 (today-start + DOM weather only)
 * ---------------------------------------------------------------------
 * - Week view now starts at *today* by default (configurable).
 * - Removed any built-in header-weather rendering. Weather should be
 *   injected by the DOM addon only to avoid duplicates.
 * - Minor tidy-ups & footer version bump.
 * ---------------------------------------------------------------------
 */

import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";

/** Public card tag/type */
export const CARD_TAG = "multi-calendar-grid-card";
export const CARD_TYPE = CARD_TAG;
export const CARD_VERSION = "0.7.1";

/** Defaults */
const DEFAULTS = {
  first_day: 1,                 // used when start_from_today === false
  start_from_today: true,       // NEW: start 7-day view at today by default
  slot_min_time: "07:00:00",
  slot_max_time: "22:00:00",
  slot_minutes: 30,
  locale: "en",
  show_now_indicator: true,
  show_all_day: true,
  height_vh: 80,
  remember_offset: true,
  storage_key: `${CARD_TYPE}.weekOffset`,
  header_compact: false,
  data_refresh_minutes: 5,
  px_per_min: 1.6,
};

type EntityCfg = {
  entity: string;
  name?: string;
  color?: string;
};

export type MultiCalendarGridCardConfig = {
  type: string;
  entities: EntityCfg[];

  /** Original: start of week day (1=Mon). Only used if start_from_today=false */
  first_day?: number;

  /** NEW: roll the 7-day grid from *today* (default: true) */
  start_from_today?: boolean;

  slot_min_time?: string;
  slot_max_time?: string;
  slot_minutes?: number;
  locale?: string;
  show_now_indicator?: boolean;
  show_all_day?: boolean;
  height_vh?: number;
  remember_offset?: boolean;
  header_compact?: boolean;
  data_refresh_minutes?: number;
  px_per_min?: number;

  /** (kept for compatibility, but weather is handled by DOM addon) */
  weather_entity?: string;
  weather_days?: number;
  weather_compact?: boolean;
};

/* -------------------------------- Utilities ------------------------------- */

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

const timeHHMMSS = (v?: string) => /^\d{2}:\d{2}:\d{2}$/.test(String(v || ""));

const minutesOf = (hhmmss: string) => {
  const [h, m, s] = hhmmss.split(":").map(Number);
  return h * 60 + m + (s || 0) / 60;
};

const startOfWeek = (d: Date, firstDay: number) => {
  const e = new Date(d);
  const s = (e.getDay() + 7 - (firstDay % 7)) % 7;
  e.setHours(0, 0, 0, 0);
  e.setDate(e.getDate() - s);
  return e;
};

const addMinutes = (d: Date, mins: number) => {
  const e = new Date(d);
  e.setMinutes(e.getMinutes() + mins);
  return e;
};

const hexOrVar = (raw?: string) => {
  const v = String(raw || "").trim();
  if (!v) return { raw: "#3366cc", hex: "#3366cc" };
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return { raw: v, hex: v };
  if (/^rgba?\(/i.test(v)) return { raw: v, hex: null };
  if (/^var\(--/.test(v)) return { raw: v, hex: null };
  return { raw: "#3366cc", hex: "#3366cc" };
};

const hexToRGB = (hex: string) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : { r: 51, g: 102, b: 204 };
};

const textColorOn = (hex: string) => {
  const { r, g, b } = hexToRGB(hex);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.6 ? "#111" : "#fff";
};

const rgbaOf = (hex: string, alpha = 0.55) => {
  const { r, g, b } = hexToRGB(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

function hashStable(s: string) {
  let t = 5381;
  for (let i = 0; i < s.length; i++) t = (t * 33) ^ s.charCodeAt(i);
  return (t >>> 0).toString(36);
}

/* ------------------------------- Card Class -------------------------------- */

@customElement(CARD_TAG)
export class MultiCalendarGridCard extends LitElement {
  static version = CARD_VERSION;

  /** HA will set this property for us. Keep it un-decorated to avoid decorator type issues. */
  public hass: any;

  @state() private _config!: MultiCalendarGridCardConfig;
  @state() private _weekOffset = 0;
  @state() private _error: string | null = null;
  @state() private _weekStart!: Date;
  @state() private _days: Array<{
    date: Date;
    allDay: any[];
    timed: Array<{ n: any; top: number; height: number; lane: number }>;
    laneCount: number;
  }> = [];

  @state() private _dialogOpen = false;
  @state() private _dialogEvent: any | undefined;

  private _lastFetchId = 0;
  private _tick?: number;
  private _refresh?: number;
  private _nsBase = "";

  /* -------------------------- Lovelace integration ------------------------- */

  static async getStubConfig(hass: any): Promise<MultiCalendarGridCardConfig> {
    const states = hass?.states || {};
    const cals = Object.keys(states).filter((k) => k.startsWith("calendar.")).slice(0, 2);
    const palette = ["#3f51b5", "#9c27b0", "#03a9f4", "#009688", "#ff9800", "#e91e63"];
    const entities: EntityCfg[] =
      cals.length > 0
        ? cals.map((id, i) => ({
            entity: id,
            name: states[id]?.attributes?.friendly_name || id,
            color: palette[i % palette.length],
          }))
        : [{ entity: "calendar.calendar", name: "Calendar", color: palette[0] }];
    return {
      type: CARD_TYPE,
      entities,
      // sensible dev defaults
      first_day: 1,
      start_from_today: true,
      slot_min_time: "07:00:00",
      slot_max_time: "22:00:00",
      slot_minutes: 30,
      locale: "en",
      show_now_indicator: true,
      show_all_day: true,
      remember_offset: true,
      header_compact: false,
      height_vh: 80,
      data_refresh_minutes: 5,
      px_per_min: 1.6,
    };
  }

  static getConfigElement() {
    const el = document.createElement("div");
    el.innerHTML = `<div style="padding:8px">Use YAML to configure this card. Editor coming later. (v${CARD_VERSION})</div>`;
    return el;
  }

  public setConfig(cfg: MultiCalendarGridCardConfig) {
    if (!cfg || !Array.isArray(cfg.entities) || cfg.entities.length === 0) {
      throw new Error("Config must include at least one entity in 'entities'.");
    }
    if (!timeHHMMSS(cfg.slot_min_time)) throw new Error("slot_min_time must be HH:MM:SS");
    if (!timeHHMMSS(cfg.slot_max_time)) throw new Error("slot_max_time must be HH:MM:SS");

    const mins = Number(cfg.slot_minutes ?? DEFAULTS.slot_minutes);
    if (!Number.isFinite(mins) || mins <= 0 || mins > 180) {
      throw new Error("slot_minutes must be a number between 1 and 180.");
    }

    // merge defaults
    this._config = {
      ...DEFAULTS,
      ...cfg,
      start_from_today: cfg.start_from_today ?? true,
    };

    // namespace for localStorage
    const stable = JSON.stringify({
      entities: this._config.entities.map((e) => e.entity).sort(),
      first_day: this._config.first_day,
      start_from_today: this._config.start_from_today,
    });
    this._nsBase = `${CARD_TYPE}.${hashStable(stable)}`;

    // restore offset
    try {
      if (this._config.remember_offset) {
        const off = Number(localStorage.getItem(`${this._nsBase}.weekOffset`));
        this._weekOffset = Number.isFinite(off) ? off : 0;
      } else {
        this._weekOffset = 0;
      }
    } catch {
      this._weekOffset = 0;
    }

    this._recomputeWeekStart();
  }

  public getCardSize(): number {
    const vh = Number(this._config?.height_vh || 80);
    const px = Math.max(300, vh * 7);
    return Math.ceil(px / 50);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._startTimers();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopTimers();
  }

  firstUpdated(): void {
    this._restoreScroll();
  }

  updated(changed: PropertyValues<this>): void {
    if (changed.has("_config")) {
      this._recomputeWeekStart();
      this._fetchEvents();
      this.updateComplete.then(() => this._restoreScroll());
    }
  }

  /* ------------------------------- Timers ---------------------------------- */

  private _startTimers() {
    this._stopTimers();
    this._tick = window.setInterval(() => this.requestUpdate(), 60 * 1000);
    const mins = clamp(Number(this._config?.data_refresh_minutes) || 5, 1, 60);
    this._refresh = window.setInterval(() => this._fetchEvents(), mins * 60 * 1000);
  }

  private _stopTimers() {
    if (this._tick) window.clearInterval(this._tick);
    if (this._
