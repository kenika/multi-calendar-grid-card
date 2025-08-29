/* Multi-Calendar Grid Card – Visual Editor
 * Calendar block layout, max 10, highlight colors with None, capped width
 * Adds global 12/24h time format
 * Version: 0.8.0-dev.9
 */
import { LitElement, css, html, nothing } from "lit";

type EntityCfg = {
  entity: string;
  name?: string;
  color?: string;
};

type CardConfig = {
  entities?: EntityCfg[];
  weather_entity?: string;

  // Hidden but preserved
  weather_days?: number;
  weather_compact?: boolean;
  header_compact?: boolean;
  start_today?: boolean;
  first_day?: number | "today";
  show_all_day?: boolean;
  slot_minutes?: number;
  px_per_min?: number;
  show_now_indicator?: boolean;

  // Shown
  slot_min_time?: string;
  slot_max_time?: string;
  height_vh?: number;
  remember_offset?: boolean;
  data_refresh_minutes?: number;
  locale?: string;
  time_format?: "12" | "24";
  // Highlights as colors (empty string disables)
  today_color?: string;
  weekend_color?: string;
  now_line_color?: string;
};

const DEFAULTS = {
  slot_min_time: "07:00:00",
  slot_max_time: "22:00:00",
  slot_minutes: 30,
  px_per_min: 1.6,
  height_vh: 80,
  remember_offset: true,
  data_refresh_minutes: 5,
  time_format: "24",
  today_color: "rgba(33,150,243,.10)",
  weekend_color: "rgba(0,0,0,.05)",
  now_line_color: "#e53935",
} as const;

const MAX_CALENDARS = 10;

export class MultiCalendarGridCardEditor extends LitElement {
  hass: any;
  private _config: CardConfig = {};

  static properties = {
    hass: { attribute: false },
    _config: { attribute: false, state: true },
  };

  setConfig(config: CardConfig) {
    this._config = {
      ...config,
      entities: Array.isArray(config.entities) ? [...config.entities] : [],
    };
    this._syncDerivedPxPerMin();
  }

  private _updateConfig(patch: Partial<CardConfig>) {
    const next: CardConfig = { ...this._config, ...patch };
    this._config = next;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: next } }));
  }

  private _updateEntity(idx: number, patch: Partial<EntityCfg>) {
    const ents = [...(this._config.entities || [])];
    const cur = ents[idx] || { entity: "" };
    ents[idx] = { ...cur, ...patch };
    this._updateConfig({ entities: ents });
  }

  private _addEntity() {
    const ents = [...(this._config.entities || [])];
    if (ents.length >= MAX_CALENDARS) return;
    ents.push({ entity: "", name: "", color: "#3f51b5" });
    this._updateConfig({ entities: ents });
  }

  private _removeEntity(idx: number) {
    const ents = [...(this._config.entities || [])];
    ents.splice(idx, 1);
    this._updateConfig({ entities: ents });
  }

  private _timeToHHMMSS(v: string): string {
    if (!v) return "";
    const parts = v.split(":");
    if (parts.length === 2) return `${parts[0].padStart(2,"0")}:${parts[1].padStart(2,"0")}:00`;
    if (parts.length === 3) return `${parts[0].padStart(2,"0")}:${parts[1].padStart(2,"0")}:${parts[2].padStart(2,"0")}`;
    return v;
  }

  private _minutesBetween(a: string, b: string) {
    const toMin = (s: string) => {
      const [H,M,S] = s.split(":").map((n) => Number(n));
      return (H||0)*60 + (M||0) + (S||0)/60;
    };
    return Math.max(1, toMin(b) - toMin(a));
  }

  private _syncDerivedPxPerMin() {
    const min = this._config.slot_min_time || DEFAULTS.slot_min_time;
    const max = this._config.slot_max_time || DEFAULTS.slot_max_time;
    const minutes = this._minutesBetween(min, max);
    const vh = (this._config.height_vh ?? DEFAULTS.height_vh);
    const viewportPx = Math.max(600, window.innerHeight || 900);
    const visiblePx = (vh / 100) * viewportPx;
    const pxPerMin = Math.max(0.2, Math.min(5, visiblePx / minutes));
    if (!Number.isFinite(pxPerMin)) return;
    this._updateConfig({ px_per_min: Math.round(pxPerMin * 100) / 100 });
  }

  private _safe<T>(v: T | undefined, d: T) {
    return v === undefined || v === null ? d : v;
  }

  private _validColorHex(c?: string) {
    if (!c) return null;
    const t = String(c).trim();
    if (/^#([0-9a-f]{6})$/i.test(t)) return t;
    if (/^#([0-9a-f]{3})$/i.test(t)) {
      const r = t[1], g = t[2], b = t[3];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return null;
  }

  render() {
    const ents = this._config.entities || [];
    const minTime = (this._config.slot_min_time || DEFAULTS.slot_min_time).slice(0,5);
    const maxTime = (this._config.slot_max_time || DEFAULTS.slot_max_time).slice(0,5);
    const reachedMax = ents.length >= MAX_CALENDARS;
    const tf = this._safe(this._config.time_format, DEFAULTS.time_format);

    return html`
      <div class="wrap">
        ${this._calendarsSection(ents, reachedMax)}
        ${this._weatherSection()}
        ${this._gridSection(minTime, maxTime)}
        ${this._timeFormatSection(tf)}
        ${this._highlightsSection()}
        ${this._behaviorSection()}
      </div>
    `;
  }

  private _calendarsSection(ents: EntityCfg[], reachedMax: boolean) {
    return html`
      <div class="section">
        <div class="section-title">Calendars</div>

        ${ents.map((row, i) => this._calendarBlock(row, i))}

        <div class="add-row">
          <button class="add-btn" ?disabled=${reachedMax} @click=${this._addEntity}>＋ Add calendar</button>
          ${reachedMax ? html`<span class="hint">Max ${MAX_CALENDARS} calendars</span>` : nothing}
        </div>
      </div>
    `;
  }

  private _calendarBlock(row: EntityCfg, i: number) {
    const colorVal = this._validColorHex(row.color) || "#3f51b5";
    return html`
      <div class="cal-block">
        <div class="cal-head">Calendar ${i + 1}</div>
        <div class="cal-grid">
          <div class="c1">
            <ha-entity-picker
              .hass=${this.hass}
              .value=${row.entity}
              .includeDomains=${["calendar"]}
              allow-custom-entity
              @value-changed=${(ev: any) => this._updateEntity(i, { entity: ev.detail.value || "" })}
            ></ha-entity-picker>
          </div>

          <div class="c2">
            <input
              class="name"
              type="text"
              placeholder="Display name (optional)"
              .value=${row.name || ""}
              @input=${(ev: any) => this._updateEntity(i, { name: ev.target.value })}
            />
            <button class="color-btn" style=${`--clr:${colorVal}`} @click=${(ev: any) => {
              const inp: HTMLInputElement | null = ev.currentTarget?.parentElement?.querySelector('input[type="color"]');
              if (inp) inp.click();
            }}>Color</button>
            <input type="color" class="color" .value=${colorVal} @input=${(ev: any) => this._updateEntity(i, { color: ev.target.value })} />
          </div>

          <div class="cDel">
            <button class="del-btn" title="Remove" @click=${() => this._removeEntity(i)}>-</button>
          </div>
        </div>
      </div>
    `;
  }

  private _weatherSection() {
    return html`
      <div class="section">
        <div class="section-title">Weather (optional)</div>
        <div class="row">
          <label>Weather entity</label>
          <ha-entity-picker
            .hass=${this.hass}
            .value=${this._config.weather_entity || ""}
            .includeDomains=${["weather"]}
            allow-custom-entity
            @value-changed=${(ev: any) => this._updateConfig({ weather_entity: ev.detail.value || "" })}
          ></ha-entity-picker>
        </div>
        <div class="hint">Forecast days and compact options are hidden in UI for now (kept in config).</div>
      </div>
    `;
  }

  private _gridSection(minTime: string, maxTime: string) {
    return html`
      <div class="section">
        <div class="section-title">Default focus</div>

        <div class="row two">
          <label>Visible time window</label>
          <div class="twocol">
            <input type="time" step="60" .value=${minTime}
              @change=${(ev: any) => { this._updateConfig({ slot_min_time: this._timeToHHMMSS(ev.target.value) }); this._syncDerivedPxPerMin(); }} />
            <span>to</span>
            <input type="time" step="60" .value=${maxTime}
              @change=${(ev: any) => { this._updateConfig({ slot_max_time: this._timeToHHMMSS(ev.target.value) }); this._syncDerivedPxPerMin(); }} />
          </div>
        </div>

        <div class="row">
          <label>Height (vh)</label>
          <input type="number" min="40" max="100" .value=${this._safe(this._config.height_vh, DEFAULTS.height_vh)}
            @input=${(ev: any) => { this._updateConfig({ height_vh: Number(ev.target.value) || DEFAULTS.height_vh }); this._syncDerivedPxPerMin(); }} />
        </div>
      </div>
    `;
  }

  private _timeFormatSection(tf: "12" | "24") {
    return html`
      <div class="section">
        <div class="section-title">Time format</div>
        <div class="row">
          <label>Display format</label>
          <div class="tf-row">
            <label><input type="radio" name="tf" value="24" .checked=${tf === "24"} @change=${(e: any) => this._updateConfig({ time_format: "24" })} /> 24-hour</label>
            <label><input type="radio" name="tf" value="12" .checked=${tf === "12"} @change=${(e: any) => this._updateConfig({ time_format: "12" })} /> 12-hour</label>
          </div>
        </div>
      </div>
    `;
  }

  private _highlightsSection() {
    return html`
      <div class="section">
        <div class="section-title">Highlights</div>

        ${this._colorRow("Today highlight", "today_color", this._safe(this._config.today_color, DEFAULTS.today_color))}
        ${this._colorRow("Weekend highlight", "weekend_color", this._safe(this._config.weekend_color, DEFAULTS.weekend_color))}
        ${this._colorRow("Now line", "now_line_color", this._safe(this._config.now_line_color, DEFAULTS.now_line_color))}
        <div class="hint">Set a color, or choose “None” to disable. Hex colors recommended; rgba works in YAML.</div>
      </div>
    `;
  }

  private _colorRow(labelTxt: string, key: "today_color" | "weekend_color" | "now_line_color", val: string) {
    const none = (val || "") === "";
    const hex = this._validColorHex(val) || "#2196f3";
    return html`
      <div class="row">
        <label>${labelTxt}</label>
        <div class="color-row">
          <label class="none"><input type="checkbox" .checked=${none} @change=${(ev: any) => {
            this._updateConfig({ [key]: ev.target.checked ? "" : hex } as any);
          }} /> None</label>
          <button class="color-btn big" style=${`--clr:${hex}`} ?disabled=${none} @click=${(ev: any) => {
            const inp: HTMLInputElement | null = (ev.currentTarget as HTMLElement).parentElement?.querySelector('input[type="color"]');
            if (inp) inp.click();
          }}>Pick color</button>
          <input type="color" class="color" .value=${hex} ?disabled=${none} @input=${(ev: any) => this._updateConfig({ [key]: ev.target.value } as any)} />
        </div>
      </div>
    `;
  }

  private _behaviorSection() {
    return html`
      <div class="section">
        <div class="section-title">Behavior</div>
        <div class="row">
          <label>Refresh interval (min)</label>
          <input type="number" min="1" max="60" .value=${this._safe(this._config.data_refresh_minutes, DEFAULTS.data_refresh_minutes)}
            @input=${(ev: any) => this._updateConfig({ data_refresh_minutes: Number(ev.target.value) || DEFAULTS.data_refresh_minutes })} />
        </div>

        <div class="row">
          <label><input type="checkbox"
            .checked=${this._safe(this._config.remember_offset, true)}
            @change=${(ev: any) => this._updateConfig({ remember_offset: ev.target.checked })} />
            Remember scroll position</label>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host { display: block; }
    .wrap { display: grid; gap: 16px; padding: 8px; max-width: var(--mcg-editor-max-width, 820px); }

    .section { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 12px; padding: 12px; background: var(--card-background-color, #fff); overflow: visible; }
    .section-title { font-weight: 700; margin-bottom: 10px; }

    .row { display: grid; grid-template-columns: 220px 1fr; align-items: center; gap: 12px; margin: 8px 0; }
    .row.two { grid-template-columns: 220px auto; }

    .add-row { display:flex; align-items:center; gap:10px; margin-top: 10px; }
    .add-btn { all: unset; cursor: pointer; padding: 10px 12px; border-radius: 10px; background: rgba(0,0,0,.06); }
    .add-btn[disabled] { opacity:.5; cursor: not-allowed; }

    .cal-block { border: 1px dashed var(--divider-color, #ddd); border-radius: 10px; padding: 10px; margin: 10px 0; }
    .cal-head { font-weight: 700; margin-bottom: 8px; }

    /* 2-row grid with delete button spanning rows */
    .cal-grid { display: grid; grid-template-columns: 1fr 52px; grid-template-rows: 48px 48px; gap: 10px; align-items: center; }
    .cal-grid .c1 { grid-column: 1 / 2; grid-row: 1 / 2; }
    .cal-grid .c2 { grid-column: 1 / 2; grid-row: 2 / 3; display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }
    .cal-grid .cDel { grid-column: 2 / 3; grid-row: 1 / 3; align-self: center; display:flex; align-items:center; justify-content:center; }

    .del-btn { all: unset; width: 44px; height: 44px; border-radius: 12px; background: rgba(229,57,53,.12); cursor: pointer; display:flex; align-items:center; justify-content:center; font-size: 24px; }
    .del-btn:hover { filter: brightness(0.96); }

    input[type="text"], input[type="number"], input[type="time"] { height: 40px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--divider-color, #e0e0e0); background: var(--secondary-background-color, rgba(0,0,0,.02)); color: var(--primary-text-color, #111); }

    .color-btn { all: unset; cursor: pointer; height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--divider-color, #e0e0e0); background: var(--secondary-background-color, rgba(0,0,0,.02)); }
    .color-btn.big { width: 140px; }
    .color-btn::before { content: ""; display:inline-block; width: 16px; height: 16px; border-radius: 4px; background: var(--clr, #2196f3); margin-right: 8px; vertical-align: middle; }
    input[type="color"].color { visibility: hidden; width: 0; height: 0; padding: 0; margin: 0; border: 0; }

    .tf-row { display:flex; gap:16px; align-items:center; }
    .color-row { display:flex; align-items:center; gap: 12px; }
    .color-row .none { display:flex; align-items:center; gap: 8px; }

    ha-entity-picker { width: 100%; --mdc-menu-max-height: 300px; }
    .hint { color: var(--secondary-text-color); font-size: 12px; margin-top: 4px; }
    label { color: var(--primary-text-color); font-weight: 500; }
  `;
}

customElements.define("multi-calendar-grid-card-editor", MultiCalendarGridCardEditor as any);
