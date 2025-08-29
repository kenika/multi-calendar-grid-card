/* Minimal editor for Multi-Calendar Grid Card
 * v0.8.0-dev.15 — provides setConfig() so Visual Editor doesn't error,
 * and a few basic fields. More advanced UI can be added later.
 */
import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";

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
};

export class MultiCalendarGridCardEditor extends LitElement {
  @property({ attribute: false }) public hass: any;
  @state() private _config!: CardConfig;

  static styles = css`
    .row{ display:grid; grid-template-columns: 180px 1fr; gap:12px; align-items:center; margin:8px 0 }
    .two{ display:grid; grid-template-columns: 1fr 1fr; gap:12px }
    ha-textfield, ha-select { width: 100% }
    .hint{ color: var(--secondary-text-color); font-size: 12px }
  `;

  setConfig(config: CardConfig): void {
    this._config = { ...config };
  }

  private _emitConfig() {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }

  private _onTimeChange(key: "slot_min_time" | "slot_max_time", e: Event) {
    const v = (e.target as HTMLInputElement)?.value || "";
    // Ensure HH:MM:SS
    const value = v.length === 5 ? `${v}:00` : v;
    this._config = { ...this._config, [key]: value };
    this._emitConfig();
  }

  private _onNumber(key: keyof CardConfig, e: Event) {
    const v = Number((e.target as HTMLInputElement)?.value || "0");
    this._config = { ...this._config, [key]: v };
    this._emitConfig();
  }

  private _onSelect(key: keyof CardConfig, e: Event) {
    const v = (e.target as HTMLSelectElement)?.value as any;
    this._config = { ...this._config, [key]: v };
    this._emitConfig();
  }

  private _onColor(key: keyof CardConfig, e: Event) {
    const v = (e.target as HTMLInputElement)?.value || "";
    this._config = { ...this._config, [key]: v };
    this._emitConfig();
  }

  private _onBool(key: keyof CardConfig, e: Event) {
    const v = (e.target as HTMLInputElement)?.checked || false;
    this._config = { ...this._config, [key]: v as any };
    this._emitConfig();
  }

  render() {
    if (!this._config) return nothing;
    const cfg = this._config;
    return html`
      <div class="row">
        <div>Entities</div>
        <div class="hint">Manage calendars in YAML for now.</div>
      </div>

      <div class="row">
        <div>Time format</div>
        <select @change=${(e: Event) => this._onSelect("time_format", e)}>
          <option value="24" ?selected=${cfg.time_format !== "12"}>24-hour</option>
          <option value="12" ?selected=${cfg.time_format === "12"}>12-hour</option>
        </select>
      </div>

      <div class="row">
        <div>Visible days</div>
        <input type="number" min="1" max="14" .value=${String(cfg.visible_days ?? 7)} @change=${(e: Event) => this._onNumber("visible_days", e)} />
      </div>

      <div class="row">
        <div>Focus window</div>
        <div class="two">
          <input type="time" step="60" .value=${(cfg.slot_min_time || "07:00:00").slice(0,5)} @change=${(e: Event) => this._onTimeChange("slot_min_time", e)} />
          <input type="time" step="60" .value=${(cfg.slot_max_time || "22:00:00").slice(0,5)} @change=${(e: Event) => this._onTimeChange("slot_max_time", e)} />
        </div>
      </div>

      <div class="row">
        <div>Legend button width (ch)</div>
        <input type="number" min="8" max="32" .value=${String(cfg.legend_button_ch ?? 15)} @change=${(e: Event) => this._onNumber("legend_button_ch", e)} />
      </div>

      <div class="row">
        <div>Remember scroll/offset</div>
        <input type="checkbox" .checked=${cfg.remember_offset !== false} @change=${(e: Event) => this._onBool("remember_offset", e)} />
      </div>

      <div class="row">
        <div>Dialog width (px)</div>
        <input type="number" min="0" max="1200" .value=${String(cfg.dialog_width_px ?? 0)} @change=${(e: Event) => this._onNumber("dialog_width_px", e)} />
      </div>

      <div class="row">
        <div>Highlight colors</div>
        <div class="two">
          <input type="color" .value=${cfg.today_color || "#c8e3f9"} @change=${(e: Event) => this._onColor("today_color", e)} />
          <input type="color" .value=${cfg.weekend_color || "#f0f0f0"} @change=${(e: Event) => this._onColor("weekend_color", e)} />
        </div>
      </div>

      <div class="row">
        <div>Now line color</div>
        <input type="color" .value=${cfg.now_line_color || "#e53935"} @change=${(e: Event) => this._onColor("now_line_color", e)} />
      </div>
    `;
  }
}

customElements.define("multi-calendar-grid-card-editor", MultiCalendarGridCardEditor);
