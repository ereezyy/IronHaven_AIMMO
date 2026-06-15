import React from 'react';

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
}

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
  }> = ({ label, value, max, accent }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={LABEL}>{label}</span>
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
            <Bar label="Health" value={health} max={100} accent="#c03a30" />
            <Bar label="Stamina" value={stamina} max={100} accent="#cfcfd2" />
            <Bar label="Mana" value={mana} max={100} accent="#5a5d62" />
          </div>

          <div className="mt-4 pt-4 border-t border-[#1a1c1f]">
            <Bar
              label="Experience"
              value={experience}
              max={maxExperience}
              accent="#8a3b34"
            />
          </div>
        </div>

        <div className={`${PANEL} p-3`}>
          <div className={`${LABEL} mb-2`}>street</div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] text-neutral-300">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">CASH</span>
              <span style={{ color: '#b0863a' }}>${money}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">REP</span>
              <span>{reputation}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">KILLS</span>
              <span>{kills}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">WANTED</span>
              <span style={{ color: wanted > 0 ? '#c03a30' : '#5a5d62' }}>
                {'\u2605'.repeat(wanted) || '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4">
        <div className={`${PANEL} p-4 min-w-[220px]`}>
          <div className={`${LABEL} mb-3`}>minimap</div>
          <div
            className="w-full aspect-square relative border border-[#1a1c1f]"
            style={{
              background:
                '#0d0d0f linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px) repeat',
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),' +
                'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5" style={{ background: '#c03a30' }} />
            </div>
            <div className="absolute top-2 left-2 w-1 h-1 bg-neutral-500" />
            <div className="absolute bottom-3 right-4 w-1 h-1 bg-neutral-500" />
            <div className="absolute top-1/2 right-3 w-1 h-1 bg-neutral-500" />
          </div>
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
          {[1, 2, 3, 4, 5, 6, 7, 8].map((slot) => (
            <div
              key={slot}
              className={`${PANEL} w-12 h-12 flex items-center justify-center text-[11px] text-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer`}
            >
              {slot}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MMOHUD;
