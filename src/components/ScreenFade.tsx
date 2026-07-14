import React, { useEffect, useState } from 'react';

interface ScreenFadeProps {
  /** When true, fades to black then calls onMidpoint / onDone. */
  active: boolean;
  durationMs?: number;
  onMidpoint?: () => void;
  onDone?: () => void;
  color?: string;
  zIndex?: number;
}

/**
 * Full-screen fade for view transitions (intro → menu → game).
 */
const ScreenFade: React.FC<ScreenFadeProps> = ({
  active,
  durationMs = 700,
  onMidpoint,
  onDone,
  color = '#050507',
  zIndex = 60,
}) => {
  const [opacity, setOpacity] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setOpacity(0);
      setVisible(false);
      return;
    }
    setVisible(true);
    const half = durationMs / 2;
    // Fade in
    requestAnimationFrame(() => setOpacity(1));
    const mid = window.setTimeout(() => {
      onMidpoint?.();
      // Fade out
      setOpacity(0);
    }, half);
    const end = window.setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, durationMs);
    return () => {
      window.clearTimeout(mid);
      window.clearTimeout(end);
    };
  }, [active, durationMs, onMidpoint, onDone]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex,
        background: color,
        opacity,
        transition: `opacity ${durationMs / 2}ms ease`,
      }}
    />
  );
};

export default ScreenFade;
