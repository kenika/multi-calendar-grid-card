/**
 * Multi Calendar Grid Card (baseline with inline weather)
 * Version: 1.0.1-weather-inline
 *
 * Notes:
 * - Self-contained; no external helpers.
 * - Weather pill uses the same WS logic that worked in the sandbox:
 *     weather.get_forecasts (daily → hourly aggregate → attributes fallback).
 * - You can add your existing event rendering back where indicated.
 */

import { LitElement, html, css, nothing, CSSResultGroup } from "lit";
import { property, state } from "lit/decorators.js";

/* ============================================================================
   BEGIN: Inline Weather Helpers (no external files)
   ========================================================================== */

type WcForecastItem = {
  datetime?: string;            // ISO
  date?: string;                // alt
  time?: string;                // alt
  dt?: string | number;         // alt
  timestamp?: string | number;  // alt

  condition?: string;
  condition_description?: string;
  state?: string;
  symbol?: string;

  temperature?: number;
  temperature_high?: number;
  temp?: number;
  templow?: number;
  temperature_low?: number;

  precipitation_probability?: number;
  precipitation_chance?: number;
  precipitation?: number;       // amount (mm)
  precipitation_unit?: string;

  wind_speed?: number;
  wind_speed_kmh?: number;
  wind_speed_mps?: number;
};

type WcDaily = {
  key: string;          // YYYY-MM-DD
  datetime: string;     // noon ISO for stable formatting
  condition: string;
  temperature: number | null;   // high
  templow: number | null;       // low
  precipitation_probability?: number | null;
  precipitation?: number | null; // amount if available
  wind_speed?: number | null;
};

const WC_INLINE_VERSION = "inline-weather 0.3.3";

const wc_num = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const wc_dayKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const wc_icon = (condRaw: string | undefined) => {
  const cond = (condRaw || "-").toLowerCase().replace(/\s+/g, "");
  const map: Record<string, string> = {
    "clear-night": "mdi:weather-night",
    "cloudy": "mdi:weather-cloudy",
    "fog": "mdi:weather-fog",
    "hail": "mdi:weather-hail",
    "lightning": "mdi:weather-lightning",
    "lightning-rainy": "mdi:weather-lightning-rainy",
    "partlycloudy": "mdi:weather-partly-cloudy",
    "pouring": "mdi:weather-pouring",
    "rainy": "mdi:weather-rainy",
    "snowy": "mdi:weather-snowy",
    "snowy-rainy": "mdi:weather-snowy-rainy",
    "sunny": "mdi:weather-sunny",
    "windy": "mdi:weather-windy",
    "windy-variant": "mdi:weather-windy-variant",
    "exceptional": "mdi:weather-alert",
  };
  const norm = cond
    .replace("overcast", "cloudy")
    .replace("partlysunny", "partlycloudy")
    .replace("mostlycloudy", "partlycloudy")
    .replace("drizzle", "rainy");
  return map[norm] || map[cond] || "mdi:weather-cloudy";
};

const wc_mode = (arr: string[]) => {
  if (!arr.length) return null;
  const m = new Map<string, number>();
  for (const v of arr) m.set(v, (m.get(v) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

const wc_fmtTemp = (v: number | null | undefined, unit: string) =>
  v == null ? null : `${Math.round(v)}${unit || "°"}`;

const wc_aggregateHourlyToDaily = (hourly: WcForecastItem[], daysWanted: number): WcDaily[] => {
  const byDay = new Map<string, WcForecastItem[]>();
  const todayKey = wc_dayKey(new Date());

  for (const h of hourly) {
    const base =
      h.datetime ??
      h.date ??
      h.time ??
      (typeof h.dt === "number" ? h.dt : h.dt) ??
      h.timestamp ??
      Date.now();
    const when = new Date(base as any);
    const key = wc_dayKey(when);
    if (key < todayKey) continue;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(h);
  }

  const days: WcDaily[] = [];
  for (const [key, list] of [...byDay.entries()].sort()) {
    let tMax = -Infinity, tMin = +Infinity;
    let precipProb = null as number | null;
    let precipAmt = null as number | null;
    let wind = null as number | null;

    for (const it of list) {
      const t = wc_num(it.temperature ?? it.temp);
      if (t != null) {
        if (t > tMax) tMax = t;
        if (t < tMin) tMin = t;
      }
      const pp = wc_num(it.precipitation_probability ?? it.precipitation_chance);
      if (pp != null) precipProb = precipProb == null ? pp : Math.max(precipProb, pp);

      const pa = wc_num(it.precipitation);
      if (pa != null) precipAmt = (precipAmt ?? 0) + pa;

      const ws = wc_num(it.wind_speed ?? it.wind_speed_kmh ?? it.wind_speed_mps);
      if (ws != null) wind = wind == null ? ws : Math.max(wind, ws);
    }
    if (!Number.isFinite(tMax)) tMax = null as any;
    if (!Number.isFinite(tMin)) tMin = null as any;

    const cond = wc_mode(
      list
        .map((it) => it.condition ?? it.condition_description ?? it.symbol ?? it.state)
        .filter(Boolean) as string[]
    ) ?? "-";

    days.push({
      key,
      datetime: `${key}T12:00:00`,
      condition: cond,
      temperature: tMax as any,
      templow: tMin as any,
      precipitation_probability: precipProb,
      precipitation: precipAmt,
      wind_speed: wind,
    });

    if (days.length >= daysWanted) break;
  }
  return days;
};

const wc_fetchViaService = async (hass: any, entityId: string, type: "daily" | "hourly"): Promise<WcForecastItem[]> => {
  const resp = await hass.callWS({
    type: "call_service",
    domain: "weather",
    service: "get_forecasts",
    service_data: { entity_id: entityId, type },
    return_response: true,
  });
  const payload = resp?.response ?? resp ?? {};
  const data = payload[entityId] ?? payload;
  const list = data?.forecast ?? [];
  return Array.isArray(list) ? (list as WcForecastItem[]) : [];
};

class WeatherInlineCache {
  private _hass: any | null = null;
  private _entity = "";
  private _days = 7;
  private _lastChanged?: string;
  private _unit = "°";
  private _byKey = new Map<string, WcDaily>();

  constructor(entity: string, days = 7) {
    this._entity = entity;
    this._days = days;
  }

  setHass(hass: any) {
    this._hass = hass;
    const st = hass?.states?.[this._entity];
    if (st) this._unit = st.attributes?.temperature_unit ?? "°";
  }

  get unit() { return this._unit; }

  get(key: string): WcDaily | undefined {
    return this._byKey.get(key);
  }

  keys(): string[] {
    return [...this._byKey.keys()];
  }

  async refreshIfNeeded(): Promise<void> {
    if (!this._hass) return;
    const st = this._hass.states?.[this._entity];
    if (!st) return;

    if (this._lastChanged === st.last_changed && this._byKey.size) return;
    this._lastChanged = st.last_changed;

    // 1) WS daily
    let items = await wc_fetchViaService(this._hass, this._entity, "daily");

    // 2) WS hourly → aggregate
    if (!items?.length) {
      const hourly = await wc_fetchViaService(this._hass, this._entity, "hourly");
      if (hourly?.length) items = wc_aggregateHourlyToDaily(hourly, this._days) as any;
    }

    // 3) attributes.forecast last resort
    if (!items?.length) {
      const attrList = st.attributes?.forecast;
      if (Array.isArray(attrList) && attrList.length) {
        items = attrList;
      }
    }

    // Normalize to WcDaily
    const normalized: WcDaily[] = (items as any[]).map((f) => {
      const dt = new Date(f.datetime || f.date || f.time || f.dt || f.timestamp || Date.now());
      const key = wc_dayKey(dt);
      return {
        key,
        datetime: `${key}T12:00:00`,
        condition: (f.condition ?? f.condition_description ?? f.symbol ?? f.state ?? "-").toString(),
        temperature: wc_num(f.temperature ?? f.temperature_high ?? f.temp),
        templow: wc_num(f.templow ?? f.temperature_low),
        precipitation_probability: wc_num(f.precipitation_probability ?? f.precipitation_chance),
        precipitation: wc_num(f.precipitation),
        wind_speed: wc_num(f.wind_speed ?? f.wind_speed_kmh ?? f.wind_speed_mps),
      };
    });

    this._byKey.clear();
    for (const d of normalized) if (!this._byKey.has(d.key)) this._byKey.set(d.key, d);
    const keys = [...this._byKey.keys()].sort().slice(0, this._days);
    const pruned = new Map<string, WcDaily>();
    for (const k of keys) pruned.set(k, this._byKey.get(k)!);
    this._byKey = pruned;
  }

  renderHeaderPill(d: Date) {
    const day = this.get(wc_dayKey(d));
    if (!day) return nothing;

    const icon = wc_icon(day.condition);
    const hi = wc_fmtTemp(day.temperature, this._unit) ?? "–";
    const lo = day.templow != null ? wc_fmtTemp(day.templow, this._unit) : null;
    const rr = day.precipitation_probability;
    const ra = day.precipitation;

    return html`
      <div class="wc-pill" title=${day.condition}>
        <ha-icon class="wc-icon" .icon=${icon}></ha-icon>
        <span class="wc-temp">${hi}${lo ? html`<span class="wc-sep">/</span>${lo}` : nothing}</span>
        ${rr != null ? html`<span class="wc-meta">· ${Math.round(rr)}%</span>` : nothing}
        ${ra != null ? html`<span class="wc-meta">· ${Math.round(ra)}mm</span>` : nothing}
      </div>
    `;
  }

  static styles = `
    .wc-pill{display:inline-flex;align-items:center;gap:.35rem;font:inherit}
    .wc-icon{--mdc-icon-size:20px}
    .wc-temp{font-weight:600}
    .wc-sep{color:var(--secondary-text-color);margin:0 .125rem}
    .wc-meta{color:var(--secondary-text-color);margin-left:.25rem;font-size:.9em}
  `;
}

export type WcGlue = {
  wc_setWeather(hass:any, entity:string, days?:number): void;
  wc_refreshWeather(): Promise<void>;
  wc_weatherPillFor(date: Date): any; // TemplateResult|nothing
  wc_weatherUnit(): string;
  wc_weatherCss(): string;
};

export const makeWeatherGlue = (): WcGlue => {
  let cache: WeatherInlineCache | null = null;

  return {
    wc_setWeather(hass, entity, days = 7) {
      if (!entity) { cache = null; return; }
      cache = new WeatherInlineCache(entity, days);
      cache.setHass(hass);
    },
    async wc_refreshWeather() {
      if (cache) await cache.refreshIfNeeded();
    },
    wc_weatherPillFor(date: Date) {
      return cache ? cache.renderHeaderPill(date) : nothing;
    },
    wc_weatherUnit() { return cache ? cache.unit : "°"; },
    wc_weatherCss() { return WeatherInlineCache.styles; },
  };
};
/* ============================================================================
   END: Inline Weather Helpers
   ========================================================================== */


/* ============================================================================
   Multi Calendar Grid Card (baseline)
   ========================================================================== */

interface MultiCalendarGridCardConfig {
  type: string;
  title?: string;
  weeks?: number;             // default 6
  start_week_on?: number;     // 0=Sun..6=Sat (default from browser locale heuristic: Mon=1)
  weather_entity?: string;    // e.g. weather.integra_langsbau_1_3
  weather_days?: number;      // default 7
}

export class MultiCalendarGridCard extends LitElement {
  @property({ attribute: false }) public hass: any;
  @state() private _config!: MultiCalendarGridCardConfig;

  // Weather glue
  private _weather = makeWeatherGlue();
  private _weatherConfigured = false;

  // Calendar grid state
  @state() private _baseDate: Date = new Date(); // today; center month around this
  @state() private _days: Date[] = [];

  setConfig(config: MultiCalendarGridCardConfig) {
    if (!config || config.type !== "custom:multi-calendar-grid-card") {
      // allow relaxed: if type missing, still accept
    }
    this._config = {
      weeks: 6,
      start_week_on: undefined,
      ...config,
    };
    this._weatherConfigured = !!this._config.weather_entity;

    // Prepare days immediately
    this._recomputeDays();
  }

  set hassProxy(h: any) { this.hass = h; } // (compat)

  setHassInternal(hass: any) {
    this.hass = hass;
  }

  set hassSetter(hass: any) {
    this.hass = hass;
  }

  set hassUnsafe(hass: any) {
    this.hass = hass;
  }

  set hass(hass: any) {
    (this as any)._hass = hass;
    if (!hass || !this._config) return;

    // Weather init + refresh
    if (this._weatherConfigured) {
      this._weather.wc_setWeather(
        this.hass,
        this._config.weather_entity!,
        this._config.weather_days ?? 7
      );
      this._weather.wc_refreshWeather().then(() => this.requestUpdate());
    }

    // Recompute when month or locale might change (cheap)
    this._recomputeDays();
  }

  get hass() {
    return (this as any)._hass;
  }

  // Build a 6-week (or user-configured) grid for the month of _baseDate
  private _recomputeDays() {
    const weeks = this._config?.weeks ?? 6;
    const startOn =
      typeof this._config?.start_week_on === "number"
        ? this._config.start_week_on!
        : 1; // default Monday

    const firstOfMonth = new Date(this._baseDate.getFullYear(), this._baseDate.getMonth(), 1);
    const firstDow = firstOfMonth.getDay(); // 0..6 (Sun..Sat)

    // Compute offset from desired week start
    let delta = firstDow - startOn;
    if (delta < 0) delta += 7;

    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - delta);

    const totalDays = weeks * 7;
    const days: Date[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    this._days = days;
  }

  private _prevMonth() {
    const d = new Date(this._baseDate);
    d.setMonth(d.getMonth() - 1);
    this._baseDate = d;
    this._recomputeDays();
    if (this._weatherConfigured) this._weather.wc_refreshWeather();
  }

  private _nextMonth() {
    const d = new Date(this._baseDate);
    d.setMonth(d.getMonth() + 1);
    this._baseDate = d;
    this._recomputeDays();
    if (this._weatherConfigured) this._weather.wc_refreshWeather();
  }

  private _today() {
    this._baseDate = new Date();
    this._recomputeDays();
    if (this._weatherConfigured) this._weather.wc_refreshWeather();
  }

  private _isSameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private _inCurrentMonth(d: Date) {
    return d.getMonth() === this._baseDate.getMonth();
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .title {
        font-weight: 600;
      }
      .subtitle {
        color: var(--secondary-text-color);
        font-size: 12px;
      }
      .nav {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .nav button {
        background: var(--primary-background-color);
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 6px 10px;
        cursor: pointer;
        color: var(--primary-text-color);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 8px;
      }
      .dow {
        text-align: center;
        font-weight: 600;
        color: var(--secondary-text-color);
        margin-bottom: 4px;
      }
      .cell {
        border: 1px solid var(--divider-color);
        border-radius: 10px;
        min-height: 86px;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .cell.dimmed {
        opacity: 0.6;
      }
      .dayhead {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
      }
      .daynum {
        font-weight: 600;
      }
      .today {
        color: var(--primary-color);
      }
      /* Weather pill styles (inline string duplicated for simplicity) */
      .wc-pill{display:inline-flex;align-items:center;gap:.35rem;font:inherit}
      .wc-icon{--mdc-icon-size:20px}
      .wc-temp{font-weight:600}
      .wc-sep{color:var(--secondary-text-color);margin:0 .125rem}
      .wc-meta{color:var(--secondary-text-color);margin-left:.25rem;font-size:.9em}
      .status {
        color: var(--secondary-text-color);
        font-size: 12px;
        margin-top: 6px;
      }
      .version {
        color: var(--secondary-text-color);
        font-size: 11px;
        margin-top: 6px;
        text-align: right;
      }
    `;
  }

  render() {
    if (!this.hass || !this._config) return nothing;

    const monthLabel = this._baseDate.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
    const titleToShow = this._config.title ?? monthLabel;

    // Weekday labels (start day configurable)
    const startOn =
      typeof this._config?.start_week_on === "number"
        ? this._config.start_week_on!
        : 1; // default Monday
    const weekLabels: string[] = [];
    for (let i = 0; i < 7; i++) {
      const day = (startOn + i) % 7;
      const d = new Date(2024, 0, 7 + day); // a Sunday-based week reference
      weekLabels.push(
        d.toLocaleDateString(undefined, { weekday: "short" })
      );
    }

    return html`
      <ha-card>
        <div class="header">
          <div class="title">
            ${titleToShow}
            <div class="subtitle">
              ${this._config.title ? monthLabel : nothing}
            </div>
            <div class="status">
              ${this._config.weather_entity
                ? html`Weather: <code>${this._config.weather_entity}</code> · ${WC_INLINE_VERSION}`
                : nothing}
            </div>
          </div>
          <div class="nav">
            <button @click=${this._prevMonth} title="Previous month">‹</button>
            <button @click=${this._today} title="Go to today">Today</button>
            <button @click=${this._nextMonth} title="Next month">›</button>
          </div>
        </div>

        <!-- Day of week header row -->
        <div class="grid">
          ${weekLabels.map(
            (lbl) => html`<div class="dow">${lbl}</div>`
          )}
        </div>

        <!-- Month grid -->
        <div class="grid">
          ${this._days.map((d) => {
            const inMonth = this._inCurrentMonth(d);
            const isToday = this._isSameDay(d, new Date());
            const weatherPill = this._weatherConfigured
              ? this._weather.wc_weatherPillFor(d)
              : nothing;
            return html`
              <div class="cell ${inMonth ? "" : "dimmed"}">
                <div class="dayhead">
                  <div class="daynum ${isToday ? "today" : ""}">
                    ${d.getDate()}
                  </div>
                  <div>${weatherPill}</div>
                </div>

                <!-- TODO: Insert your event list for this day here.
                     You can render your existing per-day events below. -->
              </div>
            `;
          })}
        </div>

        <div class="version">Multi Calendar Grid Card v1.0.1-weather-inline</div>
      </ha-card>
    `;
  }

  getCardSize() {
    // Rough estimate to keep HA happy in masonry layout
    return 6;
  }
}

customElements.define("multi-calendar-grid-card", MultiCalendarGridCard);

declare global {
  interface HTMLElementTagNameMap {
    "multi-calendar-grid-card": MultiCalendarGridCard;
  }
}
