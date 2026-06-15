import React, { useEffect, useState } from 'react';
import { Npc, PlayerSnapshot } from '../game/npc';
import { DialogueOption, npcDialogue } from '../game/dialogue';

interface DialogueOverlayProps {
  npc: Npc;
  stats: PlayerSnapshot;
  onChoose: (option: DialogueOption) => void;
  onClose: () => void;
}

const DialogueOverlay: React.FC<DialogueOverlayProps> = ({
  npc,
  stats,
  onChoose,
  onClose,
}) => {
  const dialogue = npcDialogue(npc, stats);
  const [reply, setReply] = useState<string | null>(null);

  // Terminal-style typewriter reveal for the active line.
  const fullText = reply ?? dialogue.line;
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
    }, 18);
    return () => window.clearInterval(id);
  }, [fullText]);

  const handleSelect = (option: DialogueOption) => {
    onChoose(option);
    if (option.reply) {
      setReply(option.reply);
    } else {
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center pb-28 font-mono">
      <div className="w-full max-w-2xl mx-4 border border-[#222428] bg-black/85 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-[#1a1c1f] px-5 py-3">
          <span className="text-[11px] tracking-[0.28em] uppercase text-neutral-200">
            {dialogue.speaker}
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
            dialogue.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleSelect(option)}
                className="w-full px-5 py-3 text-left text-[12px] tracking-[0.06em] text-neutral-300 hover:bg-[#15171a] hover:text-neutral-100 transition-colors border-b border-[#141517] last:border-b-0"
              >
                <span style={{ color: '#c03a30' }} className="mr-3">
                  [{i + 1}]
                </span>
                {option.label}
                {option.effect && (
                  <span className="ml-2 text-[10px] text-neutral-600">
                    {effectLabel(option.effect)}
                  </span>
                )}
              </button>
            ))
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
}): string {
  const parts: string[] = [];
  if (e.money) parts.push(`${e.money > 0 ? '+' : ''}$${e.money}`);
  if (e.rep) parts.push(`${e.rep > 0 ? '+' : ''}${e.rep} rep`);
  if (e.wanted) parts.push(`${e.wanted > 0 ? '+' : ''}${e.wanted} wanted`);
  return parts.length ? `[${parts.join(' · ')}]` : '';
}

export default DialogueOverlay;
