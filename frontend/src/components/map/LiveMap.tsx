import React, { useRef, useEffect } from 'react';
import L from 'leaflet';
import { useStore } from '../../store';
import { useMapWs } from '../../hooks/useMapWs';
import { interpolatePosition } from '../../lib/interpolate';
import { tocName } from '../../lib/constants';
import { timeSince } from '../../lib/formatters';
import type { MapTrain } from '../../types/map';
import type { TrainDetail } from '../../types/trains';

// ── Color helpers ────────────────────────────────────────────────────────────

function trainColor(t: MapTrain): string {
  if (t.cancelled || t.terminated) return '#475569';
  const v = (t.variation || '').trim().toUpperCase();
  if (v === 'ON TIME') return '#22c55e';
  if (v === 'LATE') return '#ef4444';
  if (v === 'EARLY') return '#06b6d4';
  return '#eab308';
}

function variationColor(v: string): string {
  const s = (v || '').trim().toUpperCase();
  if (s === 'LATE') return '#ef4444';
  if (s === 'ON TIME') return '#22c55e';
  if (s === 'EARLY') return '#06b6d4';
  return '#64748b';
}

// ── Popup HTML builder ───────────────────────────────────────────────────────

function statusBadgeHtml(variation: string, cancelled: boolean, terminated: boolean): string {
  if (cancelled)
    return `<span style="padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:rgba(100,116,139,0.15);color:#94a3b8;border:1px solid rgba(100,116,139,0.3)">Cancelled</span>`;
  if (terminated)
    return `<span style="padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:rgba(100,116,139,0.15);color:#94a3b8;border:1px solid rgba(100,116,139,0.3)">Terminated</span>`;
  const v = (variation || '').trim().toUpperCase();
  if (v === 'ON TIME')
    return `<span style="padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:rgba(34,197,94,0.15);color:#86efac;border:1px solid rgba(34,197,94,0.3)">On Time</span>`;
  if (v === 'LATE')
    return `<span style="padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:rgba(239,68,68,0.15);color:#fca5a5;border:1px solid rgba(239,68,68,0.3)">Late</span>`;
  if (v === 'EARLY')
    return `<span style="padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:rgba(6,182,212,0.12);color:#67e8f9;border:1px solid rgba(6,182,212,0.3)">Early</span>`;
  return `<span style="padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:rgba(100,116,139,0.15);color:#94a3b8;border:1px solid rgba(100,116,139,0.3)">${variation || '–'}</span>`;
}

function buildPopupHtml(t: MapTrain): string {
  const varBadge = statusBadgeHtml(t.variation, t.cancelled, t.terminated);
  const delay = t.timetable_variation
    ? t.timetable_variation > 0
      ? `+${t.timetable_variation}m`
      : `${t.timetable_variation}m`
    : '';
  const chipHtml = t.toc_id
    ? `<span style="padding:1px 7px;border-radius:3px;font-size:10px;font-weight:700;background:rgba(59,130,246,0.15);color:#93c5fd;border:1px solid rgba(59,130,246,0.3)">${tocName(t.toc_id)}</span>`
    : '';

  return `
    <div style="min-width:200px;padding:4px 2px;font-family:Inter,system-ui,sans-serif;">
      <div style="font-family:monospace;font-size:16px;font-weight:800;margin-bottom:6px;color:#e2e8f0">${t.train_id}</div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
        ${chipHtml}
        ${varBadge}
        ${delay ? `<span style="font-size:10px;color:#94a3b8">${delay}</span>` : ''}
      </div>
      <div style="font-size:12px;color:#94a3b8;margin-bottom:4px">
        At <strong style="color:#e2e8f0">${t.last_stanox_name || t.last_stanox}</strong>
      </div>
      ${t.next_stanox ? `<div style="font-size:12px;color:#94a3b8;margin-bottom:4px">→ <strong style="color:#e2e8f0">${t.next_stanox_name || t.next_stanox}</strong></div>` : ''}
      <div style="font-size:11px;color:#64748b">${t.stop_count} stops · ${timeSince(t.last_event_at)}</div>
      <div style="margin-top:8px;padding:5px 12px;background:rgba(59,130,246,0.15);color:#93c5fd;border:1px solid rgba(59,130,246,0.3);border-radius:5px;font-size:11px;font-weight:500;text-align:center">Click to view journey</div>
    </div>`;
}

// ── Route drawing ────────────────────────────────────────────────────────────

function drawRoute(detail: TrainDetail, map: L.Map, layer: L.LayerGroup): void {
  layer.clearLayers();

  const stops = detail.journey.filter((s) => s.lat != null && s.lng != null);
  if (stops.length < 1) return;

  const pastStops = stops.filter((s) => (s.actual_ts ?? 0) > 0 && !s.is_projected);
  const futureStops = stops.filter((s) => (s.actual_ts ?? 0) === 0 || !!s.is_projected);

  const mainColor = variationColor(detail.variation);

  // All stops background line (very subtle)
  if (stops.length >= 2) {
    L.polyline(stops.map((s) => [s.lat!, s.lng!] as L.LatLngTuple), {
      color: 'rgba(255,255,255,0.07)',
      weight: 3,
    }).addTo(layer);
  }

  // Completed path — solid, colored
  if (pastStops.length >= 2) {
    L.polyline(pastStops.map((s) => [s.lat!, s.lng!] as L.LatLngTuple), {
      color: mainColor,
      weight: 4,
      opacity: 0.85,
    }).addTo(layer);
  }

  // Remaining path — dashed white from last past stop onward
  const splitStop = pastStops.length > 0 ? pastStops[pastStops.length - 1] : null;
  const remainingCoords: L.LatLngTuple[] = splitStop
    ? [
        [splitStop.lat!, splitStop.lng!],
        ...futureStops.map((s) => [s.lat!, s.lng!] as L.LatLngTuple),
      ]
    : futureStops.map((s) => [s.lat!, s.lng!] as L.LatLngTuple);
  if (remainingCoords.length >= 2) {
    L.polyline(remainingCoords, {
      color: 'rgba(255,255,255,0.3)',
      weight: 2,
      dashArray: '6,8',
    }).addTo(layer);
  }

  // Past stop dots — colored by their own variation_status
  for (const stop of pastStops) {
    const sc = variationColor(stop.variation_status);
    L.circleMarker([stop.lat!, stop.lng!], {
      radius: 4,
      color: sc,
      fillColor: sc,
      fillOpacity: 1,
      weight: 0,
    })
      .bindTooltip(
        `<b>${stop.stanox_name || stop.stanox}</b>` +
          (stop.actual_ts
            ? `<br/>${new Date(stop.actual_ts).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : '') +
          (stop.timetable_variation
            ? `  <span style="color:${sc}">${stop.timetable_variation > 0 ? '+' : ''}${stop.timetable_variation}m</span>`
            : ''),
        { direction: 'top' }
      )
      .addTo(layer);
  }

  // Future stop dots — hollow white
  for (const stop of futureStops) {
    if (!stop.is_projected) {
      L.circleMarker([stop.lat!, stop.lng!], {
        radius: 4,
        color: 'rgba(255,255,255,0.35)',
        fillColor: 'transparent',
        fillOpacity: 0,
        weight: 1.5,
      })
        .bindTooltip(
          `<b>${stop.stanox_name || stop.stanox}</b>` +
            (stop.planned_ts
              ? `<br/>Planned: ${new Date(stop.planned_ts).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : ''),
          { direction: 'top' }
        )
        .addTo(layer);
    }
  }

  // Current position: double-circle at last past stop with coords.
  // Only draw if we have a real past stop — don't use a projected stop as a
  // stand-in for the current position (that would be misleading).
  if (splitStop) {
    // Outer glow ring
    L.circleMarker([splitStop.lat!, splitStop.lng!], {
      radius: 11,
      color: mainColor,
      fillColor: mainColor,
      fillOpacity: 0.15,
      weight: 1.5,
      opacity: 0.6,
    }).addTo(layer);
    // Inner solid dot
    L.circleMarker([splitStop.lat!, splitStop.lng!], {
      radius: 6,
      color: '#fff',
      fillColor: mainColor,
      fillOpacity: 1,
      weight: 2,
    }).addTo(layer);
  }

  // Fit bounds
  const allCoords = stops.map((s) => [s.lat!, s.lng!] as L.LatLngTuple);
  if (allCoords.length > 0) {
    map.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50], maxZoom: 12, animate: true });
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export interface LiveMapProps {
  tocFilter: string;
  statusFilter: string;
  selectedTrainId: string | null;
  selectedDetail: TrainDetail | null;
  onTrainSelect: (trainId: string | null) => void;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  tocFilter,
  statusFilter,
  selectedTrainId,
  selectedDetail,
  onTrainSelect,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, L.CircleMarker>>({});
  const trainDataRef = useRef<Record<string, MapTrain>>({});
  const animFrameRef = useRef<number>(0);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  // Refs for filters (read by syncMarkers outside React)
  const tocFilterRef = useRef(tocFilter);
  const statusFilterRef = useRef(statusFilter);
  const selectedTrainIdRef = useRef(selectedTrainId);
  const onTrainSelectRef = useRef(onTrainSelect);

  useMapWs();

  // ── Map init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [54.2, -2.5],
      zoom: 6,
      zoomControl: false,
      preferCanvas: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    routeLayerRef.current = L.layerGroup().addTo(map);

    // Map click → deselect (only fires when clicking the map background, not markers)
    map.on('click', () => {
      onTrainSelectRef.current(null);
    });

    mapRef.current = map;

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      map.remove();
      mapRef.current = null;
      routeLayerRef.current = null;
    };
  }, []);

  // ── Keep callback ref fresh ──────────────────────────────────────────────────
  useEffect(() => {
    onTrainSelectRef.current = onTrainSelect;
  }, [onTrainSelect]);

  // ── Sync filter refs + re-run syncMarkers ────────────────────────────────────
  useEffect(() => {
    tocFilterRef.current = tocFilter;
    statusFilterRef.current = statusFilter;
    selectedTrainIdRef.current = selectedTrainId;
    syncMarkers(trainDataRef.current);
  }, [tocFilter, statusFilter, selectedTrainId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Route drawing ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!routeLayerRef.current) return;
    if (!selectedDetail || !mapRef.current) {
      routeLayerRef.current.clearLayers();
      return;
    }
    drawRoute(selectedDetail, mapRef.current, routeLayerRef.current);
  }, [selectedDetail]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Zustand subscription ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = useStore.subscribe(
      (state) => state.trainData,
      (trainData) => {
        trainDataRef.current = trainData;
        syncMarkers(trainData);
      }
    );
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── syncMarkers (reads filter refs, no React state) ──────────────────────────
  function syncMarkers(trainData: Record<string, MapTrain>): void {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();
    const tof = tocFilterRef.current;
    const stf = statusFilterRef.current;

    for (const [tid, t] of Object.entries(trainData)) {
      // TOC filter
      if (tof && t.toc_id !== tof) {
        if (markersRef.current[tid]) {
          map.removeLayer(markersRef.current[tid]!);
          delete markersRef.current[tid];
        }
        continue;
      }

      // Status filter
      if (stf) {
        const v = (t.variation || '').trim().toUpperCase();
        if (stf === 'Cancelled') {
          if (!t.cancelled) {
            if (markersRef.current[tid]) {
              map.removeLayer(markersRef.current[tid]!);
              delete markersRef.current[tid];
            }
            continue;
          }
        } else if (v !== stf) {
          if (markersRef.current[tid]) {
            map.removeLayer(markersRef.current[tid]!);
            delete markersRef.current[tid];
          }
          continue;
        }
      }

      seen.add(tid);
      const color = trainColor(t);
      const isSelected = selectedTrainIdRef.current === tid;
      const opacity = selectedTrainIdRef.current && !isSelected
        ? 0.2
        : t.cancelled || t.terminated
        ? 0.4
        : 0.9;
      const radius = isSelected ? 8 : t.cancelled || t.terminated ? 3 : 6;
      const pos = interpolatePosition(t);

      const existingMarker = markersRef.current[tid];
      if (existingMarker) {
        existingMarker.setStyle({ color, fillColor: color, fillOpacity: opacity });
        existingMarker.setRadius(radius);
      } else {
        const m = L.circleMarker([pos.lat, pos.lng], {
          radius,
          color,
          fillColor: color,
          fillOpacity: opacity,
          weight: 0,
        }).addTo(map);

        m.bindPopup('', { maxWidth: 280 });

        m.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          const current = trainDataRef.current[tid];
          if (current) {
            m.setPopupContent(buildPopupHtml(current));
            m.openPopup();
          }
          onTrainSelectRef.current(tid);
        });

        m.on('mouseover', () => {
          const current = trainDataRef.current[tid];
          if (current) {
            m.setPopupContent(buildPopupHtml(current));
            m.openPopup();
          }
        });

        markersRef.current[tid] = m;
      }
    }

    // Remove stale markers
    for (const tid of Object.keys(markersRef.current)) {
      if (!seen.has(tid)) {
        map.removeLayer(markersRef.current[tid]!);
        delete markersRef.current[tid];
      }
    }
  }

  // ── rAF animation loop ───────────────────────────────────────────────────────
  useEffect(() => {
    const animate = () => {
      for (const [tid, t] of Object.entries(trainDataRef.current)) {
        const marker = markersRef.current[tid];
        if (marker) {
          const pos = interpolatePosition(t);
          marker.setLatLng([pos.lat, pos.lng]);
        }
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};
