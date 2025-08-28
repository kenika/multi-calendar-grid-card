/* Multi-Calendar Grid Card
 * Native weather headers + start_today logic
 * Version: 0.8.0-dev.3 (no decorators build)
 */

import { LitElement, css, html, nothing } from "lit";

/** Public card type & version */
export const CARD_TAG = "multi-calendar-grid-card";
export const VERSION = "0.8.0-dev.3";

/** Config */
export type EntityCfg = {
  entity: string;
  name?: string;
  color?: string;
};
export type MultiCalendarGridCardConfig = {
  type?: string;
  entities: EntityCfg[];

  /** TIME GRID */
  first_day?: number | "today"; // kept for backwards-compat; see start_today
  start_today?: boolean;        // NEW: defaults true; start 7-day window at "today"
  slot_min_time?: string;       // "07:00:00"
  slot_max_time?: string;       // "22:00:00"
  slot_minutes?: number;        // 30..180
  locale?: string;
  show_now_indicator?: boolean;
  show_all_day?: boolean;

  /** LAYOUT */
  header_compact?: boolean;
  height_vh?: number;
  px_per_min?: number;
  remember_offset?: boolean;
  storage_key?: string;

  /** DATA */
  data_refresh_minutes?: number;

  /** WEATHER */
  weather_entity?: string;
  weather_days?: number;      // default 7
  weather_compact?: boolean;  // (placeholder, future formatting toggle)
};

const DEFAULTS: Required<Pick<
  MultiCalendarGridCardConfig,
  | "slot_min_time"
  | "slot_max_time"
  | "slot_minutes"
  | "locale"
  | "show_now_indicator"
  | "show_all_day"
  | "height_vh"
  | "remember_offset"
  | "header_compact"
  | "data_refresh_minutes"
  | "px_per_min"
  | "storage_key"
  | "start_today"
>> = {
  slot_min_time: "07:00:00",
  slot_max_time: "22:00:00",
  slot_minutes: 30,
  locale: "en",
  show_now_indicator: true,
  show_all_day: true,
  height_vh: 80,
  remember_offset: true,
  header_compact: false,
  data_refresh_minutes: 5,
  px_per_min: 1.6,
  storage_key: `${CARD_TAG}.weekOffset`,
  start_today: true, // NEW default
};

const STRINGS = {
  en: {
    prev: "Prev",
    next: "Next",
    today: "Today",
    today_pill: "Today",
    no_events: "No events in this range.",
    event_details: "Event details",
    close: "Close",
    aria_prev_week: "Previous week",
    aria_next_week: "Next week",
    aria_today: "Go to current week",
    failed_load_prefix: "Failed to load:",
  },
};
function tr(lang: string | undefined, key: keyof typeof STRINGS["en"]): string {
  const base = (lang || "en").split("-")[0] as keyof typeof STRINGS;
  return STRINGS[base]?.[key] || STRINGS.en[key] || key;
}

/** Utils */
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const isHHMMSS = (v?: string) => /^\d{2}:\d{2}:\d{2}$/.test(String(v || ""));
const toMinutes = (hhmmss: string) => {
  const [H, M, S] = hhmmss.split(":").map(Number);
  return H * 60 + M + (S || 0) / 60;
};
const addMinutes = (d: Date, mins: number) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() + mins);
  return x;
};
const startOfWeek = (d: Date, firstDay: number) => {
  const x = new Date(d);
  const s = (x.getDay() + 7 - (firstDay % 7)) % 7;
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - s);
  return x;
};
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const sameYMD = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const colorToHex = (raw?: string) => {
  const t = String(raw || "").trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t)) return t.toLowerCase();
  if (/^rgba?\(/.test(t) || /^var\(--/.test(t)) return null; // cannot hex
  return "#3366cc";
};
const fgOn = (hex: string) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  const [r, g, b] = m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [51, 102, 204];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#111" : "#fff";
};
const rgba = (hex: string, a = 0.55) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  const [r, g, b] = m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [51, 102, 204];
  return `rgba(${r},${g},${b},${a})`;
};
const dayKey = (d: Date) => {
  const x = startOfDay(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

/** HA condition → icon */
const condIcon = (raw?: string) => {
  const c = String(raw || "").toLowerCase().replace(/\s+/g, "");
  const map: Record<string, string> = {
    "clear-night": "mdi:weather-night",
    cloudy: "mdi:weather-cloudy",
    fog: "mdi:weather-fog",
    hail: "mdi:weather-hail",
    lightning: "mdi:weather-lightning",
    "lightning-rainy": "mdi:weather-lightning-rainy",
    partlycloudy: "mdi:weather-partly-cloudy",
    pouring: "mdi:weather-pouring",
    rainy: "mdi:weather-rainy",
    snowy: "mdi:weather-snowy",
    "snowy-rainy": "mdi:weather-snowy-rainy",
    sunny: "mdi:weather-sunny",
    windy: "mdi:weather-windy",
    "windy-variant": "mdi:weather-windy-variant",
    exceptional: "mdi:weather-alert",
  };
  const norm = c
    .replace("overcast", "cloudy")
    .replace("partlysunny", "partlycloudy")
    .replace("mostlycloudy", "partlycloudy")
    .replace("drizzle", "rainy");
  return map[norm] || map[c] || "mdi:weather-cloudy";
};

/** Weather fetch (robust) */
type WItem = {
  datetime?: string;
  date?: string;
  time?: string;
  dt?: number;
  timestamp?: number;
  condition?: string;
  condition_description?: string;
  state?: string;
  symbol?: string;
  temperature?: number;
  temperature_high?: number;
  temperature_low?: number;
  templow?: number;
  temp?: number;
  precipitation_probability?: number;
  precipitation_chance?: number;
};

type WxDaily = { hi: number | null; lo: number | null; cond: string; pp?: number | null };

function toNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function maxNum(arr: any[]): number | null {
  let m: number | null = null;
  for (const v of arr) {
    const n = toNum(v);
    if (n == null) continue;
    m = m == null ? n : Math.max(m, n);
  }
  return m;
}
function mode<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  const c = new Map<T, number>();
  for (const v of arr) c.set(v, (c.get(v) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

async function wsForecast(hass: any, entity_id: string, type: "daily" | "hourly") {
  const payload = {
    type: "call_service",
    domain: "weather",
    service: "get_forecasts",
    service_data: { entity_id, type },
    return_response: true,
  };
  const resp = await hass.callWS(payload);
  const box = resp?.response ?? resp ?? {};
  const data = box[entity_id] ?? box;
  const list = data?.forecast ?? [];
  return Array.isArray(list) ? (list as WItem[]) : [];
}
function aggregateHourlyToDaily(hourly: WItem[], daysWanted: number): WItem[] {
  const by = new Map<string, WItem[]>();
  const todayK = dayKey(new Date());
  for (const h of hourly) {
    const t =
      h.datetime || h.date || h.time || (h.dt ? new Date(h.dt * 1000) : h.timestamp) || Date.now();
    const d = new Date(t as any);
    const k = dayKey(d);
    if (k < todayK) continue;
    if (!by.has(k)) by.set(k, []);
    by.get(k)!.push(h);
  }
  const out: WItem[] = [];
  for (const [k, list] of [...by.entries()].sort()) {
    let hi = -Infinity,
      lo = +Infinity;
    for (const it of list) {
      const t = toNum(it.temperature ?? it.temp);
      if (t == null) continue;
      if (t > hi) hi = t;
      if (t < lo) lo = t;
    }
    if (!Number.isFinite(hi)) hi = NaN;
    if (!Number.isFinite(lo)) lo = NaN;
    const cond =
      mode(
        list
          .map((it) => it.condition ?? it.condition_description ?? it.symbol ?? it.state)
          .filter(Boolean) as string[]
      ) || "-";
    const pp = maxNum(
      list.map((it) => it.precipitation_probability ?? it.precipitation_chance)
    );
    out.push({
      datetime: `${k}T12:00:00`,
      condition: cond,
      temperature: Number.isFinite(hi) ? hi : undefined,
      templow: Number.isFinite(lo) ? lo : undefined,
      precipitation_probability: pp ?? undefined,
    } as WItem);
    if (out.length >= daysWanted) break;
  }
  return out;
}
async function robustForecast(hass: any, entity_id: string, daysWanted: number) {
  try {
    const daily = await wsForecast(hass, entity_id, "daily");
    if (daily && daily.length) return { items: daily, kind: "daily" };
  } catch {}
  try {
    const hourly = await wsForecast(hass, entity_id, "hourly");
    if (hourly && hourly.length) {
      return { items: aggregateHourlyToDaily(hourly, daysWanted), kind: "hourly-aggregated" };
    }
  } catch {}
  const st = hass.states?.[entity_id];
  const attr = st?.attributes?.forecast;
  if (Array.isArray(attr) && attr.length) {
    return { items: attr as WItem[], kind: "attributes" };
  }
  return { items: [] as WItem[], kind: null as any };
}

/** Event shaping */
type CalEventRaw = any;
type CalEvent = {
  s: Date;
  e: Date;
  allDay: boolean;
  summary: string;
  location?: string;
  description?: string;
  color: string;
  src: string;
  raw: CalEventRaw;
};

export class MultiCalendarGridCard extends LitElement {
  /** HA wiring */
  hass: any;

  /** Internal (reactive via static properties) */
  private _config!: MultiCalendarGridCardConfig;
  private _error: string | null = null;
  private _weekOffset = 0;
  private _weekAnchor!: Date; // start of visible 7-day window
  private _days: {
    date: Date;
    allDay: CalEvent[];
    timed: { n: CalEvent; top: number; height: number; lane: number }[];
    laneCount: number;
  }[] = [];
  private _dialogOpen = false;
  private _dialogEvent?: CalEvent;

  // weather cache (keyed by YYYY-MM-DD)
  private _wxUnit = "°";
  private _wxByKey: Map<string, WxDaily> = new Map();
  private _lastFetchId = 0;
  private _tick?: number;
  private _refresh?: number;
  private _nsBase = "";

  /** Reactive properties (no decorators) */
  static properties = {
    hass: { attribute: false },
    _config: { attribute: false, state: true },
    _error: { attribute: false, state: true },
    _weekOffset: { attribute: false, state: true },
    _weekAnchor: { attribute: false, state: true },
    _days: { attribute: false, state: true },
    _dialogOpen: { attribute: false, state: true },
    _dialogEvent: { attribute: false, state: true },
  };

  /** ---- Card plumping ---- */
  static get version() {
    return VERSION;
  }

  static styles = css`
    :host{display:block}
    ha-card{border-radius:16px; overflow:hidden}
    .hdr{display:flex; justify-content:space-between; align-items:center; gap:14px; margin:12px}
    .legend{display:flex; gap:12px; flex-wrap:wrap; font-size:14px}
    .legend .item{display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none; padding:6px 10px; border-radius:999px}
    .legend .dot{width:14px; height:14px; border-radius:50%; display:inline-block}
    .legend .inactive{opacity:0.4; filter:grayscale(0.2)}
    .badge{border-radius:999px; padding:5px 14px; font-size:13px; background:var(--secondary-background-color, rgba(0,0,0,0.06)); color:var(--primary-text-color,#111)}
    .toolbar button{all:unset; cursor:pointer; padding:7px 14px; border-radius:999px; background:rgba(0,0,0,.06)}
    .toolbar button:focus{outline:2px solid var(--primary-color)}
    .error{color:#fff; background:#d32f2f; padding:6px 10px; border-radius:8px; font-size:12px; margin:0 12px 8px}
    .empty{color:var(--secondary-text-color); padding:8px 12px; font-size:12px}
    .scroll{height: var(--mcg-height, 80vh); margin: 0 12px 12px; overflow-y:auto; overscroll-behavior:contain; border:1px solid var(--divider-color,#e0e0e0); border-radius:12px; background:var(--divider-color,#e0e0e0)}
    .grid{position:relative; display:grid; grid-template-columns:70px repeat(7,1fr); gap:1px; background:var(--divider-color,#e0e0e0)}
    .col{background:var(--card-background-color,#fff); position:relative}
    .col.today{outline:2px solid var(--primary-color); outline-offset:-2px}
    .dayhdr{position:sticky; top:0; background:var(--card-background-color,#fff); z-index:2; font-weight:800; padding:8px 10px; border-bottom:1px solid var(--divider-color,#e0e0e0); display:flex; align-items:center; justify-content:space-between; gap:8px}
    .today-pill{border-radius:999px; background:#fff; color: var(--primary-color); font-size:10px; padding:2px 8px}
    .allday{padding:6px 8px; display:flex; flex-wrap:wrap; gap:6px 6px; border-bottom:1px solid var(--divider-color,#e0e0e0)}
    .pill{background: var(--secondary-background-color, rgba(0,0,0,.08)); color: var(--primary-text-color,#111); border-radius:10px; padding:2px 8px; font-size:12px; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
    .timecol{background:var(--card-background-color,#fff); position:relative}
    .tick{position:absolute; left:0; right:0; border-top:1px solid rgba(0,0,0,.1)}
    .tick.minor{border-top:1px dashed rgba(0,0,0,.08)}
    .hour-label{position:absolute; top:-8px; left:6px; font-size:12px; color:var(--secondary-text-color)}
    .body{position:relative}
    .event{position:absolute; border-radius:10px; padding:6px 8px; box-sizing:border-box; font-size:12px; line-height:1.15; overflow:hidden; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,.12)}
    .event .title{font-weight:700}
    .now{position:absolute; left:0; right:0; height:2px; background: var(--error-color,#e53935); z-index:3}
    .footer{font-size:10px; color:var(--secondary-text-color); text-align:right; margin:4px 12px 10px}

    /* Weather band (native) */
    .mcg-wx[data-native]{ display:flex; align-items:center; gap:6px; font-size:12px }
    .mcg-wx[data-native] .hi{ font-weight:700 }
    .mcg-wx[data-native] .lo{ color: var(--secondary-text-color) }
    .mcg-wx[data-native] .sep::before{ content:" / "; color: var(--secondary-text-color) }
    .mcg-wx[data-native] .pp{ color: var(--secondary-text-color); font-size:11px }
    .mcg-wx[data-native] ha-icon { --mdc-icon-size:20px }

    /* Fallback overlay dialog */
    .overlay{position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:10000}
    .modal{background:var(--card-background-color,#fff); color:var(--primary-text-color,#111); border-radius:12px; min-width:280px; max-width:560px; padding:16px; box-shadow:0 10px 30px rgba(0,0,0,.45)}
    .modal h3{margin:0 0 10px 0; font-size:18px}
    .modal .row{margin:8px 0; font-size:13px}
    .modal .actions{display:flex; justify-content:flex-end; gap:8px; margin-top:10px}
    .btn{all:unset; cursor:pointer; padding:6px 10px; border-radius:8px; background:rgba(0,0,0,.06)}
  `;

  /** Lovelace editor stub */
  static async getStubConfig(hass: any): Promise<MultiCalendarGridCardConfig> {
    const states = hass?.states || {};
    const calendars = Object.keys(states).filter((e) => e.startsWith("calendar.")).slice(0, 2);
    const palette = ["#3f51b5", "#9c27b0", "#03a9f4", "#009688", "#ff9800", "#e91e63"];
    const entities =
      calendars.length > 0
        ? calendars.map((e, i) => ({
            entity: e,
            name: states[e]?.attributes?.friendly_name || e,
            color: palette[i % palette.length],
          }))
        : [{ entity: "calendar.calendar", name: "Calendar", color: palette[0] }];
    return {
      type: CARD_TAG,
      entities,
      ...DEFAULTS,
      start_today: true,
    };
  }

  static getConfigElement() {
    const el = document.createElement("div");
    el.innerHTML = `<div style="padding:8px">Use YAML to configure this card. Editor coming later. (v${VERSION})</div>`;
    return el;
  }

  /** Config */
  setConfig(cfg: MultiCalendarGridCardConfig) {
    if (!cfg || !Array.isArray(cfg.entities) || cfg.entities.length === 0) {
      throw new Error("Config must include at least one entity in 'entities'.");
    }
    if (!isHHMMSS(cfg.slot_min_time)) throw new Error("slot_min_time must be HH:MM:SS");
    if (!isHHMMSS(cfg.slot_max_time)) throw new Error("slot_max_time must be HH:MM:SS");
    const sm = Number(cfg.slot_minutes ?? DEFAULTS.slot_minutes);
    if (!Number.isFinite(sm) || sm <= 0 || sm > 180) {
      throw new Error("slot_minutes must be a number between 1 and 180.");
    }

    // Merge defaults
    this._config = {
      ...DEFAULTS,
      ...cfg,
    };

    // Namespace for localStorage
    const nsKey = JSON.stringify({
      entities: this._config.entities.map((e) => e.entity).sort(),
      start_today: this._config.start_today !== false,
    });
    this._nsBase = `${CARD_TAG}.${hash(nsKey)}`;

    // Restore weekOffset
    try {
      this._weekOffset = this._config.remember_offset
        ? Number(localStorage.getItem(`${this._nsBase}.weekOffset`) || "0")
        : 0;
    } catch {
      this._weekOffset = 0;
    }

    // Compute anchor (today by default)
    this._recomputeAnchor();
  }

  /** Card size hint */
  getCardSize() {
    const vh = Number(this._config?.height_vh || DEFAULTS.height_vh);
    const px = Math.max(300, vh * 7);
    return Math.ceil(px / 50);
  }

  /** Lifecycle */
  connectedCallback(): void {
    super.connectedCallback();
    this._startTimers();
  }
  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopTimers();
  }
  firstUpdated(): void {
    this.updateComplete.then(() => this._restoreScroll());
  }
  updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has("_config") || changed.has("_weekAnchor")) {
      this._fetchEvents();
      this._loadWeather();
      this.updateComplete.then(() => this._restoreScroll());
    }
  }

  /** Timers */
  private _startTimers() {
    this._stopTimers();
    this._tick = window.setInterval(() => this.requestUpdate(), 60 * 1000);
    const mins = clamp(Number(this._config?.data_refresh_minutes) || 5, 1, 60);
    this._refresh = window.setInterval(() => {
      this._fetchEvents();
      this._loadWeather();
    }, mins * 60 * 1000);
  }
  private _stopTimers() {
    if (this._tick) window.clearInterval(this._tick);
    if (this._refresh) window.clearInterval(this._refresh);
    this._tick = undefined;
    this._refresh = undefined;
  }

  /** Week anchor (7-day window) */
  private _recomputeAnchor() {
    const cfg = this._config!;
    const today = startOfDay(new Date());
    let base: Date;

    if (cfg.start_today !== false || cfg.first_day === "today" || (cfg as any).first_day === -1) {
      base = startOfDay(today);
    } else {
      const first = typeof cfg.first_day === "number" ? cfg.first_day : 1; // default Monday
      base = startOfWeek(today, first);
    }
    base.setDate(base.getDate() + this._weekOffset * 7);
    this._weekAnchor = base;
  }

  private _saveOffset() {
    if (!this._config.remember_offset) return;
    try {
      localStorage.setItem(`${this._nsBase}.weekOffset`, String(this._weekOffset));
    } catch {}
  }

  private _restoreScroll() {
    const minMin = toMinutes(this._config.slot_min_time!);
    const pxPerMin = Number(this._config.px_per_min) || DEFAULTS.px_per_min;
    const defaultTop = Math.max(0, Math.round(minMin * pxPerMin) - 24);
    let top = defaultTop;
    if (this._config.remember_offset) {
      try {
        const st = Number(localStorage.getItem(`${this._nsBase}.scrollTop`));
        if (Number.isFinite(st)) top = Math.max(defaultTop, st);
      } catch {}
    }
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const sc = this.renderRoot?.querySelector(".scroll") as HTMLElement | null;
        if (sc) sc.scrollTop = top;
      })
    );
  }
  private _persistScroll = () => {
    if (!this._config.remember_offset) return;
    const sc = this.renderRoot?.querySelector(".scroll") as HTMLElement | null;
    if (!sc) return;
    try {
      localStorage.setItem(`${this._nsBase}.scrollTop`, String(sc.scrollTop));
    } catch {}
  };

  /** Weather */
  private async _loadWeather() {
    const entity = this._config.weather_entity;
    if (!entity || !this.hass) {
      this._wxByKey.clear();
      this.requestUpdate();
      return;
    }
    this._wxUnit = this.hass.states?.[entity]?.attributes?.temperature_unit || "°";
    const days = clamp(this._config.weather_days ?? 7, 1, 10);
    const fetchId = ++this._lastFetchId;
    try {
      const { items } = await robustForecast(this.hass, entity, days);
      if (fetchId !== this._lastFetchId) return;
      const map = new Map<string, WxDaily>();
      for (const f of items) {
        const dt = new Date((f.datetime || f.date || f.time) as any || Date.now());
        const k = dayKey(dt);
        const hi = toNum(f.temperature ?? f.temperature_high ?? f.temp);
        const lo = toNum(f.templow ?? f.temperature_low);
        const cond = String(f.condition ?? f.condition_description ?? f.state ?? "-");
        const pp = toNum(f.precipitation_probability ?? f.precipitation_chance) ?? undefined;
        map.set(k, { hi: hi ?? null, lo: lo ?? null, cond, pp });
      }
      this._wxByKey = map;
      this.requestUpdate();
    } catch {
      /* keep last successful weather if any */
    }
  }

  /** Calendar data */
  private async _fetchEvents() {
    if (!this.hass) return;
    const myFetch = ++this._lastFetchId;
    this._error = null;

    const start = new Date(this._weekAnchor);
    const end = addMinutes(start, 7 * 24 * 60);
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const all: any[] = [];
    const failed: string[] = [];

    for (const ent of this._config.entities) {
      const path = `calendars/${ent.entity}?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(
        endIso
      )}`;
      try {
        const items = await this.hass.callApi("GET", path);
        if (myFetch !== this._lastFetchId) return;
        if (Array.isArray(items)) {
          for (const ev of items) {
            ev.__color = ent.color;
            ev.__id = ent.entity;
            ev.__name = ent.name || ent.entity;
            all.push(ev);
          }
        }
      } catch (e) {
        failed.push(ent.name || ent.entity);
        console.error("Calendar fetch failed:", ent.entity, e);
      }
    }

    const days: {
      date: Date;
      allDay: CalEvent[];
      timed: { n: CalEvent; top: number; height: number; lane: number }[];
      laneCount: number;
    }[] = [];

    for (let d = 0; d < 7; d++) {
      const dayStart = addMinutes(start, d * 24 * 60);
      const dayEnd = addMinutes(dayStart, 24 * 60);
      const alls: CalEvent[] = [];
      const timed: { n: CalEvent; top: number; height: number; lane: number }[] = [];

      for (const raw of all) {
        const n = this._normalizeEvent(raw, raw.__id);
        if ((n.allDay ? new Date(n.e.getTime() - 1) : n.e) > dayStart && n.s < dayEnd) {
          if (n.allDay) {
            if (this._config.show_all_day) alls.push(n);
          } else {
            const top = Math.max(0, (n.s.getTime() - dayStart.getTime()) / 60000);
            const bottom = Math.max(0, (n.e.getTime() - dayStart.getTime()) / 60000);
            const t = Math.max(0, top);
            const h = Math.max(1, Math.min(1440, Math.max(t + 1, bottom)) - t);
            timed.push({ n, top: t, height: h, lane: 0 });
          }
        }
      }

      timed.sort((a, b) => a.top - b.top || b.height - a.height);
      const laneEnd: number[] = [];
      for (const ev of timed) {
        let placed = false;
        for (let i = 0; i < laneEnd.length; i++) {
          if (ev.top >= laneEnd[i]) {
            laneEnd[i] = ev.top + ev.height;
            ev.lane = i;
            placed = true;
            break;
          }
        }
        if (!placed) {
          laneEnd.push(ev.top + ev.height);
          ev.lane = laneEnd.length - 1;
        }
      }

      days.push({ date: dayStart, allDay: alls, timed, laneCount: Math.max(1, laneEnd.length) });
    }

    if (myFetch === this._lastFetchId) {
      this._days = days;
      this._error = failed.length ? `${tr(this._lang(), "failed_load_prefix")} ${failed.join(", ")}` : null;
    }
  }

  private _normalizeEvent(ev: any, src: string): CalEvent {
    const s0 = ev.start?.dateTime || ev.start?.date || ev.start;
    const e0 = ev.end?.dateTime || ev.end?.date || ev.end;
    const hasTime =
      !!(ev.start?.dateTime || ev.end?.dateTime) ||
      (typeof s0 === "string" && s0.includes("T")) ||
      (typeof e0 === "string" && e0.includes("T"));

    const s = new Date(s0);
    const e = new Date(e0);

    return {
      s,
      e,
      allDay: !hasTime,
      summary: ev.summary || "(no title)",
      location: ev.location,
      description: ev.description,
      color: ev.__color || "#3366cc",
      src,
      raw: ev,
    };
  }

  /** Actions */
  private _shiftWeek(delta: number, resetToToday = false) {
    this._weekOffset = resetToToday ? 0 : this._weekOffset + delta;
    this._saveOffset();
    this._recomputeAnchor();
    this._fetchEvents();
    this._loadWeather();
    this.updateComplete.then(() => this._restoreScroll());
  }

  /** Render helpers */
  private _lang() {
    const l = this?.hass?.locale;
    return this._config.locale || l?.language || "en";
  }

  private _fmtRange(s: Date, e: Date, allDay: boolean) {
    const loc = this?.hass?.locale;
    const lang = this._config.locale || loc?.language || "en";
    if (allDay) {
      const fmt = new Intl.DateTimeFormat(lang, { weekday: "short", day: "2-digit", month: "short" });
      const same = s.toDateString() === e.toDateString();
      const endAdj = new Date(e.getFullYear(), e.getMonth(), e.getDate());
      endAdj.setMilliseconds(-1);
      return same ? `${fmt.format(s)}` : `${fmt.format(s)} → ${fmt.format(endAdj)}`;
    }
    const cycle = loc?.time_format === "12" ? "h12" : "h23";
    const tf = new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit", hourCycle: cycle });
    const df = new Intl.DateTimeFormat(lang, { weekday: "short", day: "2-digit", month: "short" });
    if (s.toDateString() === e.toDateString()) {
      return `${df.format(s)} • ${tf.format(s)}–${tf.format(e)}`;
    }
    return `${df.format(s)} ${tf.format(s)} → ${df.format(e)} ${tf.format(e)}`;
  }

  /** Template */
  render() {
    const start = this._weekAnchor;
    const end = addMinutes(new Date(start), 7 * 24 * 60 - 1);
    const lang = this._lang();
    const rf = new Intl.DateTimeFormat(lang, { day: "2-digit", month: "short" });
    const vh = Number(this._config.height_vh || DEFAULTS.height_vh);

    return html`
      <ha-card>
        <div class="hdr">
          <div class="legend">
            ${this._config.entities.map((e) => this._legendItem(e))}
          </div>
          <div class="badge" title="${this._error ? this._error : ""}">
            ${rf.format(start)} – ${rf.format(end)}
          </div>
          <div class="toolbar">
            <button type="button" aria-label="${tr(lang, "aria_prev_week")}" @click=${() => this._shiftWeek(-1)}>${tr(
              lang,
              "prev"
            )}</button>
            <button type="button" aria-label="${tr(lang, "aria_today")}" @click=${() => this._shiftWeek(0, true)}>${tr(
              lang,
              "today"
            )}</button>
            <button type="button" aria-label="${tr(lang, "aria_next_week")}" @click=${() => this._shiftWeek(1)}>${tr(
              lang,
              "next"
            )}</button>
          </div>
        </div>

        ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
        ${this._anyEvents() ? nothing : html`<div class="empty">${tr(lang, "no_events")}</div>`}

        <div class="scroll" style=${`--mcg-height:${vh}vh`} @scroll=${this._persistScroll}>
          <div class="grid">
            ${this._timeColumn()}
            ${this._dayColumns(start)}
          </div>
        </div>

        <div class="footer">Multi-Calendar Grid Card v${VERSION}</div>
        ${this._renderDialog()}
      </ha-card>
    `;
  }

  private _legendItem(e: EntityCfg) {
    const activeMapKey = `${this._nsBase}.legend`;
    let activeMap: Record<string, boolean> = {};
    try {
      activeMap = JSON.parse(localStorage.getItem(activeMapKey) || "{}") || {};
    } catch {}
    const active = activeMap[e.entity] !== false;

    const toggle = () => {
      const next = { ...activeMap, [e.entity]: !active };
      try {
        localStorage.setItem(activeMapKey, JSON.stringify(next));
      } catch {}
      this._fetchEvents();
      this.requestUpdate();
    };

    const dot = e.color ? (colorToHex(e.color) ? e.color! : e.color!) : "#3366cc";
    return html`<div class=${active ? "item" : "item inactive"} @click=${toggle}>
      <span class="dot" style=${`background:${dot}`}></span>
      <span>${e.name || e.entity}</span>
    </div>`;
  }

  private _timeColumn() {
    const ticks: unknown[] = [];
    const pxPerMin = Number(this._config.px_per_min) || DEFAULTS.px_per_min;
    const step = Number(this._config.slot_minutes) || DEFAULTS.slot_minutes;
    for (let m = 0; m <= 1440; m += step) {
      const top = Math.round(m * pxPerMin);
      ticks.push(html`<div class=${m % 60 === 0 ? "tick" : "tick minor"} style=${`top:${top}px`}></div>`);
      if (m % 60 === 0) {
        ticks.push(
          html`<div class="hour-label" style=${`top:${top - 8}px`}>${String(Math.floor(m / 60)).padStart(2, "0")}:00</div>`
        );
      }
    }
    return html`<div class="timecol" style="grid-column:1/2; grid-row:1/-1; position:relative">${ticks}</div>`;
  }

  private _dayColumns(start: Date) {
    const out: unknown[] = [];
    const pxPerMin = Number(this._config.px_per_min) || DEFAULTS.px_per_min;
    const columnHeight = Math.round(1440 * pxPerMin);
    const today = startOfDay(new Date());

    for (let d = 0; d < 7; d++) {
      const date = addMinutes(start, d * 24 * 60);
      const isToday = sameYMD(date, today);
      const day = this._days[d];
      const lang = this._lang();
      const label = date.toLocaleDateString(lang, { weekday: "short", day: "2-digit", month: "short" });

      const allDay = this._config.show_all_day
        ? html`<div class="allday">
            ${(day?.allDay || []).map(
              (ev) => html`<div class="pill" @click=${() => this._open(ev)}>${ev.summary}</div>`
            )}
          </div>`
        : nothing;

      const laneCount = day?.laneCount || 1;
      const timed = (day?.timed || []).map((ev) => {
        const top = Math.round(ev.top * pxPerMin);
        const height = Math.max(2, Math.round(ev.height * pxPerMin));
        const share = 100 / laneCount;
        const left = ev.lane * share;

        const hex = colorToHex(ev.n.color || "#3366cc") || "#3366cc";
        const fg = fgOn(hex);
        const bg = rgba(hex, 0.55);

        return html`<div
          class="event"
          title=${ev.n.summary}
          style=${`top:${top}px;height:${height - 2}px;left:${left}%;width:calc(${share}% - 4px);background:${bg};border:1px solid ${hex};color:${fg}`}
          @click=${() => this._open(ev.n)}
        >
          <div class="title">${ev.n.summary}</div>
        </div>`;
      });

      const nowLine =
        this._config.show_now_indicator && this._weekOffset === 0
          ? this._nowLineForDay(d)
          : nothing;

      const wx = this._renderWeatherBand(date);

      out.push(html`
        <div class=${isToday ? "col today" : "col"} style=${`grid-column:${2 + d}/${3 + d}`}>
          <div class=${isToday ? "dayhdr today" : "dayhdr"}>
            <div>${label} ${isToday ? html`<span class="today-pill">${tr(this._lang(), "today_pill")}</span>` : nothing}</div>
            ${wx}
          </div>
          ${allDay}
          <div class="body" style=${`height:${columnHeight}px; position:relative`}>${timed}${nowLine}</div>
        </div>
      `);
    }

    out.unshift(html`<style>.grid{height:${columnHeight}px}</style>`);
    return out;
  }

  private _renderWeatherBand(date: Date) {
    const k = dayKey(date);
    const d = this._wxByKey.get(k);
    if (!d) return html`<div class="mcg-wx" data-native></div>`; // keep space stable

    const unit = this._wxUnit || "°";
    const hi = d.hi != null ? `${Math.round(d.hi)}${unit}` : "–";
    const lo = d.lo != null ? `${Math.round(d.lo)}${unit}` : null;
    const pp = d.pp != null ? `${Math.round(d.pp)}%` : null;
    const icon = condIcon(d.cond);

    return html`<div class="mcg-wx" data-native>
      <ha-icon icon=${icon}></ha-icon>
      <span class="hi">${hi}</span>
      ${lo ? html`<span class="sep"></span><span class="lo">${lo}</span>` : nothing}
      ${pp ? html`<span class="pp">• ${pp}</span>` : nothing}
    </div>`;
  }

  private _nowLineForDay(dayIndex: number) {
    const pxPerMin = Number(this._config.px_per_min) || DEFAULTS.px_per_min;
    const start = addMinutes(this._weekAnchor, dayIndex * 24 * 60);
    const end = addMinutes(start, 24 * 60);
    const now = new Date();
    if (now < start || now > end) return nothing;
    const mins = (now.getTime() - start.getTime()) / 60000;
    const top = Math.round(mins * pxPerMin);
    return html`<div class="now" style=${`top:${top}px`}></div>`;
  }

  private _open(ev: CalEvent) {
    this._dialogEvent = ev;
    this._dialogOpen = true;
    this.requestUpdate();
  }
  private _closeDialog() {
    this._dialogOpen = false;
    this._dialogEvent = undefined;
    this.requestUpdate();
  }

  private _renderDialog() {
    if (!this._dialogOpen || !this._dialogEvent) return nothing;
    const ev = this._dialogEvent;
    const body = html`
      <div class="row"><strong>${ev.summary}</strong></div>
      <div class="row">${this._fmtRange(ev.s, ev.e, ev.allDay)}</div>
      ${ev.location ? html`<div class="row">${ev.location}</div>` : nothing}
      ${ev.description ? html`<div class="row">${ev.description}</div>` : nothing}
    `;

    if ((customElements as any).get("ha-dialog")) {
      return html`<ha-dialog .open=${this._dialogOpen} @closed=${() => this._closeDialog()}>
        <div slot="heading">${tr(this._lang(), "event_details")}</div>
        ${body}
        <mwc-button slot="primaryAction" dialogAction="close">${tr(this._lang(), "close")}</mwc-button>
      </ha-dialog>`;
    }

    return html`<div class="overlay" @click=${(e: Event) => (e.target === e.currentTarget ? this._closeDialog() : null)}>
      <div class="modal" role="dialog" aria-modal="true" aria-label="${tr(this._lang(), "event_details")}">
        <h3>${tr(this._lang(), "event_details")}</h3>
        ${body}
        <div class="actions">
          <button class="btn" @click=${() => this._closeDialog()}>${tr(this._lang(), "close")}</button>
        </div>
      </div>
    </div>`;
  }

  /** Misc */
  private _anyEvents() {
    return (this._days || []).some((d) => (d.allDay?.length || 0) + (d.timed?.length || 0) > 0);
  }
}

/** Helpers */
function hash(s: string): string {
  let t = 5381;
  for (let i = 0; i < s.length; i++) t = (t * 33) ^ s.charCodeAt(i);
  return (t >>> 0).toString(36);
}

/** Define element (no decorator) and card registration */
if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, MultiCalendarGridCard as any);
(window as any).customCards = (window as any).customCards || [];
if (!(window as any).customCards.find((c: any) => c.type === CARD_TAG)) {
  (window as any).customCards.push({
    type: CARD_TAG,
    name: "Multi-Calendar Grid Card",
    description: "7-day time-grid overlay for multiple calendar entities (Lit+TS)",
    preview: false,
  });
}
