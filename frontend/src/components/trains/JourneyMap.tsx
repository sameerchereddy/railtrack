import React, { useRef, useEffect } from 'react';
import L from 'leaflet';
import type { TrainDetail, JourneyStop } from '../../types/trains';
import { fmtMsTime } from '../../lib/formatters';

interface JourneyMapProps {
  detail: TrainDetail;
}

function mapStatusColor(variation: string): string {
  const v = (variation || '').trim().toUpperCase();
  if (v === 'ON TIME') return '#22c55e';
  if (v === 'LATE') return '#ef4444';
  if (v === 'EARLY') return '#06b6d4';
  return '#eab308';
}

function stopColor(stop: JourneyStop): string {
  const sc = (stop.variation_status || '').trim().toUpperCase();
  if (sc === 'LATE') return '#ef4444';
  if (sc === 'EARLY') return '#06b6d4';
  if (sc === 'ON TIME') return '#22c55e';
  return '#eab308';
}

export const JourneyMap: React.FC<JourneyMapProps> = ({ detail }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<L.LayerGroup | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const animFrameRef = useRef<number>(0);
  const detailRef = useRef(detail);

  // Update the ref whenever detail changes
  useEffect(() => {
    detailRef.current = detail;
  });

  const journey = detail.journey ?? [];
  const actual = journey.filter((s) => !s.is_projected && s.lat && s.lng);
  const hasCoords = actual.length > 0;

  // Init Leaflet map — runs whenever containerRef becomes available or map is destroyed
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
      preferCanvas: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Re-render route when detail changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    cancelAnimationFrame(animFrameRef.current);

    // Clear existing layers
    if (groupRef.current) {
      map.removeLayer(groupRef.current);
      groupRef.current = null;
    }
    markerRef.current = null;

    const jrn = detail.journey ?? [];
    const acts = jrn.filter((s) => !s.is_projected && s.lat && s.lng);
    const projected = jrn.find((s) => s.is_projected && s.lat && s.lng);

    if (acts.length === 0) return;

    const group = L.layerGroup().addTo(map);
    groupRef.current = group;

    const color = mapStatusColor(detail.variation);
    const latlngs = acts.map((s): [number, number] => [s.lat!, s.lng!]);

    // Solid route polyline
    L.polyline(latlngs, {
      color,
      weight: 4,
      opacity: 0.85,
      lineJoin: 'round',
      lineCap: 'round',
    }).addTo(group);

    // Dashed line to next expected stop
    if (projected) {
      const last = acts[acts.length - 1];
      L.polyline([[last.lat!, last.lng!], [projected.lat!, projected.lng!]], {
        color: '#475569',
        weight: 3,
        dashArray: '8 6',
        opacity: 0.6,
      }).addTo(group);
    }

    // Stop markers
    acts.forEach((stop, i) => {
      const isFirst = i === 0;
      const isLast = i === acts.length - 1 && !detail.terminated;
      const c = stopColor(stop);
      const r = isFirst ? 7 : isLast ? 0 : 4;

      if (r > 0) {
        L.circleMarker([stop.lat!, stop.lng!], {
          radius: r,
          color: c,
          fillColor: c,
          fillOpacity: 0.85,
          weight: 1,
        })
          .bindPopup(
            `<strong>${stop.stanox_name || stop.stanox}</strong><br>` +
              `${stop.event_type || ''} ${fmtMsTime(stop.actual_ts)}<br>` +
              `<span style="color:${c}">${stop.variation_status || ''}</span>`
          )
          .addTo(group);
      }

      if (isLast) {
        L.circleMarker([stop.lat!, stop.lng!], {
          radius: 14,
          color,
          fillColor: color,
          fillOpacity: 0.08,
          weight: 1.5,
          opacity: 0.5,
        }).addTo(group);
      }
    });

    // Projected next stop
    if (projected) {
      L.circleMarker([projected.lat!, projected.lng!], {
        radius: 5,
        color: '#64748b',
        fillColor: 'transparent',
        fillOpacity: 0,
        weight: 2,
        dashArray: '4 3',
      })
        .bindPopup(`<strong>Next:</strong> ${projected.stanox_name || projected.stanox}`)
        .addTo(group);
    }

    // Animated train marker
    const trainIcon = L.divIcon({
      html: '<div class="train-map-icon">🚂</div>',
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const startStop = acts[acts.length - 1];
    const trainMarker = L.marker([startStop.lat!, startStop.lng!], {
      icon: trainIcon,
      zIndexOffset: 1000,
    }).addTo(group);
    markerRef.current = trainMarker;

    // Fit bounds
    const allPts: [number, number][] = [
      ...latlngs,
      ...(projected ? [[projected.lat!, projected.lng!] as [number, number]] : []),
    ];
    if (allPts.length >= 2) {
      map.fitBounds(L.latLngBounds(allPts), { padding: [40, 40], maxZoom: 13 });
    } else if (allPts.length === 1) {
      map.setView(allPts[0]!, 12);
    }

    setTimeout(() => map.invalidateSize(), 120);

    // Animation loop
    const animate = () => {
      const t = detailRef.current;
      const m = markerRef.current;
      if (!m || !t) return;

      const j = t.journey ?? [];
      const latestActs = j.filter((s) => !s.is_projected && s.lat && s.lng);
      const proj = j.find((s) => s.is_projected && s.lat && s.lng);
      const last = latestActs[latestActs.length - 1];

      if (
        last &&
        last.event_type === 'DEPARTURE' &&
        proj?.lat &&
        last.actual_ts &&
        last.next_run_time
      ) {
        const elapsed = Date.now() - last.actual_ts;
        const totalMs = last.next_run_time * 60 * 1000;
        const frac = Math.min(Math.max(elapsed / totalMs, 0), 1);
        m.setLatLng([
          last.lat! + (proj.lat! - last.lat!) * frac,
          last.lng! + (proj.lng! - last.lng!) * frac,
        ]);
      } else if (last?.lat) {
        m.setLatLng([last.lat!, last.lng!]);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [detail]);

  return (
    <div
      style={{
        height: '320px',
        flexShrink: 0,
        borderBottom: '1px solid #1e2d45',
        position: 'relative',
        background: '#080c14',
      }}
    >
      {/* Always render the map container div so Leaflet can attach */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: hasCoords ? 'block' : 'none',
        }}
      />

      {/* No-coords fallback */}
      {!hasCoords && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            color: '#475569',
            fontSize: '13px',
            flexDirection: 'column',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity={0.4}
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>No geographic data for this route</span>
          <span style={{ fontSize: '11px', color: '#475569' }}>
            {journey
              .filter((s) => !s.is_projected)
              .map((s) => s.stanox_name || s.stanox)
              .slice(0, 4)
              .join(' → ')}
            {journey.length > 4 ? '…' : ''}
          </span>
        </div>
      )}

      {/* Info badge — only visible when map is shown */}
      {hasCoords && actual.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            zIndex: 1000,
            background: 'rgba(8,12,20,0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #1e2d45',
            borderRadius: '7px',
            padding: '7px 12px',
            fontSize: '11px',
            color: '#94a3b8',
            pointerEvents: 'none',
          }}
        >
          <strong
            style={{
              color: '#e2e8f0',
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: '12px',
            }}
          >
            {actual[0]?.stanox_name || actual[0]?.stanox}
          </strong>
          <span style={{ color: '#475569', margin: '0 6px' }}>→</span>
          <strong
            style={{
              color: '#e2e8f0',
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: '12px',
            }}
          >
            {actual[actual.length - 1]?.stanox_name || actual[actual.length - 1]?.stanox}
          </strong>
          <span style={{ color: '#475569', margin: '0 6px' }}>·</span>
          {actual.length} station{actual.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};
