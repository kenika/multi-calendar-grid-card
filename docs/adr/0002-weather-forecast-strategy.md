# ADR-0002: Weather forecast strategy

- **Status**: Accepted (dev.12)
- **Decision order**:
  1. `weather.get_forecasts` WS (`daily`)
  2. `weather.get_forecasts` WS (`hourly` → aggregate daily)
  3. REST `/api/weather/forecast`
  4. `attributes.forecast`
- **Aggregation (hourly)**: group by date, hi=max(temp), lo=min(temp), cond=mode(), pp=max().
- **Fallback**: If everything fails, hide weather but do not error the card.
