/* Multi-Calendar Grid Card
 * v0.8.0-dev.12 — Tick alignment, DOM grid lines, midnight-to-midnight, dialog chips, dedup, 12/24h
 */
import { LitElement, css, html, nothing } from "lit";
import "./editor/multi-calendar-grid-card-editor";

/** Public card type & version */
export const CARD_TAG = "multi-calendar-grid-card";
export const VERSION = "0.8.0";

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
  first_day?: number | "today";
  start_today?: boolean;        // default true
  slot_min_time?: string;       // "07:00:00"
  slot_max_time?: string;       // "22:00:00"
  slot_minutes?: number;        // 1–180 (30–180 recommended)
  locale?: string;
  /** Global time format for labels and dialog */
  time_format?: "12" | "24";
  show_now_indicator?: boolean;
  show_all_day?: boolean;

  /** LAYOUT */
  header_compact?: boolean;
  height_vh?: number;
  px_per_min?: number;
  legend_button_ch?: number;
  remember_offset?: boolean;
  storage_key?: string;

  /** DATA */
  data_refresh_minutes?: number;

  /** WEATHER */
  weather_entity?: string;
  weather_days?: number;
  weather_compact?: boolean;

  /** HIGHLIGHTS (colors; '' disables) */
  today_color?: string;
  weekend_color?: string;
  now_line_color?: string;

  /** RANGE */
  visible_days?: number; // 1..14, default 7
};

const DEFAULTS: Required<Pick<
  MultiCalendarGridCardConfig,
  | "slot_min_time"
  | "slot_max_time"
  | "slot_minutes"
  | "locale"
  | "time_format"
  | "show_now_indicator"
  | "show_all_day"
  | "height_vh"
  | "remember_offset"
  | "header_compact"
  | "legend_button_ch"
  | "data_refresh_minutes"
  | "storage_key"
  | "start_today"
  | "visible_days"
>> = {
  slot_min_time: "07:00:00",
  slot_max_time: "22:00:00",
  slot_minutes: 30,
  locale: "en",
  time_format: "24",
  show_now_indicator: true,
  show_all_day: true,
  height_vh: 60,
  remember_offset: true,
  header_compact: false,
  legend_button_ch: 15,
  data_refresh_minutes: 5,
  storage_key: `${CARD_TAG}.weekOffset`,
  start_today: true,
  visible_days: 7,
};

const STRINGS = {
  en: {
    prev: "Prev",
    next: "Next",
    today: "Today",
    no_events: "No events in this range.",
    event_details: "Event details",
    close: "Close",
    aria_prev_week: "Previous period",
    aria_next_week: "Next period",
    aria_today: "Go to current period",
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
const isWeekend = (d: Date) => {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
};

const colorToHex = (raw?: string) => {
  const t = String(raw || "").trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t)) return t.toLowerCase();
  if (/^rgba?\(/.test(t) || /^var\(--/.test(t)) return null;
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
export type WItem = {
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
export function aggregateHourlyToDaily(hourly: WItem[], daysWanted: number): WItem[] {
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
  alsoColors?: string[];
  allCalendars?: { id: string; name: string; color: string }[];
  srcName?: string;
  raw: CalEventRaw;
};

export class MultiCalendarGridCard extends LitElement {
  /** HA wiring */
  hass: any;

  /** Internal (reactive via static properties) */
  private _config!: MultiCalendarGridCardConfig;
  private _error: string | null = null;
  private _weekOffset = 0;
  private _weekAnchor!: Date; // start of visible window anchor
  private _days: {
    date: Date;
    allDay: CalEvent[];
    timed: { n: CalEvent; top: number; height: number; lane: number; cols: number }[];
    laneCount: number;
  }[] = [];
  private _dialogOpen = false;
  private _dialogEvent?: CalEvent;

  // weather cache (keyed by YYYY-MM-DD)
  private _wxUnit = "°";
  private _wxByKey: Map<string, WxDaily> = new Map();

  // Separate fetch tokens
  private _lastEventsFetchId = 0;
  private _lastWeatherFetchId = 0;

  private _tick?: number;
  private _refresh?: number;
  private _nsBase = "";
  private _timeColPad = 0;
  private _allDayHeight = 0;

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
  static get version() { return VERSION; }

  static styles = css`
    :host{display:block}
    ha-card{border-radius:16px; overflow:hidden}
    .hdr{display:flex; justify-content:space-between; align-items:center; gap:14px; margin:12px}
    /* LEGEND as full-color buttons */
    .legend{display:flex; gap:8px; flex-wrap:wrap; font-size:14px}
    .legend .btn{all:unset; cursor:pointer; padding:8px 14px; border-radius:999px; border:1px solid var(--divider-color,#e0e0e0); display:flex; align-items:center; justify-content:center; gap:8px; text-align:center}
    .legend .btn.active{border-color:transparent}
    .legend .name{font-weight:600}
    .toolbar button{all:unset; cursor:pointer; padding:7px 14px; border-radius:999px; background:rgba(0,0,0,.06)}
    .toolbar button:focus{outline:2px solid var(--primary-color)}
    .error{color:#fff; background:#d32f2f; padding:6px 10px; border-radius:8px; font-size:12px; margin:0 12px 8px}
    .empty{color:var(--secondary-text-color); padding:8px 12px; font-size:12px}
    .scroll{height: var(--mcg-height, 60vh); margin: 0 12px 12px; overflow-y:auto; overscroll-behavior:contain; border:1px solid var(--divider-color,#e0e0e0); border-radius:12px; background:var(--divider-color,#e0e0e0)}
    .grid{position:relative; display:grid; gap:1px; background:var(--divider-color,#e0e0e0)}
    .col{background:var(--card-background-color,#fff); position:relative}
    .dayhdr{position:sticky; top:0; background:var(--card-background-color,#fff); z-index:5; font-weight:800; padding:8px 10px; border-bottom:1px solid var(--divider-color,#e0e0e0); display:flex; align-items:center; justify-content:space-between; gap:8px}
    .allday{position:sticky; left:0; right:0; padding:6px 8px; display:flex; flex-wrap:wrap; gap:6px; background:var(--card-background-color,#fff); z-index:3}
    .pill{background: var(--secondary-background-color, rgba(0,0,0,.08)); color: var(--primary-text-color,#111); border-radius:10px; padding:2px 8px; font-size:12px; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
    .timecol{background:var(--card-background-color,#fff); position:relative}
    .timecol .ticks{position:relative}
    .tick{position:absolute; left:0; right:0; border-top:1px solid rgba(0,0,0,.22); z-index:1}
    .tick.minor{border-top:1px dashed rgba(0,0,0,.14)}
    .hour-label{position:absolute; top:-8px; left:6px; font-size:12px; color:var(--secondary-text-color); z-index:2; background: var(--card-background-color,#fff); padding:0 4px}
    .body{position:relative; overflow:hidden}
    .gridline{position:absolute; left:0; right:0; border-top:1px solid rgba(0,0,0,.22); z-index:1}
    .gridline.minor{border-top:1px dashed rgba(0,0,0,.14)}
    .event{position:absolute; border-radius:10px; padding:6px 8px; box-sizing:border-box; font-size:12px; line-height:1.15; overflow:hidden; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,.12); z-index:2}
    .event .title{font-weight:700}
    .event .marks{position:absolute; right:6px; bottom:6px; display:flex; gap:4px}
    .event .mark{width:8px; height:8px; border-radius:2px; box-shadow:0 0 0 1px rgba(0,0,0,.25) inset}
    .now{position:absolute; left:0; right:0; height:2px; background: var(--error-color,#e53935); z-index:3}
    .footer{font-size:10px; color:var(--secondary-text-color); text-align:right; margin:4px 12px 10px}

    /* Weather band (native) */
    .mcg-wx[data-native]{ display:flex; align-items:center; gap:6px; font-size:12px }
    .mcg-wx[data-native] .lo{ font-weight:700; color:#1976d2 }
    .mcg-wx[data-native] .hi{ font-weight:700; color:#d32f2f }
    .mcg-wx[data-native] .sep::before{ content:" / "; color: var(--secondary-text-color) }
    .mcg-wx[data-native] .pp{ color: var(--secondary-text-color); font-size:11px }
    .mcg-wx[data-native] ha-icon { --mdc-icon-size:20px }
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
        : [];
    return {
      type: `custom:${CARD_TAG}`,
      entities,
      ...DEFAULTS,
      start_today: true,
      time_format: "24",
      today_color: "#c8e3f9",
      weekend_color: "#f0f0f0",
      now_line_color: "#e53935",
      visible_days: 7,
    };
  }

  static getConfigElement() {
    return document.createElement("multi-calendar-grid-card-editor");
  }

  /** Config */
  setConfig(cfg: Partial<MultiCalendarGridCardConfig>) {
    const merged: MultiCalendarGridCardConfig = {
      ...DEFAULTS,
      ...cfg,
      entities: Array.isArray(cfg?.entities) ? cfg!.entities! : [],
    };

    if (!isHHMMSS(merged.slot_min_time)) throw new Error("slot_min_time must be HH:MM:SS");
    if (!isHHMMSS(merged.slot_max_time)) throw new Error("slot_max_time must be HH:MM:SS");
    const sm = Number(merged.slot_minutes ?? DEFAULTS.slot_minutes);
    if (!Number.isFinite(sm) || sm <= 0 || sm > 180) {
      throw new Error("slot_minutes must be a number between 1 and 180.");
    }
    merged.visible_days = clamp(merged.visible_days ?? 7, 1, 14);

    this._config = merged;

    const nsKey = JSON.stringify({
      entities: this._config.entities.map((e) => e.entity).sort(),
      start_today: this._config.start_today !== false,
      visible_days: this._config.visible_days,
    });
    this._nsBase = `${CARD_TAG}.${hash(nsKey)}`;

    try {
      this._weekOffset = this._config.remember_offset
        ? Number(localStorage.getItem(`${this._nsBase}.weekOffset`) || "0")
        : 0;
    } catch {
      this._weekOffset = 0;
    }

    this._recomputeAnchor();
    this._fetchEvents();
    this._loadWeather();
  }

  getCardSize() {
    const vh = Number(this._config?.height_vh || DEFAULTS.height_vh);
    const px = Math.max(300, vh * (this._config.visible_days || 7));
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
    this.updateComplete.then(() => {
      this._measureTimeColPad();
      this._restoreScroll();
    });
  }
  updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has("_config") || changed.has("_weekAnchor")) {
      this._fetchEvents();
      this._loadWeather();
      this.updateComplete.then(() => {
        this._measureTimeColPad();
        this._restoreScroll();
      });
    } else {
      this.updateComplete.then(() => this._measureTimeColPad());
    }
  }

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

  private _recomputeAnchor() {
    const cfg = this._config!;
    const today = startOfDay(new Date());
    let base: Date;

    if (cfg.start_today !== false || cfg.first_day === "today" || (cfg as any).first_day === -1) {
      base = startOfDay(today);
    } else {
      const first = typeof cfg.first_day === "number" ? cfg.first_day : 1;
      base = startOfWeek(today, first);
    }
    base.setDate(base.getDate() + this._weekOffset * (cfg.visible_days || 7));
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
    const pxPerMin = this._pxPerMin();
    const defaultTop = Math.max(0, Math.round(minMin * pxPerMin - this._allDayHeight)); // align to exact minute, no fudge
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

  private _pxPerMin() {
    let ppm = Number(this._config.px_per_min);
    if (!Number.isFinite(ppm) || ppm <= 0) {
      const vh = Number(this._config.height_vh || DEFAULTS.height_vh);
      const winH = typeof window !== "undefined" ? window.innerHeight || 800 : 800;
      const focus = Math.max(
        1,
        toMinutes(this._config.slot_max_time!) - toMinutes(this._config.slot_min_time!)
      );
      ppm = ((vh / 100) * winH) / focus;
    }
    return Math.round(ppm * 100) / 100;
  }

  private _measureTimeColPad() {
    const col = this.renderRoot?.querySelector(".col") as HTMLElement | null;
    const body = col?.querySelector(".body") as HTMLElement | null;
    if (col && body) {
      const pad = Math.round(
        body.getBoundingClientRect().top - col.getBoundingClientRect().top
      );
      const allHeights = Array.from(
        this.renderRoot?.querySelectorAll(".allday") || []
      ).map((el) => (el as HTMLElement).scrollHeight);
      const allDayHeight = Math.max(0, ...allHeights);

      if (pad !== this._timeColPad || allDayHeight !== this._allDayHeight) {
        this._timeColPad = pad;
        this._allDayHeight = allDayHeight;
        this.requestUpdate();
        this.updateComplete.then(() => this._restoreScroll());
      }
    }
  }

  private async _loadWeather() {
    const entity = this._config.weather_entity;
    if (!entity || !this.hass) {
      this._wxByKey.clear();
      this.requestUpdate();
      return;
    }
    this._wxUnit = this.hass.states?.[entity]?.attributes?.temperature_unit || "°";
    const days = clamp(this._config.weather_days ?? this._config.visible_days ?? 7, 1, 14);
    const fetchId = ++this._lastWeatherFetchId;
    try {
      const { items } = await robustForecast(this.hass, entity, days);
      if (fetchId !== this._lastWeatherFetchId) return;
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

  private async _fetchEvents() {
    if (!this.hass) return;
    const myFetch = ++this._lastEventsFetchId;
    this._error = null;

    const start = new Date(this._weekAnchor);
    const end = addMinutes(start, (this._config.visible_days || 7) * 24 * 60);
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const all: any[] = [];
    const failed: string[] = [];

    const activeMapKey = `${this._nsBase}.legend`;
    let activeMap: Record<string, boolean> = {};
    try { activeMap = JSON.parse(localStorage.getItem(activeMapKey) || "{}") || {}; } catch {}

    for (const ent of this._config.entities) {
      if (activeMap[ent.entity] === false) continue;
      const path = `calendars/${ent.entity}?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
      try {
        const items = await this.hass.callApi("GET", path);
        if (myFetch !== this._lastEventsFetchId) return;
        if (Array.isArray(items)) {
          for (const ev of items) {
            ev.__color = ent.color;
            ev.__id = ent.entity;
            ev.__name = ent.name || ent.entity;
            all.push(ev);
          }
        }
      } catch (_e) {
        failed.push(ent.name || ent.entity);
      }
    }

    const byKey = new Map<string, any[]>();
    const keyOf = (ev: any) => {
      const s0 = ev.start?.dateTime || ev.start?.date || ev.start;
      const e0 = ev.end?.dateTime || ev.end?.date || ev.end;
      const s = new Date(s0).getTime();
      const e = new Date(e0).getTime();
      const t = String(ev.summary || "").trim().toLowerCase();
      const loc = String(ev.location || "").trim().toLowerCase();
      return `${s}|${e}|${t}|${loc}`;
    };
    for (const ev of all) {
      const k = keyOf(ev);
      const arr = byKey.get(k);
      if (arr) arr.push(ev);
      else byKey.set(k, [ev]);
    }

    const order: Record<string, number> = {};
    const nameById: Record<string,string> = {};
    const colorById: Record<string,string> = {};
    this._config.entities.forEach((e, i) => {
      order[e.entity] = i;
      nameById[e.entity] = e.name || e.entity;
      colorById[e.entity] = e.color || "#3366cc";
    });

    const uniq: any[] = [];
    for (const [, list] of byKey) {
      if (list.length === 1) {
        const only = list[0];
        only.__srcName = nameById[only.__id] || only.__id;
        uniq.push(only);
      } else {
        const sorted = list.slice().sort((a, b) => (order[a.__id] ?? 999) - (order[b.__id] ?? 999));
        const primary = sorted[0];
        const rest = sorted.slice(1);
        primary.__alsoColors = rest.map((r: any) => r.__color).filter((c: any) => !!c);
        primary.__srcName = nameById[primary.__id] || primary.__id;
        primary.__alsoMeta = rest.map((r: any) => ({ id: r.__id, name: nameById[r.__id] || r.__id, color: colorById[r.__id] || r.__color }));
        uniq.push(primary);
      }
    }

    const days: {
      date: Date;
      allDay: CalEvent[];
      timed: { n: CalEvent; top: number; height: number; lane: number; cols: number }[];
      laneCount: number;
    }[] = [];

    for (let d = 0; d < (this._config.visible_days || 7); d++) {
      const dayStart = addMinutes(start, d * 24 * 60);
      const dayEnd = addMinutes(dayStart, 24 * 60);
      const allDayEvents: CalEvent[] = [];
      type TTimed = { n: CalEvent; start: number; end: number; top: number; height: number; lane: number; cols: number };
      const rawList: TTimed[] = [];

      for (const raw of uniq) {
        const n = this._normalizeEvent(raw, raw.__id);
        if ((n.allDay ? new Date(n.e.getTime() - 1) : n.e) > dayStart && n.s < dayEnd) {
          if (n.allDay) {
            if (this._config.show_all_day) allDayEvents.push(n);
          } else {
            const startMin = Math.max(0, (n.s.getTime() - dayStart.getTime()) / 60000);
            const endMin = Math.max(0, (n.e.getTime() - dayStart.getTime()) / 60000);
            const t = Math.max(0, startMin);
            const h = Math.max(1, Math.min(1440, Math.max(t + 1, endMin)) - t);
            rawList.push({ n, start: t, end: t + h, top: t, height: h, lane: 0, cols: 1 });
          }
        }
      }

      rawList.sort((a, b) => a.start - b.start || b.height - a.height);

      const groups: { members: TTimed[]; maxCols: number }[] = [];
      let active: TTimed[] = [];
      let curGroup: { members: TTimed[]; used: boolean[]; maxCols: number } | null = null;

      const flushGroup = () => {
        if (curGroup) {
          const mcols = Math.max(curGroup.maxCols, 1);
          curGroup.members.forEach(m => (m.cols = mcols));
          groups.push({ members: curGroup.members, maxCols: mcols });
          curGroup = null;
          active = [];
        }
      };

      for (const ev of rawList) {
        active = active.filter(a => a.end > ev.start);
        if (!curGroup || active.length === 0) {
          flushGroup();
          curGroup = { members: [], used: [], maxCols: 0 };
        }
        let col = 0;
        for (let i = 0; i < (curGroup.used.length || 0); i++) {
          if (!curGroup.used[i]) { col = i; break; }
          col = i + 1;
        }
        curGroup.used[col] = true;
        ev.lane = col;
        active.push(ev);
        curGroup.members.push(ev);
        curGroup.maxCols = Math.max(curGroup.maxCols, active.length);
      }
      flushGroup();

      const timed = groups.flatMap(g => g.members);
      const laneCount = Math.max(1, ...groups.map(g => g.maxCols));
      days.push({ date: dayStart, allDay: allDayEvents, timed, laneCount });
    }

    if (myFetch === this._lastEventsFetchId) {
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

    let s: Date;
    let e: Date;
    if (!hasTime) {
      const [sy, sm = 1, sd = 1] = String(s0).split("-").map(Number);
      const [ey, em = 1, ed = 1] = String(e0).split("-").map(Number);
      s = new Date(sy, sm - 1, sd);
      e = new Date(ey, em - 1, ed);
    } else {
      s = new Date(s0);
      e = new Date(e0);
    }

    return {
      s,
      e,
      allDay: !hasTime,
      summary: ev.summary || "(no title)",
      location: ev.location,
      description: ev.description,
      color: ev.__color || "#3366cc",
      src,
      alsoColors: Array.isArray((ev as any).__alsoColors) ? (ev as any).__alsoColors : [],
      raw: ev,
      ...(ev.__srcName ? { srcName: ev.__srcName } : {} as any),
      ...(ev.__alsoMeta
        ? { allCalendars: [{ id: src, name: (ev.__srcName || src), color: (ev.__color || "#3366cc") }, ...(ev.__alsoMeta as any[])] }
        : { allCalendars: [{ id: src, name: (ev.__srcName || src), color: (ev.__color || "#3366cc") }] }),
    };
  }

  private _shiftWeek(delta: number, resetToToday = false) {
    this._weekOffset = resetToToday ? 0 : this._weekOffset + delta;
    this._saveOffset();
    this._recomputeAnchor();
    this._fetchEvents();
    this._loadWeather();
    this.updateComplete.then(() => this._restoreScroll());
  }

  private _lang() {
    const l = this?.hass?.locale;
    return this._config.locale || l?.language || "en";
  }

  private _fmtRange(s: Date, e: Date, allDay: boolean) {
    const lang = this._lang();
    const use12 = this._config.time_format === "12";
    if (allDay) {
      const fmt = new Intl.DateTimeFormat(lang, { weekday: "short", day: "2-digit", month: "short" });
      const same = s.toDateString() === e.toDateString();
      const endAdj = new Date(e.getFullYear(), e.getMonth(), e.getDate());
      endAdj.setMilliseconds(-1);
      return same ? `${fmt.format(s)}` : `${fmt.format(endAdj)}`;
    }
    const tf = new Intl.DateTimeFormat(lang, { hour: "numeric", minute: "2-digit", hour12: use12 });
    const df = new Intl.DateTimeFormat(lang, { weekday: "short", day: "2-digit", month: "short" });
    if (s.toDateString() === e.toDateString()) {
      return `${df.format(s)} • ${tf.format(s)}–${tf.format(e)}`;
    }
    return `${df.format(s)} ${tf.format(s)} → ${df.format(e)} ${tf.format(e)}`;
  }

  render() {
    const start = this._weekAnchor;
    const lang = this._lang();
    const vh = Number(this._config.height_vh || DEFAULTS.height_vh);

    return html`
      <ha-card>
        <div class="hdr">
          <div class="legend">
            ${this._config.entities.map((e) => this._legendItem(e))}
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
          <div class="grid" style=${`grid-template-columns:70px repeat(${this._config.visible_days || 7}, 1fr)`}>
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
    try { activeMap = JSON.parse(localStorage.getItem(activeMapKey) || "{}") || {}; } catch {}
    const active = activeMap[e.entity] !== false;

    const toggle = () => {
      const next = { ...activeMap, [e.entity]: !active };
      try { localStorage.setItem(activeMapKey, JSON.stringify(next)); } catch {}
      this._fetchEvents();
      this.requestUpdate();
    };

    const hex = colorToHex(e.color || "#3366cc") || "#3366cc";
    const fg = fgOn(hex);
    const width = Math.max(0, this._config.legend_button_ch ?? DEFAULTS.legend_button_ch);
    const baseStyle = `min-width:${width}ch`;
    const styleActive = `${baseStyle}; background:${hex}; color:${fg}; border-color:transparent`;
    const styleInactive = `${baseStyle}; background:${rgba(hex,0.12)}; border:1px solid ${hex}; color:var(--secondary-text-color,#555)`;

    return html`<button class="btn ${active ? "active" : ""}" style=${active ? styleActive : styleInactive} @click=${toggle}>
      <span class="name">${e.name || e.entity}</span>
    </button>`;
  }

  private _timeColumn() {
    const ticks: unknown[] = [];
    const pxPerMin = this._pxPerMin();
    const step = Number(this._config.slot_minutes ?? DEFAULTS.slot_minutes);
    const columnHeight = Math.round(1440 * pxPerMin);
    const use12 = this._config.time_format === "12";
    const lang = this._lang();
    const tf = new Intl.DateTimeFormat(lang, { hour: "numeric", minute: "2-digit", hour12: use12 });
    for (let m = 0; m <= 1440; m += step) {
      const top = Math.round(m * pxPerMin);
      ticks.push(html`<div class=${m % 60 === 0 ? "tick" : "tick minor"} style=${`top:${top}px`}></div>`);
      if (m % 60 === 0) {
        const ref = new Date(1970, 0, 1, Math.floor(m / 60), 0, 0, 0);
        const label = tf.format(ref);
        ticks.push(html`<div class="hour-label" style=${`top:${top - 8}px`}>${label}</div>`);
      }
    }
    const pad = this._timeColPad + this._allDayHeight;
    return html`<div class="timecol" style="grid-column:1/2; grid-row:1/-1; position:relative;">
      <div class="ticks" style=${`height:${columnHeight}px;margin-top:${pad}px`}>${ticks}</div>
    </div>`;
  }

  private _gridLinesDom(pxPerMin: number, stepMin: number) {
    const lines: unknown[] = [];
    for (let m = 0; m <= 1440; m += stepMin) {
      const top = Math.round(m * pxPerMin);
      const major = m % 60 === 0;
      lines.push(html`<div class=${major ? "gridline" : "gridline minor"} style=${`top:${top}px`}></div>`);
    }
    return lines;
  }

  private _dayColumns(start: Date) {
    const out: unknown[] = [];
    const pxPerMin = this._pxPerMin();
    const columnHeight = Math.round(1440 * pxPerMin);
    const today = startOfDay(new Date());

    const todayColor = typeof this._config.today_color === "string" ? this._config.today_color : "#c8e3f9";
    const weekendColor = typeof this._config.weekend_color === "string" ? this._config.weekend_color : "#f0f0f0";
    const step = Number(this._config.slot_minutes ?? DEFAULTS.slot_minutes);

    for (let d = 0; d < (this._config.visible_days || 7); d++) {
      const date = addMinutes(start, d * 24 * 60);
      const isToday = sameYMD(date, today);
      const isWknd = isWeekend(date);
      const day = this._days[d];
      const lang = this._lang();
      const label = date.toLocaleDateString(lang, { weekday: "short", day: "2-digit", month: "short" });

      let headerBg = "";
      let bodyBg = "";
      if (isToday && todayColor) { headerBg = todayColor; bodyBg = todayColor; }
      else if (isWknd && weekendColor) { headerBg = weekendColor; bodyBg = weekendColor; }

      const allDayStyle = `top:0;${
        this._allDayHeight ? `height:${this._allDayHeight}px;margin-bottom:-${this._allDayHeight}px` : ""
      }`;
      const allDay = this._config.show_all_day
        ? html`<div class="allday" style=${allDayStyle}>
            ${(day?.allDay || []).map((ev) => {
              const hex = colorToHex(ev.color || "#3366cc") || "#3366cc";
              const fg = fgOn(hex);
              return html`<div
                class="pill"
                style=${`background:${hex};color:${fg};border:1px solid ${hex}`}
                @click=${() => this._open(ev)}
              >${ev.summary}
                ${ev.alsoColors && ev.alsoColors.length
                  ? html`<span style="margin-left:6px; display:inline-flex; gap:3px; vertical-align:middle;">${ev.alsoColors.map(c => html`<span style="width:8px;height:8px;border-radius:2px;display:inline-block;box-shadow:0 0 0 1px rgba(0,0,0,.25) inset;background:${c}"></span>`)}</span>`
                  : nothing}
              </div>`;
            })}
          </div>`
        : nothing;

      const timed = (day?.timed || []).map((ev) => {
        const top = Math.round(ev.top * pxPerMin);
        const height = Math.max(2, Math.round(ev.height * pxPerMin));
        const share = 100 / Math.max(1, ev.cols || day?.laneCount || 1);
        const left = (ev.lane || 0) * share;

        const hex = colorToHex(ev.n.color || "#3366cc") || "#3366cc";
        const fg = fgOn(hex);
        const bg = hex; // opaque

        return html`<div
          class="event"
          title=${ev.n.summary}
          style=${`top:${top}px;height:${height - 2}px;left:${left}%;width:calc(${share}% - 4px);background:${bg};border:1px solid ${hex};color:${fg}`}
          @click=${() => this._open(ev.n)}
        >
          <div class="title">${ev.n.summary}</div>
          ${ev.n.alsoColors && ev.n.alsoColors.length ? html`<div class="marks">${ev.n.alsoColors.map(c => html`<span class="mark" style=${`background:${c}`}></span>`)}</div>` : nothing}
        </div>`;
      });

      const nowLine = this._nowLineForDay(d);
      const wx = this._renderWeatherBand(date);
      const gridLines = this._gridLinesDom(pxPerMin, step);

      out.push(html`
        <div class="col" style=${`grid-column:${2 + d}/${3 + d}`}>
          <div class="dayhdr" style=${headerBg ? `background:${headerBg}` : ""}>
            <div>${label}</div>
            ${wx}
          </div>
          <div class="body" style=${`height:${columnHeight}px; position:relative; ${bodyBg ? `background-color:${bodyBg};` : ""}`}>${allDay}${gridLines}${timed}${nowLine}</div>
        </div>
      `);
    }

    const totalHeight = columnHeight + this._timeColPad + this._allDayHeight;
    out.unshift(html`<style>.grid{grid-template-columns:70px repeat(${this._config.visible_days || 7}, 1fr); height:${totalHeight}px}</style>`);
    return out;
  }

  private _renderWeatherBand(date: Date) {
    const k = dayKey(date);
    const d = this._wxByKey.get(k);
    if (!d) return html`<div class="mcg-wx" data-native></div>`;

    const unit = this._wxUnit || "°";
    const lo = d.lo != null ? `${Math.round(d.lo)}${unit}` : "–";
    const hi = d.hi != null ? `${Math.round(d.hi)}${unit}` : null;
    const pp = d.pp != null ? `${Math.round(d.pp)}%` : null;
    const icon = condIcon(d.cond);

    return html`<div class="mcg-wx" data-native>
      <ha-icon icon=${icon}></ha-icon>
      <span class="lo">${lo}</span>
      ${hi ? html`<span class="sep"></span><span class="hi">${hi}</span>` : nothing}
      ${pp ? html`<span class="pp">• ${pp}</span>` : nothing}
    </div>`;
  }

  private _nowLineForDay(dayIndex: number) {
    const colorRaw = (this._config.now_line_color ?? "#e53935");
    const showLegacy = this._config.show_now_indicator !== false;
    const color = typeof colorRaw === "string" ? colorRaw : "#e53935";
    if (!showLegacy || color === "") return nothing;

    const pxPerMin = this._pxPerMin();
    const start = addMinutes(this._weekAnchor, dayIndex * 24 * 60);
    const end = addMinutes(start, 24 * 60);
    const now = new Date();
    if (now < start || now > end) return nothing;
    const mins = (now.getTime() - start.getTime()) / 60000;
    const top = Math.round(mins * pxPerMin);
    return html`<div class="now" style=${`top:${top}px; background:${color}`}></div>`;
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

    const chips = ev.allCalendars && ev.allCalendars.length ? html`<div style="display:flex; gap:6px; justify-content:flex-end; margin-bottom:8px;">
      ${ev.allCalendars.map(c => html`<span style=${`padding:4px 8px; border-radius:999px; background:${c.color}; color:${fgOn(colorToHex(c.color)||'#3366cc')}; font-size:12px;`}>${c.name}</span>`)}
    </div>` : nothing;

    const body = html`
      <div class="row"><strong>${ev.summary}</strong></div>
      <div class="row">${this._fmtRange(ev.s, ev.e, ev.allDay)}</div>
      ${ev.location ? html`<div class="row">${ev.location}</div>` : nothing}
      ${ev.description ? html`<div class="row">${stripMarkup(ev.description)}</div>` : nothing}
    `;

    if ((customElements as any).get("ha-dialog")) {
      return html`<ha-dialog .open=${this._dialogOpen} @closed=${() => this._closeDialog()}>
        <div slot="heading">${tr(this._lang(), "event_details")}</div>
        ${chips}${body}
        <mwc-button slot="primaryAction" dialogAction="close">${tr(this._lang(), "close")}</mwc-button>
      </ha-dialog>`;
    }

    return html`<div class="overlay" @click=${(e: Event) => (e.target === e.currentTarget ? this._closeDialog() : null)}>
      <div class="modal" role="dialog" aria-modal="true" aria-label="${tr(this._lang(), "event_details")}">
        <h3>${tr(this._lang(), "event_details")}</h3>
        ${chips}${body}
        <div class="actions">
          <button class="btn" @click=${() => this._closeDialog()}>${tr(this._lang(), "close")}</button>
        </div>
      </div>
    </div>`;
  }

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
function stripMarkup(s?: string): string {
  if (!s) return "";
  let t = String(s);
  t = t.replace(/<[^>]*>/g, "");
  t = t.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  t = t.replace(/\*\*|__|\*|_|~~|`+/g, "");
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
  return t.trim();
}

/** Define element (no decorator) and card registration */
if (typeof window !== "undefined") {
  if (!customElements.get(CARD_TAG)) {
    customElements.define(CARD_TAG, MultiCalendarGridCard as any);
  }
  (window as any).customCards = (window as any).customCards || [];
  if (!(window as any).customCards.find((c: any) => c.type === CARD_TAG)) {
    (window as any).customCards.push({
      type: CARD_TAG,
      name: "Multi-Calendar Grid Card",
      description: "N-day time-grid overlay for multiple calendar entities (Lit+TS)",
      preview: false,
    });
  }
}
