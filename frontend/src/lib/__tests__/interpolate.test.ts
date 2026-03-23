import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { interpolatePosition } from '../interpolate';
import type { MapTrain } from '../../types/map';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = 1_700_000_000_000; // fixed epoch ms

/** Build a minimal MapTrain that satisfies the interpolation hot path. */
function makeTrain(overrides: Partial<MapTrain> = {}): MapTrain {
  return {
    train_id: 'T001',
    toc_id: 'GW',
    variation: 'ON TIME',
    timetable_variation: 0,
    terminated: false,
    cancelled: false,
    stop_count: 1,
    last_event_at: '2024-01-01T00:00:00',
    last_stanox: '74001',
    last_stanox_name: 'London Paddington',
    last_lat: 51.5,
    last_lng: -0.1,
    next_stanox: '74002',
    next_stanox_name: 'Reading',
    next_lat: 51.4,
    next_lng: -0.97,
    last_actual_ts: NOW,            // departed exactly "now"
    last_event_type: 'DEPARTURE',
    next_run_time: 30,              // 30-minute journey
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('interpolatePosition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Happy-path interpolation ---

  it('returns last position when frac = 0 (just departed)', () => {
    const train = makeTrain();
    // elapsed = 0, so frac = 0
    const pos = interpolatePosition(train);
    expect(pos.lat).toBeCloseTo(51.5);
    expect(pos.lng).toBeCloseTo(-0.1);
  });

  it('returns next position when frac = 1 (journey complete)', () => {
    const journeyMs = 30 * 60 * 1000;
    vi.setSystemTime(NOW + journeyMs);
    const train = makeTrain();
    const pos = interpolatePosition(train);
    expect(pos.lat).toBeCloseTo(51.4);
    expect(pos.lng).toBeCloseTo(-0.97);
  });

  it('returns midpoint when frac = 0.5 (halfway through)', () => {
    const halfJourneyMs = 15 * 60 * 1000;
    vi.setSystemTime(NOW + halfJourneyMs);
    const train = makeTrain();
    const pos = interpolatePosition(train);
    expect(pos.lat).toBeCloseTo((51.5 + 51.4) / 2);
    expect(pos.lng).toBeCloseTo((-0.1 + -0.97) / 2);
  });

  it('clamps frac to 1 when elapsed > total journey time (no overshoot)', () => {
    const wayPastMs = 60 * 60 * 1000; // 2× the journey time
    vi.setSystemTime(NOW + wayPastMs);
    const train = makeTrain();
    const pos = interpolatePosition(train);
    expect(pos.lat).toBeCloseTo(51.4);
    expect(pos.lng).toBeCloseTo(-0.97);
  });

  it('clamps frac to 0 when elapsed is negative (clock skew)', () => {
    vi.setSystemTime(NOW - 60_000); // 1 minute before departure
    const train = makeTrain();
    const pos = interpolatePosition(train);
    expect(pos.lat).toBeCloseTo(51.5);
    expect(pos.lng).toBeCloseTo(-0.1);
  });

  // --- Fallback conditions (non-DEPARTURE or missing data) ---

  it('falls back to last position when last_event_type is ARRIVAL', () => {
    const train = makeTrain({ last_event_type: 'ARRIVAL' });
    const pos = interpolatePosition(train);
    expect(pos.lat).toBe(51.5);
    expect(pos.lng).toBe(-0.1);
  });

  it('falls back to last position when last_event_type is empty string', () => {
    const train = makeTrain({ last_event_type: '' });
    const pos = interpolatePosition(train);
    expect(pos.lat).toBe(51.5);
    expect(pos.lng).toBe(-0.1);
  });

  it('falls back to last position when next_lat is null', () => {
    const train = makeTrain({ next_lat: null });
    const pos = interpolatePosition(train);
    expect(pos.lat).toBe(51.5);
    expect(pos.lng).toBe(-0.1);
  });

  it('falls back to last position when next_lng is null', () => {
    const train = makeTrain({ next_lng: null });
    const pos = interpolatePosition(train);
    expect(pos.lat).toBe(51.5);
    expect(pos.lng).toBe(-0.1);
  });

  it('falls back to last position when last_actual_ts is 0', () => {
    const train = makeTrain({ last_actual_ts: 0 });
    const pos = interpolatePosition(train);
    expect(pos.lat).toBe(51.5);
    expect(pos.lng).toBe(-0.1);
  });

  it('falls back to last position when next_run_time is 0 (no division by zero)', () => {
    const train = makeTrain({ next_run_time: 0 });
    const pos = interpolatePosition(train);
    expect(pos.lat).toBe(51.5);
    expect(pos.lng).toBe(-0.1);
  });

  // --- Stationary train (last == next coords) ---

  it('returns stable position when last and next coords are identical', () => {
    const halfJourneyMs = 15 * 60 * 1000;
    vi.setSystemTime(NOW + halfJourneyMs);
    const train = makeTrain({ next_lat: 51.5, next_lng: -0.1 });
    const pos = interpolatePosition(train);
    expect(pos.lat).toBeCloseTo(51.5);
    expect(pos.lng).toBeCloseTo(-0.1);
  });

  // --- Return shape ---

  it('always returns an object with lat and lng keys', () => {
    const pos = interpolatePosition(makeTrain());
    expect(pos).toHaveProperty('lat');
    expect(pos).toHaveProperty('lng');
  });
});
