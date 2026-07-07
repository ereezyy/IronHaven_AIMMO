import React, { useEffect, useRef } from 'react';
import type { Vector3 } from 'three';
import {
  CITY_BUILDINGS,
  CITY_STREET_LIGHTS,
  CITY_RADIUS,
} from '../game/cityLayout';

interface MMOHUDProps {
  health: number;
  stamina: number;
  mana: number;
  level: number;
  experience: number;
  maxExperience: number;
  playersOnline: number;
  money: number;
  reputation: number;
  wanted: number;
  kills: number;
  playerPosRef?: React.MutableRefObject<Vector3>;
  playerRotRef?: React.MutableRefObject<number>;
  otherPlayers?: { id: string; position: [number, number, number] }[];
}

const MINIMAP_SIZE = 188; // canvas px
const MINIMAP_RANGE = 65; // world units from centre to map edge

// Live top-down district map, redrawn per frame from refs (no React
// re-render). North-up with a rotating player arrow — the standard modern
// MMO minimap idiom.
const Minimap: React.FC<{
  playerPosRef?: React.MutableRefObject<Vector3>;
  playerRotRef?: React.MutableRefObject<number>;
  otherPlayers: { id: string; position: [number, number, number] }[];
}> = ({ playerPosRef, playerRotRef, otherPlayers }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const othersRef = useRef(otherPlayers);
  othersRef.current = otherPlayers;

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      const px = playerPosRef?.current.x ?? 0;
      const pz = playerPosRef?.current.z ?? 0;
      const rot = playerRotRef?.current ?? 0;
      const half = MINIMAP_SIZE / 2;
      const scale = half / MINIMAP_RANGE;
      const toX = (wx: number) => half + (wx - px) * scale;
      const toY = (wz: number) => half + (wz - pz) * scale;

      ctx.fillStyle = '#0b0b0e';
      ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

      // District boundary.
      ctx.strokeStyle = '#26282e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(toX(0), toY(0), CITY_RADIUS * scale, 0, Math.PI * 2);
      ctx.stroke();

      // Buildings as footprints; neon ones carry their sign colour.
      for (const b of CITY_BUILDINGS) {
        const x = toX(b.position[0]);
        const y = toY(b.position[2]);
        if (x < -8 || x > MINIMAP_SIZE + 8 || y < -8 || y > MINIMAP_SIZE + 8)
          continue;
        const w = Math.max(2, b.size[0] * scale);
        const h = Math.max(2, b.size[2] * scale);
        ctx.fillStyle = b.hasNeon ? '#2c2f36' : '#22252a';
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
        if (b.hasNeon) {
          ctx.fillStyle = b.neonColor;
          ctx.globalAlpha = 0.85;
          ctx.fillRect(x - w / 2, y - h / 2, w, 1.5);
          ctx.globalAlpha = 1;
        }
      }

      // Street lights as faint amber points.
      ctx.fillStyle = '#8a6f42';
      for (const l of CITY_STREET_LIGHTS) {
        const x = toX(l.position[0]);
        const y = toY(l.position[2]);
        if (x < 0 || x > MINIMAP_SIZE || y < 0 || y > MINIMAP_SIZE) continue;
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }

      // Other players.
      for (const p of othersRef.current) {
        const x = toX(p.position[0]);
        const y = toY(p.position[2]);
        if (x < 0 || x > MINIMAP_SIZE || y < 0 || y > MINIMAP_SIZE) continue;
        ctx.fillStyle = '#e5e5e8';
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Player arrow at centre, rotated to heading (three.js +Y rotation is
      // CCW from above; canvas rotation is CW, hence the negation).
      ctx.save();
      ctx.translate(half, half);
      ctx.rotate(-rot);
      ctx.fillStyle = '#c03a30';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4.5, 5);
      ctx.lineTo(0, 2.5);
      ctx.lineTo(-4.5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // North marker.
      ctx.fillStyle = '#5a5d62';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('N', half, 10);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [playerPosRef, playerRotRef]);

  return (
    <canvas
      ref={canvasRef}
      width={MINIMAP_SIZE}
      height={MINIMAP_SIZE}
      className="block border border-[#1a1c1f]"
    />
  );
};

// Inline SVG icon sprites — one path library, tinted via currentColor so
// they inherit each stat's accent. Zero image requests.
const ICON_PATHS: Record<string, string> = {
  health:
    'M8 1.5c-2-2-6-1-6 2.2C2 6.5 8 11 8 11s6-4.5 6-7.3c0-3.2-4-4.2-6-2.2z',
  stamina: 'M9 1 3 9h4l-1 6 6-8H8l1-6z',
  mana: 'M8 1C8 1 3 7 3 10a5 5 0 0 0 10 0C13 7 8 1 8 1z',
  cash: 'M1 4h14v8H1V4zm7 1.5A2.5 2.5 0 1 0 8 10.5 2.5 2.5 0 0 0 8 5.5z',
  rep: 'M8 1l2 4.3 4.7.5-3.5 3.2 1 4.6L8 11.2 3.8 13.6l1-4.6L1.3 5.8 6 5.3 8 1z',
  kills:
    'M8 2a4 4 0 0 0-4 4c0 2 1.5 3.4 1.5 3.4V12h5V9.4S12 8 12 6a4 4 0 0 0-4-4zM6 13h4v1.5H6z',
  wanted: 'M8 1 1 14h14L8 1zm-.8 5h1.6v4H7.2V6zm0 5h1.6v1.5H7.2V11z',
  fist: 'M3 8V5.5A1.5 1.5 0 0 1 6 5V4a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1 3 .5V8c0 3-1.5 5-4.5 5S3 11 3 8z',
  talk: 'M2 3h12v8H9l-3 3v-3H2V3z',
  sprint:
    'M10 2a1.6 1.6 0 1 1 0 3.2A1.6 1.6 0 0 1 10 2zM6 6l3 1 1 3 3 4h-2l-2.6-3L7 12l-1 3H4l1.5-4.5L4 9l-2 1V7.5L6 6z',
  map: 'M1 3l4.5-1.5L10 3l5-1.5v11L10.5 14 6 12.5 1 14V3zm5 0v9m4-8v9',
};

const Icon: React.FC<{ name: string; size?: number; className?: string }> = ({
  name,
  size = 12,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    className={className}
    fill="currentColor"
    stroke="none"
    aria-hidden
  >
    <path d={ICON_PATHS[name] ?? ''} />
  </svg>
);

// Action-bar slot definitions: icon + keybind label.
const ACTION_SLOTS = [
  { key: '1', icon: 'fist', label: 'strike' },
  { key: '2', icon: 'talk', label: 'talk' },
  { key: '3', icon: 'sprint', label: 'sprint' },
  { key: '4', icon: 'map', label: 'map' },
  { key: '5', icon: 'cash', label: 'trade' },
  { key: '6', icon: 'wanted', label: 'heat' },
  { key: '7', icon: 'rep', label: 'rep' },
  { key: '8', icon: 'mana', label: 'focus' },
];

const MMOHUD: React.FC<MMOHUDProps> = ({
  health,
  stamina,
  mana,
  level,
  experience,
  maxExperience,
  playersOnline,
  money,
  reputation,
  wanted,
  kills,
  playerPosRef,
  playerRotRef,
  otherPlayers = [],
}) => {
  const PANEL = 'border border-[#222428] bg-black/60 backdrop-blur-sm';
  const LABEL = 'text-[10px] tracking-[0.3em] uppercase text-neutral-500';

  const Objective: React.FC<{ label: string; done: boolean }> = ({
    label,
    done,
  }) => (
    <div className="flex items-center gap-2">
      <span style={{ color: done ? '#5a5d62' : '#c03a30' }}>
        {done ? '\u00d7' : '\u2014'}
      </span>
      <span className={done ? 'text-neutral-600 line-through' : ''}>
        {label}
      </span>
    </div>
  );

  const Bar: React.FC<{
    label: string;
    value: number;
    max: number;
    accent: string;
    icon?: string;
  }> = ({ label, value, max, accent, icon }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5">
          {icon && (
            <span style={{ color: accent }}>
              <Icon name={icon} size={11} />
            </span>
          )}
          <span className={LABEL}>{label}</span>
        </span>
        <span className="text-[10px] text-neutral-300">
          {value}/{max}
        </span>
      </div>
      <div className="h-[2px] w-full" style={{ background: '#1f1f22' }}>
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`,
            background: accent,
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="font-mono">
      <div className="absolute top-4 left-4 space-y-2">
        <div className={`${PANEL} p-4 min-w-[300px]`}>
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-[13px] tracking-[0.2em] uppercase text-neutral-200">
              level <span style={{ color: '#c03a30' }}>{level}</span>
            </span>
            <span className={LABEL}>{playersOnline} online</span>
          </div>

          <div className="space-y-3">
            <Bar
              label="Health"
              value={health}
              max={100}
              accent="#c03a30"
              icon="health"
            />
            <Bar
              label="Stamina"
              value={stamina}
              max={100}
              accent="#cfcfd2"
              icon="stamina"
            />
            <Bar
              label="Mana"
              value={mana}
              max={100}
              accent="#5a5d62"
              icon="mana"
            />
          </div>

          <div className="mt-4 pt-4 border-t border-[#1a1c1f]">
            <Bar
              label="Experience"
              value={experience}
              max={maxExperience}
              accent="#8a3b34"
              icon="rep"
            />
          </div>
        </div>

        <div className={`${PANEL} p-3`}>
          <div className={`${LABEL} mb-2`}>street</div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] text-neutral-300">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-neutral-500">
                <Icon name="cash" size={11} />
                CASH
              </span>
              <span style={{ color: '#b0863a' }}>${money}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-neutral-500">
                <Icon name="rep" size={11} />
                REP
              </span>
              <span>{reputation}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-neutral-500">
                <Icon name="kills" size={11} />
                KILLS
              </span>
              <span>{kills}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-neutral-500">
                <Icon name="wanted" size={11} />
                WANTED
              </span>
              <span style={{ color: wanted > 0 ? '#c03a30' : '#5a5d62' }}>
                {'\u2605'.repeat(wanted) || '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4">
        <div className={`${PANEL} p-4`}>
          <div className={`${LABEL} mb-3`}>district map</div>
          <Minimap
            playerPosRef={playerPosRef}
            playerRotRef={playerRotRef}
            otherPlayers={otherPlayers}
          />
        </div>
      </div>

      <div className="absolute bottom-4 right-4">
        <div className={`${PANEL} p-3`}>
          <div className={`${LABEL} mb-2`}>objectives</div>
          <div className="space-y-2 text-[11px] text-neutral-300">
            <Objective
              label={`Make a name (rep ${Math.min(reputation, 50)}/50)`}
              done={reputation >= 50}
            />
            <Objective
              label={`Thin the ranks (${Math.min(kills, 10)}/10 kills)`}
              done={kills >= 10}
            />
            <Objective
              label={`Stack paper ($${Math.min(money, 5000)}/5000)`}
              done={money >= 5000}
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="flex gap-1">
          {ACTION_SLOTS.map((slot) => (
            <div
              key={slot.key}
              title={slot.label}
              className={`${PANEL} relative w-12 h-12 flex flex-col items-center justify-center gap-0.5 text-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer`}
            >
              <Icon name={slot.icon} size={16} />
              <span className="text-[8px] tracking-[0.15em] uppercase">
                {slot.label}
              </span>
              <span className="absolute top-0.5 right-1 text-[8px] text-neutral-600">
                {slot.key}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MMOHUD;
