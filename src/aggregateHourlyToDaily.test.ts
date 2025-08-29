import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateHourlyToDaily, WItem } from './multi-calendar-grid-card';

test('aggregate hourly forecasts into daily summaries', () => {
  const hour = 60 * 60 * 1000;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const hourly: WItem[] = [
    { datetime: new Date(start.getTime() - hour).toISOString(), temperature: 1, condition: 'rainy' }, // past, ignored
    { datetime: new Date(start.getTime() + hour).toISOString(), temperature: 2, condition: 'sunny', precipitation_probability: 10 },
    { datetime: new Date(start.getTime() + 2 * hour).toISOString(), temperature: 4, condition: 'sunny' },
    { datetime: new Date(start.getTime() + 24 * hour + hour).toISOString(), temperature: 5, condition: 'cloudy', precipitation_probability: 30 },
    { datetime: new Date(start.getTime() + 24 * hour + 2 * hour).toISOString(), temperature: 3, condition: 'cloudy' },
  ];
  const res = aggregateHourlyToDaily(hourly, 7);
  assert.equal(res.length, 2);
  const today = res[0];
  assert.equal(today.temperature, 4);
  assert.equal(today.templow, 2);
  assert.equal(today.condition, 'sunny');
  assert.equal(today.precipitation_probability, 10);
  const tomorrow = res[1];
  assert.equal(tomorrow.temperature, 5);
  assert.equal(tomorrow.templow, 3);
  assert.equal(tomorrow.condition, 'cloudy');
  assert.equal(tomorrow.precipitation_probability, 30);
});

test('aggregateHourlyToDaily respects daysWanted limit', () => {
  const hour = 60 * 60 * 1000;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const hourly: WItem[] = [];
  for (let d = 0; d < 3; d++) {
    hourly.push({ datetime: new Date(start.getTime() + (24 * d + 1) * hour).toISOString(), temperature: d });
  }
  const res = aggregateHourlyToDaily(hourly, 2);
  assert.equal(res.length, 2);
});
