// WS-only forecast fetcher for the card.
// No REST, no attribute fallback; this is intentionally strict/simple.

export type ForecastType = "daily" | "hourly" | "twice_daily";

export interface ForecastDay {
  date: Date;
  condition: string;
  high: number | null;
  low: number | null;
}

export async function getForecastWS(
  hass: any,
  entityId: string,
  forecastType: ForecastType = "daily"
): Promise<ForecastDay[]> {
  const res = await hass.callWS({
    type: "weather/get_forecast",
    entity_id: entityId,
    forecast_type: forecastType,
  });

  const raw = Array.isArray(res) ? res : res?.forecast;
  if (!Array.isArray(raw)) return [];

  return raw
    .map(normalize)
    .filter((x): x is ForecastDay => !!x)
    .slice(0, forecastType === "daily" ? 7 : raw.length);
}

function normalize(x: any): ForecastDay | null {
  const dt = x?.datetime || x?.date || x?.time || x?.start_time || x?.start || x?.ts;
  const when = dt ? new Date(dt) : null;
  if (!when || Number.isNaN(when.valueOf())) return null;

  const high = pickNum(
    x.temperature, x.temperature_high, x.high_temperature,
    x.apparent_temperature_max, x.max_temp, x.tempmax
  );
  const low = pickNum(
    x.templow, x.temperature_low, x.low_temperature,
    x.apparent_temperature_min, x.min_temp, x.tempmin
  );

  return {
    date: when,
    condition: String(x.condition ?? x.state ?? x.weather ?? "").toLowerCase().trim(),
    high: high == null ? null : Math.round(high),
    low: low == null ? null : Math.round(low),
  };
}

function pickNum(...vals: any[]): number | null {
  for (const v of vals) {
    if (v == null) continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}
