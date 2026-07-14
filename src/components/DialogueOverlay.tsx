import React, { useEffect, useState } from 'react';
import { Npc, PlayerSnapshot } from '../game/npc';
import { DialogueOption, npcDialogue } from '../game/dialogue';
import { aiConfigured, aiGreeting, aiReply } from '../lib/npcAi';
import { gameAudio } from '../lib/gameAudio';

interface DialogueOverlayProps {
  npc: Npc;
  stats: PlayerSnapshot;
  onChoose: (option: DialogueOption) => void;
  onClose: () => void;
  /** Player cash — used to grey out options that cost more than you have. */
  money?: number;
}

const DialogueOverlay: React.FC<DialogueOverlayProps> = ({
  npc,
  stats,
  onChoose,
  onClose,
  money = 0,
}) => {
  const scripted = npcDialogue(npc, stats);
  const [aiLine, setAiLine] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLive, setAiLive] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');
  const [thinking, setThinking] = useState(false);

  // Opening: scripted immediately, Grok overwrites when ready.
  useEffect(() => {
    let cancelled = false;
    setAiLine(null);
    setReply(null);
    setAiLive(false);
    if (!aiConfigured()) return;
    setAiLoading(true);
    aiGreeting(npc, stats)
      .then((line) => {
        if (cancelled || !line) return;
        setAiLine(line);
        setAiLive(true);
        gameAudio.play('talk', 0.2);
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Only re-roll when the NPC changes mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npc.id]);

  const speaker = scripted.speaker;
  const fullText = reply ?? aiLine ?? scripted.line;
  const [typed, setTyped] = useState('');
  const [typingDone, setTypingDone] = useState(false);

  useEffect(() => {
    setTyped('');
    setTypingDone(false);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(fullText.slice(0, i));
      if (i >= fullText.length) {
        window.clearInterval(id);
        setTypingDone(true);
      }
    }, 14);
    return () => window.clearInterval(id);
  }, [fullText]);

  const canAfford = (option: DialogueOption) => {
    const cost = option.effect?.money ?? 0;
    return cost >= 0 || money + cost >= 0;
  };

  const handleSelect = (option: DialogueOption) => {
    if (!canAfford(option)) return;
    gameAudio.play('ui', 0.15);
    onChoose(option);
    if (option.reply) {
      setReply(option.reply);
    } else {
      onClose();
    }
  };

  const sendFreeform = async () => {
    const msg = freeText.trim();
    if (!msg || thinking) return;
    setThinking(true);
    setFreeText('');
    gameAudio.play('talk', 0.15);
    // Still record that the player talked (street contracts).
    onChoose({ label: msg, reply: '' });
    const line = await aiReply(npc, stats, msg);
    setThinking(false);
    if (line) {
      setReply(line);
      setAiLive(true);
    } else {
      setReply('…they stare at you and say nothing useful.');
    }
  };

  // Number keys [1]–[9] select options while choices are visible.
  useEffect(() => {
    if (reply) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const n = parseInt(e.key, 10);
      if (!Number.isFinite(n) || n < 1 || n > 9) return;
      const option = scripted.options[n - 1];
      if (!option) return;
      const cost = option.effect?.money ?? 0;
      if (cost < 0 && money + cost < 0) return;
      handleSelect(option);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reply, scripted.options, money]);

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center pb-28 font-mono bg-black/40">
      <div className="w-full max-w-2xl mx-4 border border-[#222428] bg-black/85 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-[#1a1c1f] px-5 py-3">
          <span className="text-[11px] tracking-[0.28em] uppercase text-neutral-200">
            {speaker}
            {aiLive && (
              <span className="ml-2 text-[9px] tracking-[0.2em] text-[#c03a30]">
                · grok
              </span>
            )}
            {aiLoading && !aiLive && (
              <span className="ml-2 text-[9px] tracking-[0.2em] text-neutral-600">
                · linking…
              </span>
            )}
          </span>
          <button
            onClick={onClose}
            className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 hover:text-neutral-200"
          >
            esc
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-[14px] leading-relaxed text-neutral-300">
            <span style={{ color: '#c03a30' }} className="mr-2">
              &gt;
            </span>
            {typed}
            <span
              className={`ml-0.5 inline-block h-[1em] w-[0.5em] translate-y-[2px] bg-neutral-300 ${
                typingDone ? 'animate-pulse' : ''
              }`}
            />
          </p>
        </div>

        <div className="border-t border-[#1a1c1f]">
          {reply ? (
            <button
              onClick={onClose}
              className="w-full px-5 py-3 text-left text-[12px] tracking-[0.12em] uppercase text-neutral-300 hover:bg-[#15171a] hover:text-neutral-100 transition-colors"
            >
              <span style={{ color: '#c03a30' }} className="mr-3">
                &gt;
              </span>
              continue
            </button>
          ) : (
            <>
              {scripted.options.map((option, i) => {
                const affordable = canAfford(option);
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(option)}
                    disabled={!affordable}
                    className={`w-full px-5 py-3 text-left text-[12px] tracking-[0.06em] transition-colors border-b border-[#141517] ${
                      affordable
                        ? 'text-neutral-300 hover:bg-[#15171a] hover:text-neutral-100'
                        : 'text-neutral-600 cursor-not-allowed'
                    }`}
                  >
                    <span style={{ color: '#c03a30' }} className="mr-3">
                      [{i + 1}]
                    </span>
                    {option.label}
                    {!affordable && (
                      <span className="ml-2 text-[10px] text-neutral-600">
                        [can&apos;t afford]
                      </span>
                    )}
                    {option.effect && affordable && (
                      <span className="ml-2 text-[10px] text-neutral-600">
                        {effectLabel(option.effect)}
                      </span>
                    )}
                  </button>
                );
              })}

              {aiConfigured() && (
                <div className="flex gap-2 px-3 py-3 border-t border-[#141517]">
                  <input
                    type="text"
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void sendFreeform();
                      }
                    }}
                    placeholder={
                      thinking ? 'they are thinking…' : 'say anything (grok)…'
                    }
                    disabled={thinking}
                    maxLength={160}
                    className="flex-1 bg-[#0d0d0f] border border-[#222428] px-3 py-2 text-neutral-200 text-[12px] placeholder:text-neutral-600 focus:outline-none focus:border-[#c03a30]"
                  />
                  <button
                    onClick={() => void sendFreeform()}
                    disabled={thinking || !freeText.trim()}
                    className="border border-[#222428] px-3 py-2 text-[10px] tracking-[0.2em] uppercase text-neutral-300 hover:border-[#c03a30] disabled:opacity-40"
                  >
                    say
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function effectLabel(e: {
  rep?: number;
  money?: number;
  wanted?: number;
  health?: number;
}): string {
  const parts: string[] = [];
  if (e.money) parts.push(`${e.money > 0 ? '+' : ''}$${e.money}`);
  if (e.health) parts.push(`${e.health > 0 ? '+' : ''}${e.health} hp`);
  if (e.rep) parts.push(`${e.rep > 0 ? '+' : ''}${e.rep} rep`);
  if (e.wanted) parts.push(`${e.wanted > 0 ? '+' : ''}${e.wanted} wanted`);
  return parts.length ? `[${parts.join(' · ')}]` : '';
}

export default DialogueOverlay;
