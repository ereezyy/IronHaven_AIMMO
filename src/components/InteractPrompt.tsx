import React from 'react';
import { PROMPT, COLORS } from '../game/uiTheme';

export interface PromptItem {
  id: string;
  keyLabel: string;
  text: string;
}

interface InteractPromptProps {
  items: PromptItem[];
}

/**
 * Single stacked proximity prompt — avoids the old bottom-32/40/48/56 cascade
 * that collided with chat and the ability hotbar.
 */
const InteractPrompt: React.FC<InteractPromptProps> = ({ items }) => {
  if (!items.length) return null;
  return (
    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[25] flex flex-col items-center gap-1.5 pointer-events-none max-w-[90vw]">
      {items.map((item) => (
        <div key={item.id} className={PROMPT}>
          press <span style={{ color: COLORS.accent }}>{item.keyLabel}</span>{' '}
          {item.text}
        </div>
      ))}
    </div>
  );
};

export default InteractPrompt;
