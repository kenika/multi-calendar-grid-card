import { css, html, LitElement, nothing } from 'lit';

type HomeAssistant = any;
type CalendarEntityConfig = {
  entity: string;
  name?: string;
  color?: string;
};

type CardConfig = {
  type?: string;
  entities?: CalendarEntityConfig[];
  // Time-grid & layout
  first_day?: number;
  start_today?: boolean;
  slot_min_time?: string;
  slot_max_time?: string;
  slot_minutes?: number;
  px_per_min?: number;
  height_vh?: number;
  header_compact?: boolean;
  show_now_indicator?: boolean;
  show_all_day?: boolean;
  remember_offset?: boolean;
  data_refresh_minutes?: number;
  // Weather
  weather_entity?: string;
  weather_days?: number;
  weather_compact?: boolean;
};

export class MultiCalendarGridCardEditor extends LitElement {
  // Reactive properties (no decorators build)
  static properties = {
    hass: { attribute: false },
    _config: { attribute: false, state: true },
    _isAdvancedOpen: { attribute: false, state: true },
  };

  public hass!: HomeAssistant;
  private _config: CardConfig = {};
  private _isAdvancedOpen = false;

  public setConfig(config: CardConfig): void {
    this._config = {
      ...config,
      entities: (config.entities ?? []).map((e) => ({ ...e })),
    };
  }

  protected render() {
    if (!this.hass || !this._config) return nothing;
    return html`
      <div class="editor-root">
        ${this._renderEntities()}
        ${this._renderLayout()}
        ${this._renderWeather()}
      </div>
    `;
  }

  private _renderEntities() {
    const rows = this._config.entities ?? [];
    return html`
      <ha-expansion-panel .expanded=${true}>
        <div slot="header">
          <div class="hdr">
            <ha-svg-icon .path=${mdiCalendarMultiple}></ha-svg-icon>
            <span>Calendars</span>
          </div>
        </div>
        <div class="entities">
          ${rows.length === 0
            ? html`<div class="hint">No calendars yet. Click “Add calendar”.</div>`
            : rows.map((row, idx) => this._renderEntityRow(row, idx))}
          <mwc-button @click=${this._addEntity} class="add-btn" dense>
            <ha-svg-icon .path=${mdiPlus} class="btn-icon"></ha-svg-icon>
            Add calendar
          </mwc-button>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderEntityRow(row: CalendarEntityConfig, idx: number) {
    return html`
      <div class="entity-row">
        <ha-entity-picker
          .hass=${this.hass}
          .value=${row.entity ?? ''}
          allow-custom-entity
          .domainFilter=${['calendar']}
          @value-changed=${(e: CustomEvent) => this._updateEntity(idx, 'entity', (e as any).detail.value)}
          label="Calendar entity"
        ></ha-entity-picker>

        <ha-textfield
          .value=${row.name ?? ''}
          label="Display name (optional)"
          @change=${(e: Event) => this._updateEntity(idx, 'name', (e.target as HTMLInputElement).value)}
        ></ha-textfield>

        <div class="color-wrap">
          <ha-textfield
            .value=${row.color ?? ''}
            label="Color (hex or CSS)"
            pattern="^#?[0-9a-fA-F]{3,8}$|^$|^[a-zA-Z]+$|^rgb.*|^hsl.*"
            validationMessage="Enter hex (#3f51b5) or a valid CSS color."
            @change=${(e: Event) => this._updateEntity(idx, 'color', (e.target as HTMLInputElement).value)}
          ></ha-textfield>
        </div>

        <mwc-icon-button
          class="row-remove"
          title="Remove"
          @click=${() => this._removeEntity(idx)}
        >
          <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
        </mwc-icon-button>

        <div class="row-order">
          <mwc-icon-button
            title="Move up"
            ?disabled=${idx === 0}
            @click=${() => this._moveEntity(idx, -1)}
          >
            <ha-svg-icon .path=${mdiArrowUp}></ha-svg-icon>
          </mwc-icon-button>
          <mwc-icon-button
            title="Move down"
            ?disabled=${idx >= (this._config.entities?.length ?? 1) - 1}
            @click=${() => this._moveEntity(idx, +1)}
          >
            <ha-svg-icon .path=${mdiArrowDown}></ha-svg-icon>
          </mwc-icon-button>
        </div>
      </div>
    `;
  }

  private _renderLayout() {
    const c = this._config;
    return html`
      <ha-expansion-panel .expanded=${true}>
        <div slot="header">
          <div class="hdr">
            <ha-svg-icon .path=${mdiViewWeek}></ha-svg-icon>
            <span>Time grid & layout</span>
          </div>
        </div>

        <div class="grid grid-2">
          ${this._boolField('start_today', c.start_today ?? true, 'Start at today (rolling 7 days)')}
          ${this._selectField(
            'first_day',
            c.first_day ?? 1,
            'First day of week (when “start at today” is off)',
            [
              {value: 0, label: 'Sunday'},
              {value: 1, label: 'Monday'},
              {value: 2, label: 'Tuesday'},
              {value: 3, label: 'Wednesday'},
              {value: 4, label: 'Thursday'},
              {value: 5, label: 'Friday'},
              {value: 6, label: 'Saturday'},
            ],
            c.start_today === true
          )}

          ${this._timeField('slot_min_time', c.slot_min_time ?? '07:00:00', 'Day view start time')}
          ${this._timeField('slot_max_time', c.slot_max_time ?? '22:00:00', 'Day view end time')}

          ${this._numberField('slot_minutes', c.slot_minutes ?? 60, 'Slot minutes', {min: 5, max: 120, step: 5})}
          ${this._numberField('px_per_min', c.px_per_min ?? 0.8, 'Pixels per minute', {min: 0.3, max: 3, step: 0.1})}

          ${this._numberField('height_vh', c.height_vh ?? 80, 'Calendar height (vh)', {min: 40, max: 100, step: 1})}
          ${this._boolField('header_compact', c.header_compact ?? false, 'Compact day headers')}

          ${this._boolField('show_now_indicator', c.show_now_indicator ?? true, 'Show “now” indicator')}
          ${this._boolField('show_all_day', c.show_all_day ?? true, 'Show all-day lane')}

          ${this._boolField('remember_offset', c.remember_offset ?? true, 'Remember scroll position')}
          ${this._numberField('data_refresh_minutes', c.data_refresh_minutes ?? 5, 'Data refresh (minutes)', {min: 1, max: 60, step: 1})}
        </div>

        <div class="adv-toggle">
          <mwc-button @click=${this._toggleAdvanced}>
            ${this._isAdvancedOpen ? 'Hide advanced' : 'Show advanced'}
          </mwc-button>
        </div>

        ${this._isAdvancedOpen
          ? html`
              <div class="adv">
                <div class="hint">
                  Advanced options are for fine-tuning visuals and refresh intervals.
                </div>
              </div>
            `
          : nothing}
      </ha-expansion-panel>
    `;
  }

  private _renderWeather() {
    const c = this._config;
    return html`
      <ha-expansion-panel .expanded=${true}>
        <div slot="header">
          <div class="hdr">
            <ha-svg-icon .path=${mdiWeatherPartlyCloudy}></ha-svg-icon>
            <span>Weather in day headers</span>
          </div>
        </div>

        <div class="grid grid-2">
          <ha-entity-picker
            .hass=${this.hass}
            .value=${c.weather_entity ?? ''}
            allow-custom-entity
            .domainFilter=${['weather']}
            @value-changed=${(e: CustomEvent) => this._updateRoot('weather_entity', (e as any).detail.value)}
            label="Weather entity (optional)"
          ></ha-entity-picker>

          ${this._numberField('weather_days', c.weather_days ?? 7, 'Forecast days', {min: 1, max: 10, step: 1})}
          ${this._boolField('weather_compact', c.weather_compact ?? false, 'Compact weather header')}
        </div>

        <div class="hint">
          The card uses a robust forecast strategy:
          service (<code>weather.get_forecasts</code>) → REST (<code>/api/weather/forecast</code>) → entity attributes → aggregate hourly→daily.
        </div>
      </ha-expansion-panel>
    `;
  }

  // ----- field helpers -----
  private _boolField(key: keyof CardConfig, value: boolean, label: string) {
    return html`
      <ha-formfield .label=${label}>
        <ha-switch
          .checked=${value}
          @change=${(e: Event) => this._updateRoot(key, (e.target as HTMLInputElement).checked)}
        ></ha-switch>
      </ha-formfield>
    `;
  }

  private _numberField(
    key: keyof CardConfig,
    value: number,
    label: string,
    opts: {min?: number; max?: number; step?: number} = {}
  ) {
    return html`
      <ha-textfield
        type="number"
        .value=${String(value)}
        .min=${(opts.min ?? '') as any}
        .max=${(opts.max ?? '') as any}
        .step=${(opts.step ?? '') as any}
        label=${label}
        @change=${(e: Event) => this._updateRoot(key, Number((e.target as HTMLInputElement).value))}
      ></ha-textfield>
    `;
  }

  private _timeField(key: keyof CardConfig, value: string, label: string) {
    // Accepts 'HH:mm' or 'HH:mm:ss'; we keep value as-is
    return html`
      <ha-textfield
        .value=${value}
        label=${label}
        placeholder="HH:MM or HH:MM:SS"
        pattern="^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$"
        validationMessage="Use HH:MM or HH:MM:SS (24h)."
        @change=${(e: Event) => this._updateRoot(key, (e.target as HTMLInputElement).value)}
      ></ha-textfield>
    `;
  }

  private _selectField(
    key: keyof CardConfig,
    value: number,
    label: string,
    items: Array<{value: number; label: string}>,
    disabled = false
  ) {
    return html`
      <ha-select
        .value=${String(value)}
        ?disabled=${disabled}
        naturalMenuWidth
        label=${label}
        @selected=${(e: CustomEvent) => {
          const idx = (e.target as any).index as number;
          if (idx >= 0 && idx < items.length) this._updateRoot(key, items[idx].value);
        }}
      >
        ${items.map(
          (opt) => html`<mwc-list-item .value=${String(opt.value)} ?selected=${opt.value === value}>
            ${opt.label}
          </mwc-list-item>`
        )}
      </ha-select>
    `;
  }

  // ----- entities handlers -----
  private _addEntity = () => {
    const entities = [...(this._config.entities ?? [])];
    entities.push({ entity: '' });
    this._updateRoot('entities', entities);
  };

  private _removeEntity(idx: number) {
    const entities = [...(this._config.entities ?? [])];
    entities.splice(idx, 1);
    this._updateRoot('entities', entities);
  }

  private _moveEntity(idx: number, dir: -1 | 1) {
    const entities = [...(this._config.entities ?? [])];
    const target = idx + dir;
    if (target < 0 || target >= entities.length) return;
    const [row] = entities.splice(idx, 1);
    entities.splice(target, 0, row);
    this._updateRoot('entities', entities);
  }

  private _updateEntity(idx: number, key: keyof CalendarEntityConfig, value: unknown) {
    const entities = [...(this._config.entities ?? [])];
    const row = { ...entities[idx], [key]: value as any };
    entities[idx] = row;
    this._updateRoot('entities', entities);
  }

  private _toggleAdvanced = () => {
    this._isAdvancedOpen = !this._isAdvancedOpen;
  };

  // ----- config change -----
  private _updateRoot(key: keyof CardConfig, value: any) {
    const newConfig: CardConfig = { ...this._config, [key]: value };
    if (key === 'slot_min_time' || key === 'slot_max_time') {
      const a = (key === 'slot_min_time' ? value : newConfig.slot_min_time) ?? '00:00:00';
      const b = (key === 'slot_max_time' ? value : newConfig.slot_max_time) ?? '23:59:59';
      if (!isBefore(a, b)) return;
    }
    this._config = newConfig;
    this._fireConfigChanged();
  }

  private _fireConfigChanged() {
    const event = new CustomEvent('config-changed', {
      detail: { config: this._pruneDefaults({ ...this._config }) },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  private _pruneDefaults(cfg: CardConfig): CardConfig {
    const copy: CardConfig = { ...cfg };
    if (copy.start_today === true) delete copy.start_today;
    if (copy.first_day === 1) delete copy.first_day;
    if (copy.slot_min_time === '07:00:00') delete copy.slot_min_time;
    if (copy.slot_max_time === '22:00:00') delete copy.slot_max_time;
    if (copy.slot_minutes === 60) delete copy.slot_minutes;
    if (copy.px_per_min === 0.8) delete copy.px_per_min;
    if (copy.height_vh === 80) delete copy.height_vh;
    if (copy.header_compact === false) delete copy.header_compact;
    if (copy.show_now_indicator === true) delete copy.show_now_indicator;
    if (copy.show_all_day === true) delete copy.show_all_day;
    if (copy.remember_offset === true) delete copy.remember_offset;
    if (copy.data_refresh_minutes === 5) delete copy.data_refresh_minutes;
    if (copy.weather_days === 7) delete copy.weather_days;
    if (copy.weather_compact === false) delete copy.weather_compact;

    if (Array.isArray(copy.entities)) {
      copy.entities = copy.entities
        .map((e) => {
          const r: CalendarEntityConfig = { entity: e.entity ?? '' };
          if (e.name) r.name = e.name;
          if (e.color) r.color = e.color;
          return r;
        })
        .filter((e) => e.entity);
      if (copy.entities.length === 0) delete copy.entities;
    }
    if (!copy.weather_entity) delete copy.weather_entity;
    return copy;
  }

  static styles = css`
    .editor-root {
      display: grid;
      gap: 16px;
    }
    .hdr {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      font-weight: 600;
    }
    .entities {
      display: grid;
      gap: 12px;
    }
    .entity-row {
      display: grid;
      grid-template-columns: 1fr 1fr minmax(140px, 220px) auto auto;
      align-items: end;
      gap: 12px;
      padding: 8px;
      border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
      border-radius: 8px;
    }
    .row-remove {
      margin-inline-start: 4px;
      color: var(--error-color);
    }
    .row-order {
      display: inline-flex;
      gap: 4px;
    }
    .grid {
      display: grid;
      gap: 12px;
    }
    .grid-2 {
      grid-template-columns: repeat(2, minmax(160px, 1fr));
    }
    .adv-toggle {
      display: flex;
      justify-content: flex-end;
      margin-top: 4px;
    }
    .hint {
      opacity: 0.8;
      font-size: 0.9em;
    }
    .add-btn .btn-icon {
      margin-inline-end: 6px;
    }
  `;
}

// ---- icons & utils ----
const mdiCalendarMultiple =
  'M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z';
const mdiViewWeek =
  'M3,5H21V19H3V5M8,7H5V17H8V7M13,7H10V17H13V7M19,7H16V17H19V7Z';
const mdiWeatherPartlyCloudy =
  'M12,6A6,6 0 0,1 18,12H19A4,4 0 0,1 23,16A4,4 0 0,1 19,20H7A6,6 0 1,1 12,6Z';
const mdiDelete =
  'M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M19,4H15.5L14.79,3.29C14.61,3.11 14.35,3 14.09,3H9.91C9.65,3 9.39,3.11 9.21,3.29L8.5,4H5V6H19V4Z';
const mdiArrowUp =
  'M7,15L12,10L17,15H7Z';
const mdiArrowDown =
  'M7,10L12,15L17,10H7Z';
const mdiPlus =
  'M12,5V12H5V14H12V21H14V14H21V12H14V5H12Z';

function isBefore(a: string, b: string): boolean {
  const ta = toSec(a);
  const tb = toSec(b);
  return ta < tb;
}
function toSec(s: string): number {
  const parts = s.split(':').map((p) => Number(p));
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

declare global {
  interface HTMLElementTagNameMap {
    'multi-calendar-grid-card-editor': MultiCalendarGridCardEditor;
  }
}

// Define element (no decorators)
if (!customElements.get('multi-calendar-grid-card-editor')) {
  customElements.define('multi-calendar-grid-card-editor', MultiCalendarGridCardEditor as any);
}
