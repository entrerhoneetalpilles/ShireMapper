'use client';

import { useState, useRef, useCallback } from 'react';
import { useAtmosphereStore } from '@/app/store/atmosphereStore';
import type { AtmosphereSettings } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
      {children}
    </p>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <label className="text-xs text-gray-400 shrink-0 w-24">{label}</label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function RangeInput({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-[#E94560] cursor-pointer"
      />
      <span className="text-xs text-gray-300 w-10 text-right tabular-nums">
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle Switch
// ─────────────────────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-gray-200">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none',
          checked ? 'bg-[#E94560]' : 'bg-[#0F3460]',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sun Direction Wheel
// ─────────────────────────────────────────────────────────────────────────────

const WHEEL_RADIUS = 50; // half of 100px viewBox
const DOT_ORBIT = 38;    // orbit radius inside the wheel

function SunDirectionWheel({
  angle,
  onChange,
}: {
  angle: number;
  onChange: (deg: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const angleToPos = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x: WHEEL_RADIUS + Math.cos(rad) * DOT_ORBIT,
      y: WHEEL_RADIUS + Math.sin(rad) * DOT_ORBIT,
    };
  };

  const posToAngle = useCallback((clientX: number, clientY: number): number => {
    if (!svgRef.current) return angle;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const rad = Math.atan2(dy, dx);
    let deg = (rad * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return Math.round(deg);
  }, [angle]);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    dragging.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    onChange(posToAngle(e.clientX, e.clientY));
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    onChange(posToAngle(e.clientX, e.clientY));
  };

  const handlePointerUp = () => {
    dragging.current = false;
  };

  const { x, y } = angleToPos(angle);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        ref={svgRef}
        width={100}
        height={100}
        viewBox="0 0 100 100"
        className="cursor-pointer select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Background circle */}
        <circle cx={50} cy={50} r={46} fill="#1A1A2E" stroke="#0F3460" strokeWidth={2} />
        {/* Cardinal tick marks */}
        {[0, 90, 180, 270].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 50 + Math.cos(rad) * 40;
          const y1 = 50 + Math.sin(rad) * 40;
          const x2 = 50 + Math.cos(rad) * 46;
          const y2 = 50 + Math.sin(rad) * 46;
          return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4A5568" strokeWidth={1.5} />;
        })}
        {/* Line from center to dot */}
        <line x1={50} y1={50} x2={x} y2={y} stroke="#F6AD55" strokeWidth={1.5} strokeDasharray="2,2" />
        {/* Center dot */}
        <circle cx={50} cy={50} r={3} fill="#4A5568" />
        {/* Sun dot */}
        <circle cx={x} cy={y} r={7} fill="#F6AD55" stroke="#F6E05E" strokeWidth={1.5} />
        {/* Sun rays (small lines radiating from sun dot) */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((rayDeg) => {
          const rad = (rayDeg * Math.PI) / 180;
          return (
            <line
              key={rayDeg}
              x1={x + Math.cos(rad) * 8}
              y1={y + Math.sin(rad) * 8}
              x2={x + Math.cos(rad) * 11}
              y2={y + Math.sin(rad) * 11}
              stroke="#F6E05E"
              strokeWidth={1}
            />
          );
        })}
      </svg>
      <span className="text-xs text-gray-400 tabular-nums">{angle}°</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Weather Section
// ─────────────────────────────────────────────────────────────────────────────

const WEATHER_TYPES: AtmosphereSettings['weatherType'][] = [
  'none',
  'rain',
  'snow',
  'fog',
  'storm',
];

const WEATHER_LABELS: Record<AtmosphereSettings['weatherType'], string> = {
  none: 'Aucun',
  rain: 'Pluie',
  snow: 'Neige',
  fog: 'Brouillard',
  storm: 'Orage',
};

function WeatherSection({
  weatherType,
  weatherIntensity,
  update,
}: {
  weatherType: AtmosphereSettings['weatherType'];
  weatherIntensity: number;
  update: (p: Partial<AtmosphereSettings>) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 border-t border-[#0F3460] pt-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full text-left mb-2 group"
      >
        <SectionTitle>Météo</SectionTitle>
        <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors mb-2">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div>
          {/* Segmented weather type buttons */}
          <div className="flex flex-wrap gap-1 mb-3">
            {WEATHER_TYPES.map((wt) => (
              <button
                key={wt}
                onClick={() => update({ weatherType: wt })}
                className={[
                  'px-2 py-1 rounded text-xs border transition-colors',
                  weatherType === wt
                    ? 'bg-[#0F3460] border-[#E94560] text-gray-100'
                    : 'bg-[#1A1A2E] border-[#0F3460] text-gray-400 hover:bg-[#0F3460]',
                ].join(' ')}
              >
                {WEATHER_LABELS[wt]}
              </button>
            ))}
          </div>

          {weatherType !== 'none' && (
            <Row label="Intensité">
              <RangeInput
                value={weatherIntensity}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => update({ weatherIntensity: v })}
              />
            </Row>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AtmospherePanel
// ─────────────────────────────────────────────────────────────────────────────

export default function AtmospherePanel() {
  const {
    lightingEnabled,
    sunAngle,
    sunElevation,
    sunColor,
    shadowLength,
    shadowOpacity,
    weatherType,
    weatherIntensity,
    updateAtmosphere,
  } = useAtmosphereStore();

  function update(partial: Partial<AtmosphereSettings>) {
    updateAtmosphere(partial);
  }

  return (
    <div className="w-[260px] bg-[#16213E] border-l border-[#0F3460] h-full overflow-y-auto">
      <div className="px-3 py-3">
        <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3 pb-2 border-b border-[#0F3460]">
          Atmosphère
        </h2>

        {/* ── Lighting Section ── */}
        <SectionTitle>Éclairage</SectionTitle>

        <ToggleSwitch
          label="Éclairage"
          checked={lightingEnabled}
          onChange={(v) => update({ lightingEnabled: v })}
        />

        {/* Sun Direction Wheel */}
        <div className="mb-3">
          <p className="text-xs text-gray-400 mb-2">Direction du soleil</p>
          <div className="flex justify-center">
            <SunDirectionWheel
              angle={sunAngle}
              onChange={(deg) => update({ sunAngle: deg })}
            />
          </div>
        </div>

        <Row label="Élévation">
          <RangeInput
            value={sunElevation}
            min={0}
            max={90}
            step={1}
            onChange={(v) => update({ sunElevation: v })}
          />
        </Row>

        <Row label="Couleur soleil">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={sunColor}
              onChange={(e) => update({ sunColor: e.target.value })}
              className="w-8 h-6 rounded border border-[#0F3460] bg-[#1A1A2E] cursor-pointer"
            />
            <span className="text-xs text-gray-300 font-mono">{sunColor}</span>
          </div>
        </Row>

        <Row label="Longueur ombre">
          <RangeInput
            value={shadowLength}
            min={0}
            max={5}
            step={0.1}
            onChange={(v) => update({ shadowLength: v })}
          />
        </Row>

        <Row label="Opacité ombre">
          <RangeInput
            value={shadowOpacity}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => update({ shadowOpacity: v })}
          />
        </Row>

        {/* ── Weather Section ── */}
        <WeatherSection
          weatherType={weatherType}
          weatherIntensity={weatherIntensity}
          update={update}
        />
      </div>
    </div>
  );
}
