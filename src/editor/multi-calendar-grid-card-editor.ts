/* Multi-Calendar Grid Card – Visual Editor
 * Simplified UI, filtered pickers, derived px/min, checkboxes
 * Version: 0.8.0-dev.7
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

  // Shown
  slot_min_time?: string;
  slot_max_time?: string;
  height_vh?: number;
  show_now_indicator?: boolean;
  remember_offset?: boolean;
  data_refresh_minutes?: number;
  locale?: string;
  highlight_today?: boolean;
  highlight_weekends?: boolean;
};

const DEFAULTS = {
  slot_min_time: "07:00:00",
  slot_max_time: "22:00:00",
  slot_minutes: 30,
  px_per_min: 1.6,
  height_vh: 80,
  show_now_indicator: true,
  remember_offset: true,
  data_refresh_minutes: 5,
  highlight_today: true,
  highlight_weekends: true,
} as const;

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
    // Ensure derived px/min on load
    this._syncDerivedPxPerMin();
  }

  private _updateConfig(patch: Partial<CardConfig>) {
    const next: CardConfig = {
      ...this._config,
      ...patch,
    };
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

  render() {
    const ents = this._config.entities || [];
    const minTime = (this._config.slot_min_time || DEFAULTS.slot_min_time).slice(0,5);
    const maxTime = (this._config.slot_max_time || DEFAULTS.slot_max_time).slice(0,5);

    return html`
      <div class="wrap">
        ${this._entitiesSection(ents)}
        ${this._weatherSection()}
        ${this._gridSection(minTime, maxTime)}
        ${this._behaviorSection()}
      </div>
    `;
  }

  private _entitiesSection(ents: EntityCfg[]) {
    return html`
      <div class="section">
        <div class="section-title">Calendars</div>
        ${ents.length === 0 ? html`<div class="hint">Add one or more <code>calendar.*</code> entities.</div>` : nothing}
        ${ents.map((row, i) => this._entityRow(row, i))}
        <div class="row">
          <div></div>
          <button class="btn" @click=${this._addEntity}>Add calendar</button>
        </div>
      </div>
    `;
  }

  private _entityRow(row: EntityCfg, i: number) {
    return html`
      <div class="row">
        <label>Calendar ${i + 1}</label>
        <div class="stack">
          <ha-entity-picker
            .hass=${this.hass}
            .value=${row.entity}
            .includeDomains=${["calendar"]}
            @value-changed=${(ev: any) => this._updateEntity(i, { entity: ev.detail.value || "" })}
          ></ha-entity-picker>

          <div class="rowgrid">
            <input
              class="name"
              type="text"
              placeholder="Display name (optional)"
              .value=${row.name || ""}
              @input=${(ev: any) => this._updateEntity(i, { name: ev.target.value })}
            />

            <div class="colorwrap">
              <input
                class="color"
                title="Color"
                type="color"
                .value=${this._validColor(row.color) || "#3f51b5"}
                @input=${(ev: any) => this._updateEntity(i, { color: ev.target.value })}
              />
            </div>
          </div>

          <div class="row right">
            <div></div>
            <button class="btn danger" @click=${() => this._removeEntity(i)}>Remove</button>
          </div>
        </div>
      </div>
    `;
  }

  private _validColor(c?: string) {
    if (!c) return null;
    const t = String(c).trim();
    if (/^#([0-9a-f]{6})$/i.test(t)) return t;
    if (/^#([0-9a-f]{3})$/i.test(t)) {
      const r = t[1], g = t[2], b = t[3];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return null;
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

  private _behaviorSection() {
    return html`
      <div class="section">
        <div class="section-title">Behavior</div>

        <div class="row">
          <label><input type="checkbox"
            .checked=${this._safe(this._config.show_now_indicator, DEFAULTS.show_now_indicator)}
            @change=${(ev: any) => this._updateConfig({ show_now_indicator: ev.target.checked })} />
            Show now indicator</label>
        </div>

        <div class="row">
          <label><input type="checkbox"
            .checked=${this._safe(this._config.remember_offset, DEFAULTS.remember_offset)}
            @change=${(ev: any) => this._updateConfig({ remember_offset: ev.target.checked })} />
            Remember scroll position</label>
        </div>

        <div class="row">
          <label>Refresh interval (min)</label>
          <input type="number" min="1" max="60" .value=${this._safe(this._config.data_refresh_minutes, DEFAULTS.data_refresh_minutes)}
            @input=${(ev: any) => this._updateConfig({ data_refresh_minutes: Number(ev.target.value) || DEFAULTS.data_refresh_minutes })} />
        </div>

        <div class="row">
          <label><input type="checkbox"
            .checked=${this._safe(this._config.highlight_today, DEFAULTS.highlight_today)}
            @change=${(ev: any) => this._updateConfig({ highlight_today: ev.target.checked })} />
            Highlight today</label>
        </div>

        <div class="row">
          <label><input type="checkbox"
            .checked=${this._safe(this._config.highlight_weekends, DEFAULTS.highlight_weekends)}
            @change=${(ev: any) => this._updateConfig({ highlight_weekends: ev.target.checked })} />
            Highlight weekends</label>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host { display: block; }
    .wrap { display: grid; gap: 16px; padding: 6px; }

    .section { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 12px; padding: 12px; background: var(--card-background-color, #fff); overflow: visible; }
    .section-title { font-weight: 700; margin-bottom: 10px; }

    .row { display: grid; grid-template-columns: 220px 1fr; align-items: center; gap: 12px; margin: 8px 0; }
    .row.two { grid-template-columns: 220px auto; }
    .right { grid-template-columns: 1fr auto; }

    .stack { display: grid; gap: 8px; }
    .rowgrid { display: grid; grid-template-columns: minmax(180px,1fr) auto; gap: 8px; align-items: center; }
    .twocol { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; }

    label { color: var(--primary-text-color); font-weight: 500; }
    .hint { color: var(--secondary-text-color); font-size: 12px; margin-top: 4px; }

    .btn { all: unset; cursor: pointer; padding: 8px 12px; border-radius: 10px; background: rgba(0,0,0,.06); text-align: center; }
    .btn:hover { filter: brightness(0.95); }
    .btn.danger { background: rgba(229, 57, 53, .12); }

    input[type="text"], input[type="number"], input[type="time"] { height: 40px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--divider-color, #e0e0e0); background: var(--secondary-background-color, rgba(0,0,0,.02)); color: var(--primary-text-color, #111); }
    .colorwrap{ display:flex; align-items:center; }
    input[type="color"] { width: 40px; height: 40px; padding: 0; border: none; background: transparent; }

    ha-entity-picker { width: 100%; --mdc-menu-max-height: 300px; }
    code { background: rgba(0,0,0,.06); padding: 2px 6px; border-radius: 6px; }
  `;
}

customElements.define("multi-calendar-grid-card-editor", MultiCalendarGridCardEditor as any);
