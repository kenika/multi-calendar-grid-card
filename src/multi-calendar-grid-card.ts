/**
 * Multi-Calendar Grid Card — Lit + TypeScript (no decorators)
 * Version is injected at build time via __VERSION__ (see CI workflow).
 */

import { LitElement, html, css, nothing, PropertyValues } from "lit";

// The workflow injects a string into __VERSION__ at build time.
// In dev/PRs (no injection), we fall back to "dev".
declare const __VERSION__: string | undefined;
const VERSION = (typeof __VERSION__ !== "undefined" && __VERSION__) ? __VERSION__ : "dev";

// ---------- Types ----------
export interface McgEntityConfig { entity: string; name?: string; color?: string; }
export interface McgConfig {
  type?: string;
  entities: McgEntityConfig[];
  first_day?: number;          // 0=Sun..6=Sat (default 1 Mon)
  slot_min_time?: string;      // "HH:MM:SS"
  slot_max_time?: string;      // "HH:MM:SS" (informational)
  slot_minutes?: number;       // grid minor
  locale?: string;
  show_now_indicator?: boolean;
  show_all_day?: boolean;
  height_vh?: number;          // viewport height
  remember_offset?: boolean;
  storage_key?: string;
  header_compact?: boolean;
  data_refresh_minutes?: number;
  px_per_min?: number;         // vertical scale
}

interface HassEntityEventRaw {
  start: any; end: any; summary?: string; location?: string; description?: string; [k: string]: any;
}
interface NormalizedEvent {
  s: Date; e: Date; allDay: boolean; summary: string; location?: string; description?: string; color: string; src: string; raw: HassEntityEventRaw;
}
interface TimedLayout { n: NormalizedEvent; top: number; height: number; lane: number; }
interface DayBucket { date: Date; allDay: NormalizedEvent[]; timed: TimedLayout[]; laneCount: number; }

// Minimal HA surface we use
export interface HomeAssistantLike {
  callApi(method: string, path: string): Promise<any>;
  locale?: { language?: string; time_format?: "12" | "24" };
}

const TAG = "multi-calendar-grid-card";
const STORAGE_PREFIX = TAG;

const DEFAULTS: Required<Omit<McgConfig, "entities" | "type">> = {
  first_day: 1,
  slot_min_time: "07:00:00",
  slot_max_time: "22:00:00",
  slot_minutes: 30,
  locale: "en",
  show_now_indicator: true,
  show_all_day: true,
  height_vh: 80,
  remember_offset: true,
  storage_key: `${STORAGE_PREFIX}.weekOffset`,
  header_compact: false,
  data_refresh_minutes: 5,
  px_per_min: 1.6,
};

// ---------- Utilities ----------
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const parseHHMMSS = (s?: string) => /^\d{2}:\d{2}:\d{2}$/.test(String(s || ""));
const minsFrom = (s: string) => { const [H, M, S] = s.split(":").map(Number); return H * 60 + M + (S || 0) / 60; };
const weekStartOf = (d: Date, first: number) => { const x = new Date(d); const off = (x.getDay() + 7 - (first % 7)) % 7; x.setHours(0,0,0,0); x.setDate(x.getDate() - off); return x; };
const addMin = (dt: Date, m: number) => { const d = new Date(dt); d.setMinutes(d.getMinutes() + m); return d; };
const hexToRgb = (hex?: string) => { const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#3366cc"); if (!m) return { r: 51, g: 102, b: 204 }; return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }; };
const textOn = (hex?: string) => { const { r, g, b } = hexToRgb(hex); const L = (0.299*r + 0.587*g + 0.114*b) / 255; return L > 0.6 ? "#111" : "#fff"; };
const softBg = (hex?: string, a = 0.55) => { const { r, g, b } = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };

// ---------- Card ----------
export class MultiCalendarGridCard extends LitElement {
  static version = VERSION;

  static properties = {
    hass: { attribute: false },
    _config: { attribute: false, state: true },
    _weekOffset: { state: true },
    _error: { state: true },
    _weekStart: { state: true },
    _days: { state: true },
  };

  public hass!: HomeAssistantLike;

  private _config!: McgConfig;
  private _weekOffset = 0;
  private _error: string | null = null;
  private _weekStart!: Date;
  private _days: DayBucket[] = [];

  private _tick?: number; private _refresh?: number;
  private _active: Record<string, boolean> = {};
  private _scrollEl?: HTMLElement;

  static getConfigElement() {
    const div = document.createElement("div");
    div.innerHTML = `<div style="padding:8px">Use YAML to configure this card. Lit editor coming soon. (v${VERSION})</div>`;
    return div;
  }

  public setConfig(config: McgConfig) {
    if (!config || !Array.isArray(config.entities) || config.entities.length === 0) {
      throw new Error("Config must include at least one entity in 'entities'.");
    }
    if (!parseHHMMSS(config.slot_min_time)) throw new Error("slot_min_time must be HH:MM:SS");
    if (!parseHHMMSS(config.slot_max_time)) throw new Error("slot_max_time must be HH:MM:SS");

    this._config = { ...DEFAULTS, ...config } as McgConfig;

    this._active = {};
    for (const e of this._config.entities) this._active[e.entity] = true;

    try {
      if (this._config.remember_offset) {
        const v = Number(localStorage.getItem(this._config.storage_key || `${STORAGE_PREFIX}.weekOffset`));
        this._weekOffset = Number.isFinite(v) ? v : 0;
      } else {
        this._weekOffset = 0;
      }
    } catch { this._weekOffset = 0; }

    this._recomputeWeekBounds();
  }

  getCardSize() { const vh = Number(this._config?.height_vh || 80); const approx = Math.max(300, vh * 7); return Math.ceil(approx / 50); }

  connectedCallback(): void { super.connectedCallback(); this._startTimers(); }
  disconnectedCallback(): void { super.disconnectedCallback(); this._stopTimers(); }

  protected firstUpdated(_changed: PropertyValues) {
    this._scrollEl = (this.shadowRoot || this.renderRoot).querySelector<HTMLElement>(".scroll") || undefined;
    this._restoreScroll();
  }

  protected updated(changed: PropertyValues) {
    if (changed.has("_config")) {
      this._recomputeWeekBounds();
      this._fetchEvents();
      (this as any).updateComplete.then(() => this._restoreScroll());
    }
  }

  private async _fetchEvents() {
    if (!this.hass) return;
    this._error = null;

    const start = this._weekStart; const end = addMin(start, 7 * 24 * 60);
    const startISO = start.toISOString(); const endISO = end.toISOString();

    const all: HassEntityEventRaw[] = [];
    for (const ent of this._config.entities) {
      const path = `calendars/${ent.entity}?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`;
      try {
        const evs = await this.hass.callApi("GET", path);
        if (Array.isArray(evs)) all.push(...evs.map((e: any) => ({ ...e, __color: ent.color, __id: ent.entity })));
      } catch (e: any) {
        console.error("Calendar fetch failed:", ent.entity, e);
        this._error = this._error || "Failed to load one or more calendars";
      }
    }

    const days: DayBucket[] = [];
    for (let i = 0; i < 7; i++) {
      const d0 = addMin(start, i * 24 * 60);
      const d1 = addMin(d0, 24 * 60);
      const allDay: NormalizedEvent[] = [];
      const timed: TimedLayout[] = [];

      for (const ev of all) {
        const srcId = (ev as any).__id as string;
        if (!this._active[srcId]) continue;
        const n = this._norm(ev as any, srcId);
        if (!(n.e > d0 && n.s < d1)) continue;

        if (n.allDay) {
          if (this._config.show_all_day) allDay.push(n);
        } else {
          const startM = Math.max(0, (n.s.getTime() - d0.getTime()) / 60000);
          const endM = Math.max(0, (n.e.getTime() - d0.getTime()) / 60000);
          const top = Math.max(0, startM);
          const height = Math.max(1, Math.min(1440, Math.max(top + 1, endM)) - top);
          timed.push({ n, top, height, lane: 0 });
        }
      }

      timed.sort((a, b) => a.top - b.top || b.height - a.height);
      const lanes: number[] = [];
      for (const ev of timed) {
        let placed = false;
        for (let li = 0; li < lanes.length; li++) {
          if (ev.top >= lanes[li]) { lanes[li] = ev.top + ev.height; ev.lane = li; placed = true; break; }
        }
        if (!placed) { ev.lane = lanes.length; lanes.push(ev.top + ev.height); }
      }

      days.push({ date: d0, allDay, timed, laneCount: Math.max(1, lanes.length) });
    }

    this._days = days;
  }

  private _norm(ev: HassEntityEventRaw, src: string): NormalizedEvent {
    const sRaw: any = (ev as any).start?.dateTime || (ev as any).start?.date || (ev as any).start;
    const eRaw: any = (ev as any).end?.dateTime || (ev as any).end?.date || (ev as any).end;
    const hasTime = Boolean((ev as any).start?.dateTime || (ev as any).end?.dateTime ||
      (typeof sRaw === "string" && sRaw.includes("T")) ||
      (typeof eRaw === "string" && eRaw.includes("T")));
    const s = new Date(sRaw); const e = new Date(eRaw); const allDay = !hasTime;
    return {
      s, e, allDay, summary: (ev as any).summary || "(no title)",
      location: (ev as any).location, description: (ev as any).description,
      color: (ev as any).__color || "#3366cc", src, raw: ev,
    };
  }

  private _startTimers() {
    this._stopTimers();
    this._tick = window.setInterval(() => (this as any).requestUpdate(), 60 * 1000);
    const mins = clamp(Number(this._config?.data_refresh_minutes) || 5, 1, 60);
    this._refresh = window.setInterval(() => this._fetchEvents(), mins * 60 * 1000);
  }
  private _stopTimers() {
    if (this._tick) window.clearInterval(this._tick);
    if (this._refresh) window.clearInterval(this._refresh);
    this._tick = undefined; this._refresh = undefined;
  }

  private _recomputeWeekBounds() {
    const base = weekStartOf(new Date(), this._config?.first_day ?? 1);
    const s = new Date(base); s.setDate(s.getDate() + this._weekOffset * 7);
    this._weekStart = s;
  }

  private _saveOffset() {
    if (!this._config.remember_offset) return;
    try { localStorage.setItem(this._config.storage_key!, String(this._weekOffset)); } catch {}
  }

  private _restoreScroll() {
    const minPrefMin = minsFrom(this._config.slot_min_time!);
    const ppm = Number(this._config.px_per_min) || 1.6;
    const headerOffset = 24;
    const minPrefPx = Math.max(0, Math.round(minPrefMin * ppm) - headerOffset);

    let target = minPrefPx;
    if (this._config.remember_offset) {
      try {
        const key = this._config.storage_key! + ".scrollTop";
        const saved = Number(localStorage.getItem(key));
        if (Number.isFinite(saved)) target = Math.max(minPrefPx, saved);
      } catch {}
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const sc = (this.shadowRoot || this.renderRoot).querySelector<HTMLElement>(".scroll");
      if (sc) sc.scrollTop = target;
    }));
  }

  private _persistScroll() {
    if (!this._config.remember_offset) return;
    try {
      const sc = (this.shadowRoot || this.renderRoot).querySelector<HTMLElement>(".scroll");
      const key = this._config.storage_key! + ".scrollTop";
      if (sc) localStorage.setItem(key, String(sc.scrollTop));
    } catch {}
  }

  private _shiftWeek(delta = 0, toToday = false) {
    if (toToday) this._weekOffset = 0; else this._weekOffset += delta;
    this._saveOffset(); this._recomputeWeekBounds(); this._fetchEvents();
    (this as any).updateComplete.then(() => this._restoreScroll());
  }

  private _fmtRange(s: Date, e: Date) {
    const hassLocale = (this as any)?.hass?.locale;
    const locale = this._config.locale || hassLocale?.language || "en";
    const hourCycle: any = hassLocale?.time_format === "12" ? "h12" : "h23";
    const tFmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle });
    const dFmt = new Intl.DateTimeFormat(locale, { weekday: "short", day: "2-digit", month: "short" });
    const same = s.toDateString() === e.toDateString();
    return same ? `${dFmt.format(s)} • ${tFmt.format(s)}–${tFmt.format(e)}`
                : `${dFmt.format(s)} ${tFmt.format(s)} → ${dFmt.format(e)} ${tFmt.format(e)}`;
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
    .error{color:#fff; background:#d32f2f; padding:6px 10px; border-radius:8px; font-size:12px; margin:0 12px 8px}
    .empty{color:var(--secondary-text-color); padding:8px 12px; font-size:12px}
    .scroll{height: var(--mcg-height, 80vh); margin: 0 12px 12px; overflow-y:auto; overscroll-behavior:contain; border:1px solid var(--divider-color,#e0e0e0); border-radius:12px; background:var(--divider-color,#e0e0e0)}
    .grid{position:relative; display:grid; grid-template-columns:70px repeat(7,1fr); gap:1px; background:var(--divider-color,#e0e0e0)}
    .col{background:var(--card-background-color,#fff); position:relative}
    .col.today{outline:2px solid var(--primary-color); outline-offset:-2px}
    .dayhdr{position:sticky; top:0; background:var(--card-background-color,#fff); z-index:2; font-weight:800; padding:8px 10px; border-bottom:1px solid var(--divider-color,#e0e0e0); display:flex; align-items:center; gap:8px}
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
  `;

  render() {
    const ws = this._weekStart;
    const we = addMin(new Date(ws), 7 * 24 * 60 - 1);
    const fmt = new Intl.DateTimeFormat(this._config.locale || "en", { day: "2-digit", month: "short" });
    const vh = Number(this._config.height_vh || 80);

    return html`
      <ha-card>
        <div class="hdr">
          <div class="legend">
            ${this._config.entities.map((ent) => this._legendItem(ent))}
          </div>
          <div class="badge" title="${this._error ? this._error : ""}">
            ${fmt.format(ws)} – ${fmt.format(we)}
          </div>
          <div class="toolbar">
            <button @click=${() => this._shiftWeek(-1)}>Prev</button>
            <button @click=${() => this._shiftWeek(0, true)}>Today</button>
            <button @click=${() => this._shiftWeek(1)}>Next</button>
          </div>
        </div>
        ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
        ${this._anyEvents() ? nothing : html`<div class="empty">No events in this range.</div>`}
        <div class="scroll" style=${`--mcg-height:${vh}vh`} @scroll=${this._persistScroll}>
          <div class="grid">
            ${this._timeColumn()}
            ${this._dayColumns(ws)}
          </div>
        </div>
        <div class="footer">Multi-Calendar Grid Card v${VERSION}</div>
      </ha-card>
    `;
  }

  private _legendItem(ent: McgEntityConfig) {
    const active = !!this._active[ent.entity];
    const cls = active ? "item" : "item inactive";
    return html`<div class=${cls} @click=${() => { this._active[ent.entity] = !active; this._fetchEvents(); }}>
      <span class="dot" style=${`background:${ent.color || "#3366cc"}`}></span>
      <span>${ent.name || ent.entity}</span>
    </div>`;
  }

  private _timeColumn() {
    const elems: unknown[] = [];
    const ppm = Number(this._config.px_per_min) || 1.6;
    for (let m = 0; m <= 1440; m += 30) {
      const y = Math.round(m * ppm);
      elems.push(html`<div class=${m % 60 === 0 ? "tick" : "tick minor"} style=${`top:${y}px`}></div>`);
      if (m % 60 === 0) elems.push(html`<div class="hour-label" style=${`top:${y - 8}px`}>${String(Math.floor(m / 60)).padStart(2, "0")}:00</div>`);
    }
    return html`<div class="timecol" style="grid-column:1/2; grid-row:1/-1; position:relative">${elems}</div>`;
  }

  private _dayColumns(ws: Date) {
    const cols: unknown[] = [];
    const ppm = Number(this._config.px_per_min) || 1.6;
    const contentPx = Math.round(1440 * ppm);
    const today = new Date(); today.setHours(0,0,0,0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(ws); d.setDate(d.getDate() + i);
      const isToday = d.getTime() === today.getTime();
      const labelTxt = d.toLocaleDateString(this._config.locale || "en", { weekday: "short", day: "2-digit", month: "short" });

      const day = this._days[i];
      const allday = this._config.show_all_day ? html`<div class="allday">
        ${(day?.allDay || []).map((n) => html`<div class="pill" @click=${() => this._openDetails(n)}>${n.summary}</div>`)}
      </div>` : nothing;

      const laneCount = day?.laneCount || 1;
      const timedBlocks = (day?.timed || []).map((ev) => {
        const topPx = Math.round(ev.top * ppm);
        const hPx = Math.max(2, Math.round(ev.height * ppm));
        const widthPct = 100 / laneCount; const leftPct = ev.lane * widthPct;
        const color = ev.n.color; const text = textOn(color); const bg = softBg(color, 0.55);
        return html`<div class="event" title=${ev.n.summary}
          style=${`top:${topPx}px;height:${hPx - 2}px;left:${leftPct}%;width:calc(${widthPct}% - 4px);background:${bg};border:1px solid ${color};color:${text}`}
          @click=${() => this._openDetails(ev.n)}>
          <div class="title">${ev.n.summary}</div>
        </div>`;
      });

      const nowLine = this._config.show_now_indicator && this._weekOffset === 0 ? this._nowLineForDay(i) : nothing;

      cols.push(html`
        <div class=${isToday ? "col today" : "col"} style=${`grid-column:${2 + i}/${3 + i}`}>
          <div class=${isToday ? "dayhdr today" : "dayhdr"}>${labelTxt} ${isToday ? html`<span class="today-pill">Today</span>` : nothing}</div>
          ${allday}
          <div class="body" style=${`height:${contentPx}px; position:relative`}>${timedBlocks}${nowLine}</div>
        </div>
      `);
    }
    cols.unshift(html`<style>.grid{height:${contentPx}px}</style>`);
    return cols;
  }

  private _nowLineForDay(i: number) {
    const now = new Date();
    const start = new Date(this._weekStart); start.setDate(start.getDate() + i);
    const end = addMin(start, 24 * 60);
    if (now < start || now > end) return nothing;
    const ppm = Number(this._config.px_per_min) || 1.6;
    const mins = (now.getTime() - start.getTime()) / 60000;
    const yPx = Math.round(mins * ppm);
    return html`<div class="now" style=${`top:${yPx}px`}></div>`;
  }

  private _openDetails(n: NormalizedEvent) {
    const msg = `${n.summary}\n${this._fmtRange(n.s, n.e)}${n.location ? `\n${n.location}` : ""}${n.description ? `\n\n${n.description}` : ""}`;
    window.alert(msg);
  }

  private _anyEvents() {
    return (this._days || []).some((d) => (d.allDay?.length || 0) + (d.timed?.length || 0) > 0);
  }
}

// Register element
if (!customElements.get(TAG)) customElements.define(TAG, MultiCalendarGridCard);

// Register in card picker
declare global { interface Window { customCards?: any[] } }
window.customCards = window.customCards || [];
if (!window.customCards.find((c) => c.type === TAG)) {
  window.customCards.push({
    type: TAG,
    name: "Multi-Calendar Grid Card",
    description: "7-day time-grid overlay for multiple calendar entities (Lit+TS)",
    preview: false,
  });
}
