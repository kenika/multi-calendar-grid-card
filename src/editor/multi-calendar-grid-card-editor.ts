/* Multi-Calendar Grid Card — Editor (rich, no decorators)
 * v0.8.0-dev.17 — adds Card height (vh), tidies layout, icon remove, keeps prior fields
 */
import { LitElement, css, html, nothing } from "lit";

type EntityCfg = { entity: string; name?: string; color?: string };
type CardConfig = {
  type?: string;
  entities: EntityCfg[];
  slot_min_time?: string;
  slot_max_time?: string;
  visible_days?: number;
  time_format?: "12" | "24";
  weather_entity?: string;
  legend_button_ch?: number;
  remember_offset?: boolean;
  today_color?: string;
  weekend_color?: string;
  now_line_color?: string;
  dialog_width_px?: number;
  height_vh?: number;
};

const MAX_CALENDARS = 10;
const DEFAULT_COLOR_PALETTE = ["#3f51b5","#9c27b0","#03a9f4","#009688","#ff9800","#e91e63","#8bc34a","#607d8b","#795548","#2196f3"];

export class MultiCalendarGridCardEditor extends LitElement {
  hass: any;
  private _config!: CardConfig;

  static properties = {
    hass: { attribute: false },
    _config: { attribute: false, state: true },
  };

  static styles = css`
    :host { display:block; }
    .wrap { max-width: 860px; padding: 8px 4px 16px; box-sizing: border-box; }
    .section { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 12px; padding: 12px; margin: 10px 0; background: var(--card-background-color); }
    .section h3 { margin: 0 0 8px; font-size: 16px; font-weight: 700; }
    .row { display: grid; grid-template-columns: 220px 1fr; gap: 14px; align-items: center; margin: 8px 0; }
    .row > label { color: var(--secondary-text-color); }
    .two { display:grid; grid-template-columns: 1fr 1fr; gap:12px }
    input[type="time"], input[type="number"], input[type="text"], input[type="color"], select { width: 100% }
    .hint { color: var(--secondary-text-color); font-size: 12px }
    .cal-list { display: flex; flex-direction: column; gap: 10px; }
    .cal-item { border: 1px solid var(--divider-color,#e0e0e0); border-radius: 10px; padding: 10px; position: relative; }
    .cal-head { font-weight: 700; margin-bottom: 8px; display:flex; justify-content: space-between; align-items: center; }
    .cal-grid { display:grid; grid-template-columns: 1fr 140px; gap: 10px; align-items: center; }
    .cal-subgrid { display:grid; grid-template-columns: 1fr 140px; gap: 10px; align-items: center; }
    .icon-btn { all: unset; cursor: pointer; border-radius: 8px; padding: 6px; background: rgba(0,0,0,.06); display:inline-flex; align-items:center; justify-content:center }
    .add { all: unset; cursor: pointer; border-radius: 999px; padding: 8px 12px; background: rgba(0,0,0,.08); display:inline-flex; align-items:center; gap:8px; }
    .cols-2 { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  `;

  setConfig(config: CardConfig): void {
    this._config = { ...config };
    if (!Array.isArray(this._config.entities)) this._config.entities = [];
    this.requestUpdate();
  }

  private _emitConfig() {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }

  private _onTimeChange(key: "slot_min_time" | "slot_max_time", e: Event) {
    const inp = e.target as HTMLInputElement | null;
    const v = inp?.value || "";
    const value = v.length === 5 ? `${v}:00` : v; // normalize to HH:MM:SS
    this._config = { ...this._config, [key]: value };
    this._emitConfig();
  }

  private _onNumber(key: keyof CardConfig, e: Event) {
    const inp = e.target as HTMLInputElement | null;
    const v = Number(inp?.value || "0");
    this._config = { ...this._config, [key]: v };
    this._emitConfig();
  }

  private _onSelect(key: keyof CardConfig, e: Event) {
    const sel = e.target as HTMLSelectElement | null;
    const v = (sel?.value as any);
    this._config = { ...this._config, [key]: v };
    this._emitConfig();
  }

  private _onColor(key: keyof CardConfig, e: Event) {
    const inp = e.target as HTMLInputElement | null;
    const v = inp?.value || "";
    this._config = { ...this._config, [key]: v };
    this._emitConfig();
  }

  private _onBool(key: keyof CardConfig, e: Event) {
    const inp = e.target as HTMLInputElement | null;
    const v = !!inp?.checked;
    this._config = { ...this._config, [key]: v as any };
    this._emitConfig();
  }

  private _onCalendarEntity(i: number, ev: Event) {
    const detailVal = (ev as any).detail?.value;
    const value = detailVal != null ? detailVal : (ev.target as any)?.value;
    const list = [...this._config.entities];
    const prev = list[i] || { entity: "" };
    const next = { ...prev, entity: value || "" };
    if (!next.name) {
      const st = (this as any).hass?.states?.[value];
      if (st?.attributes?.friendly_name) next.name = st.attributes.friendly_name;
    }
    list[i] = next;
    this._config = { ...this._config, entities: list };
    this._emitConfig();
  }

  private _onCalendarName(i: number, e: Event) {
    const v = (e.target as HTMLInputElement | null)?.value || "";
    const list = [...this._config.entities];
    const prev = list[i] || { entity: "" };
    list[i] = { ...prev, name: v };
    this._config = { ...this._config, entities: list };
    this._emitConfig();
  }

  private _onCalendarColor(i: number, e: Event) {
    const v = (e.target as HTMLInputElement | null)?.value || "";
    const list = [...this._config.entities];
    const prev = list[i] || { entity: "" };
    list[i] = { ...prev, color: v };
    this._config = { ...this._config, entities: list };
    this._emitConfig();
  }

  private _removeCalendar(i: number) {
    const list = [...this._config.entities];
    list.splice(i, 1);
    this._config = { ...this._config, entities: list };
    this._emitConfig();
  }

  private _addCalendar() {
    const list = [...(this._config.entities || [])];
    if (list.length >= MAX_CALENDARS) return;
    const color = DEFAULT_COLOR_PALETTE[list.length % DEFAULT_COLOR_PALETTE.length];
    list.push({ entity: "", name: "", color });
    this._config = { ...this._config, entities: list };
    this._emitConfig();
  }

  private _onWeatherEntity(ev: Event) {
    const detailVal = (ev as any).detail?.value;
    const value = detailVal != null ? detailVal : (ev.target as any)?.value;
    this._config = { ...this._config, weather_entity: value || "" };
    this._emitConfig();
  }

  private _calendarItem(i: number, cfg: EntityCfg) {
    const name = cfg.name || cfg.entity || `Calendar ${i+1}`;
    return html`
      <div class="cal-item">
        <div class="cal-head">
          <div>${name}</div>
          <button class="icon-btn" @click=${() => this._removeCalendar(i)} aria-label="Remove calendar">
            <ha-icon icon="mdi:trash-can-outline"></ha-icon>
          </button>
        </div>
        <div class="cal-grid">
          <div>
            <ha-entity-picker
              .hass=${(this as any).hass}
              .value=${cfg.entity || ""}
              .includeDomains=${["calendar"]}
              allow-custom-entity
              @value-changed=${(e: Event) => this._onCalendarEntity(i, e)}
            ></ha-entity-picker>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="hint">Color</span>
            <input type="color" .value=${cfg.color || DEFAULT_COLOR_PALETTE[i % DEFAULT_COLOR_PALETTE.length]} @input=${(e: Event) => this._onCalendarColor(i, e)} />
          </div>
        </div>
        <div class="cal-subgrid" style="margin-top:8px">
          <input type="text" placeholder="Display name" .value=${cfg.name || ""} @input=${(e: Event) => this._onCalendarName(i, e)} />
          <div></div>
        </div>
      </div>
    `;
  }

  render() {
    if (!this._config) return nothing;
    const cfg = this._config;
    const ents = Array.isArray(cfg.entities) ? cfg.entities : [];

    return html`
      <div class="wrap">
        <div class="section">
          <h3>Calendars</h3>
          <div class="cal-list">
            ${ents.map((c, i) => this._calendarItem(i, c))}
          </div>
          <div style="margin-top:10px">
            <button class="add" ?disabled=${ents.length >= MAX_CALENDARS} @click=${() => this._addCalendar()}>
              <ha-icon icon="mdi:plus"></ha-icon> Add calendar
            </button>
            <span class="hint" style="margin-left:8px">Up to ${MAX_CALENDARS} calendars.</span>
          </div>
        </div>

        <div class="section">
          <h3>Weather</h3>
          <div class="row">
            <label>Weather entity</label>
            <ha-entity-picker
              .hass=${(this as any).hass}
              .value=${cfg.weather_entity || ""}
              .includeDomains=${["weather"]}
              allow-custom-entity
              @value-changed=${(e: Event) => this._onWeatherEntity(e)}
            ></ha-entity-picker>
          </div>
        </div>

        <div class="section">
          <h3>Time & Range</h3>
          <div class="row">
            <label>Time format</label>
            <select @change=${(e: Event) => this._onSelect("time_format", e)}>
              <option value="24" ?selected=${cfg.time_format !== "12"}>24-hour</option>
              <option value="12" ?selected=${cfg.time_format === "12"}>12-hour</option>
            </select>
          </div>
          <div class="row">
            <label>Visible days</label>
            <input type="number" min="1" max="14" .value=${String(cfg.visible_days ?? 7)} @change=${(e: Event) => this._onNumber("visible_days", e)} />
          </div>
          <div class="row">
            <label>Focus window</label>
            <div class="two">
              <input type="time" step="60" .value=${(cfg.slot_min_time || "07:00:00").slice(0,5)} @change=${(e: Event) => this._onTimeChange("slot_min_time", e)} />
              <input type="time" step="60" .value=${(cfg.slot_max_time || "22:00:00").slice(0,5)} @change=${(e: Event) => this._onTimeChange("slot_max_time", e)} />
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Layout</h3>
          <div class="row">
            <label>Card height (vh)</label>
            <input type="number" min="40" max="100" .value=${String(cfg.height_vh ?? 60)} @change=${(e: Event) => this._onNumber("height_vh", e)} />
          </div>
          <div class="row">
            <label>Legend button width (ch)</label>
            <input type="number" min="8" max="32" .value=${String(cfg.legend_button_ch ?? 15)} @change=${(e: Event) => this._onNumber("legend_button_ch", e)} />
          </div>
          <div class="row">
            <label>Remember scroll/offset</label>
            <input type="checkbox" .checked=${cfg.remember_offset !== false} @change=${(e: Event) => this._onBool("remember_offset", e)} />
          </div>
          <div class="row">
            <label>Dialog width (px)</label>
            <input type="number" min="0" max="1200" .value=${String(cfg.dialog_width_px ?? 0)} @change=${(e: Event) => this._onNumber("dialog_width_px", e)} />
          </div>
        </div>

        <div class="section">
          <h3>Highlights</h3>
          <div class="cols-2">
            <div class="row">
              <label>Today background</label>
              <input type="color" .value=${cfg.today_color || "#c8e3f9"} @input=${(e: Event) => this._onColor("today_color", e)} />
            </div>
            <div class="row">
              <label>Weekend background</label>
              <input type="color" .value=${cfg.weekend_color || "#f0f0f0"} @input=${(e: Event) => this._onColor("weekend_color", e)} />
            </div>
            <div class="row">
              <label>Now line color</label>
              <input type="color" .value=${cfg.now_line_color || "#e53935"} @input=${(e: Event) => this._onColor("now_line_color", e)} />
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

if (!customElements.get("multi-calendar-grid-card-editor")) {
  customElements.define("multi-calendar-grid-card-editor", MultiCalendarGridCardEditor);
}
