import React, { useMemo, useState } from 'react';
import {
  ARCHETYPES,
  TINT_PRESETS,
  ACCENT_PRESETS,
  BONUS_POOL,
  CharacterBuild,
  defaultBuild,
  bonusSpent,
  loadBuild,
} from '../game/character';
import { gameAudio } from '../lib/gameAudio';

interface CharacterCreatorProps {
  onComplete: (build: CharacterBuild) => void;
}

const SKILL_KEYS = [
  'combat',
  'stealth',
  'driving',
  'intimidation',
] as const;

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onComplete }) => {
  const existing = loadBuild();
  const [build, setBuild] = useState<CharacterBuild>(
    () => existing || defaultBuild('')
  );

  const spent = bonusSpent(build);
  const remaining = BONUS_POOL - spent;
  const arch =
    ARCHETYPES.find((a) => a.id === build.archetype) || ARCHETYPES[0];

  const previewSkills = useMemo(() => {
    return {
      combat: arch.baseSkills.combat + build.bonuses.combat,
      stealth: arch.baseSkills.stealth + build.bonuses.stealth,
      driving: arch.baseSkills.driving + build.bonuses.driving,
      intimidation: arch.baseSkills.intimidation + build.bonuses.intimidation,
    };
  }, [arch, build.bonuses]);

  const bump = (key: (typeof SKILL_KEYS)[number], dir: 1 | -1) => {
    setBuild((b) => {
      const next = { ...b.bonuses };
      const v = next[key] + dir;
      if (v < 0 || v > 5) return b;
      if (dir > 0 && bonusSpent(b) >= BONUS_POOL) return b;
      next[key] = v;
      return { ...b, bonuses: next };
    });
  };

  const finish = () => {
    const callsign =
      build.callsign.trim().slice(0, 16) ||
      `Runner_${Math.floor(Math.random() * 90 + 10)}`;
    const final = { ...build, callsign };
    void gameAudio.unlock();
    gameAudio.play('ui', 0.25);
    onComplete(final);
  };

  return (
    <div className="min-h-screen bg-[#050507] text-neutral-200 font-mono flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl border border-[#222428] bg-black/85">
        <div className="border-b border-[#1a1c1f] px-5 py-3 flex justify-between text-[10px] tracking-[0.28em] uppercase text-neutral-500">
          <span>iron haven</span>
          <span style={{ color: '#c03a30' }}>character creator</span>
        </div>

        <div className="grid md:grid-cols-2 gap-0">
          {/* Preview */}
          <div className="p-6 border-b md:border-b-0 md:border-r border-[#1a1c1f] flex flex-col items-center justify-center">
            <div
              className="w-28 h-40 relative mb-4"
              style={{
                transform: `scale(${build.appearance.bodyScale})`,
              }}
            >
              <div
                className="absolute inset-x-6 top-0 h-10 rounded-full"
                style={{ background: build.appearance.tint }}
              />
              <div
                className="absolute inset-x-4 top-12 bottom-8 rounded-sm"
                style={{ background: build.appearance.tint }}
              />
              <div
                className="absolute inset-x-2 bottom-0 h-8"
                style={{ background: build.appearance.tint, opacity: 0.85 }}
              />
              <div
                className="absolute left-1/2 -translate-x-1/2 top-16 w-16 h-1"
                style={{ background: build.appearance.accent }}
              />
            </div>
            <div className="text-[11px] tracking-[0.3em] uppercase text-neutral-500">
              {arch.name}
            </div>
            <div className="text-lg tracking-[0.15em] uppercase mt-1">
              {build.callsign || '—'}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] tracking-[0.12em] uppercase text-neutral-500">
              {SKILL_KEYS.map((k) => (
                <div key={k} className="flex justify-between gap-3">
                  <span>{k}</span>
                  <span className="text-neutral-200">{previewSkills[k]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
            <div>
              <div className="text-[10px] tracking-[0.28em] uppercase text-neutral-500 mb-2">
                callsign
              </div>
              <input
                autoFocus
                value={build.callsign}
                onChange={(e) =>
                  setBuild((b) => ({ ...b, callsign: e.target.value }))
                }
                maxLength={16}
                placeholder="YOUR NAME ON THE SHARD"
                className="w-full bg-[#0d0d0f] border border-[#222428] px-3 py-2 text-[13px] tracking-[0.12em] uppercase focus:outline-none focus:border-[#c03a30]"
              />
            </div>

            <div>
              <div className="text-[10px] tracking-[0.28em] uppercase text-neutral-500 mb-2">
                archetype
              </div>
              <div className="space-y-1">
                {ARCHETYPES.map((a) => (
                  <button
                    key={a.id}
                    onClick={() =>
                      setBuild((b) => ({
                        ...b,
                        archetype: a.id,
                        appearance: {
                          ...b.appearance,
                          tint: a.defaultTint,
                        },
                      }))
                    }
                    className={`w-full text-left px-3 py-2 border text-[11px] transition-colors ${
                      build.archetype === a.id
                        ? 'border-[#c03a30] bg-[#c03a30]/10 text-neutral-100'
                        : 'border-[#1a1c1f] text-neutral-400 hover:border-[#333]'
                    }`}
                  >
                    <span className="tracking-[0.15em] uppercase">
                      {a.name}
                    </span>
                    <span className="block text-neutral-600 mt-0.5 normal-case tracking-normal">
                      {a.blurb}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] tracking-[0.28em] uppercase text-neutral-500 mb-2">
                body tint
              </div>
              <div className="flex flex-wrap gap-2">
                {TINT_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() =>
                      setBuild((b) => ({
                        ...b,
                        appearance: { ...b.appearance, tint: c },
                      }))
                    }
                    className="w-7 h-7 border"
                    style={{
                      background: c,
                      borderColor:
                        build.appearance.tint === c ? '#c03a30' : '#333',
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] tracking-[0.28em] uppercase text-neutral-500 mb-2">
                accent
              </div>
              <div className="flex flex-wrap gap-2">
                {ACCENT_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() =>
                      setBuild((b) => ({
                        ...b,
                        appearance: { ...b.appearance, accent: c },
                      }))
                    }
                    className="w-7 h-7 border"
                    style={{
                      background: c,
                      borderColor:
                        build.appearance.accent === c ? '#fff' : '#333',
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] tracking-[0.28em] uppercase text-neutral-500 mb-2">
                <span>skill points</span>
                <span style={{ color: remaining ? '#c03a30' : '#5a5d62' }}>
                  {remaining} left
                </span>
              </div>
              {SKILL_KEYS.map((k) => (
                <div
                  key={k}
                  className="flex items-center justify-between py-1.5 text-[11px] tracking-[0.12em] uppercase"
                >
                  <span className="text-neutral-400">{k}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => bump(k, -1)}
                      className="w-7 h-7 border border-[#222428] text-neutral-400 hover:text-white"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-neutral-100">
                      {build.bonuses[k]}
                    </span>
                    <button
                      onClick={() => bump(k, 1)}
                      className="w-7 h-7 border border-[#222428] text-neutral-400 hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-[10px] tracking-[0.28em] uppercase text-neutral-500 mb-2">
                scale {build.appearance.bodyScale.toFixed(2)}
              </div>
              <input
                type="range"
                min={0.9}
                max={1.1}
                step={0.02}
                value={build.appearance.bodyScale}
                onChange={(e) =>
                  setBuild((b) => ({
                    ...b,
                    appearance: {
                      ...b.appearance,
                      bodyScale: parseFloat(e.target.value),
                    },
                  }))
                }
                className="w-full accent-[#c03a30]"
              />
            </div>

            <button
              onClick={finish}
              className="w-full border border-[#c03a30] bg-[#c03a30]/15 py-3 text-[11px] tracking-[0.28em] uppercase text-neutral-100 hover:bg-[#c03a30]/25 transition-colors"
            >
              deploy to district
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterCreator;
