import { describe, expect, it } from 'vitest';
import {
  calculateCumulativeDistances,
  densifyRoute,
  getPositionAlongRoute,
} from '../src/lib/routing';

describe('road route progress', () => {
  const route: [number, number][] = [
    [12.900, 74.800],
    [12.900, 74.810],
    [12.910, 74.810],
  ];

  it('preserves ordered road geometry and trims travelled coordinates', () => {
    const densified = densifyRoute(route, 500);
    const cumulative = calculateCumulativeDistances(densified);
    const halfway = getPositionAlongRoute(
      densified,
      cumulative,
      cumulative[cumulative.length - 1] / 2,
      120
    );

    expect(halfway.lat).toBeGreaterThanOrEqual(12.9);
    expect(halfway.remainingCoordinates[0][0]).toBeCloseTo(halfway.lat, 6);
    expect(halfway.remainingCoordinates[0][1]).toBeCloseTo(halfway.lng, 6);
    expect(halfway.remainingCoordinates.length).toBeLessThan(densified.length);
    expect(halfway.remainingCoordinates.at(-1)).toEqual(densified.at(-1));
    expect(halfway.remainingDistanceMeters).toBeGreaterThan(0);
    expect(halfway.remainingDistanceMeters).toBeLessThan(cumulative.at(-1)!);
    expect(halfway.remainingDurationSeconds).toBeGreaterThan(0);
  });

  it('moves along route bends instead of interpolating directly to the destination', () => {
    const densified = densifyRoute(route, 500);
    const cumulative = calculateCumulativeDistances(densified);
    const beforeBend = getPositionAlongRoute(densified, cumulative, cumulative[1] * 0.5, 120);

    expect(beforeBend.lng).toBeGreaterThan(74.8);
    expect(beforeBend.lat).toBeCloseTo(12.9, 4);
    expect(beforeBend.remainingCoordinates.at(-1)).toEqual(route.at(-1));
  });

  it('resets to the route start and empties geometry at the endpoints', () => {
    const densified = densifyRoute(route, 500);
    const cumulative = calculateCumulativeDistances(densified);
    const start = getPositionAlongRoute(densified, cumulative, 0, 120);
    const end = getPositionAlongRoute(densified, cumulative, Number.MAX_SAFE_INTEGER, 120);

    expect(start.remainingCoordinates).toEqual(densified);
    expect(start.progressFraction).toBe(0);
    expect(end.remainingCoordinates).toEqual([densified.at(-1)]);
    expect(end.progressFraction).toBe(1);
    expect(end.remainingDistanceMeters).toBe(0);
    expect(end.remainingDurationSeconds).toBe(0);
  });
});
