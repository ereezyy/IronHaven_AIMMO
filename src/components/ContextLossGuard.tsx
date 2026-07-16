import React, { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { recordWebGLContextEvent } from '../lib/crashBreadcrumb';
import { degradeGfxTier, type GfxTier } from '../lib/graphicsQuality';

/**
 * Tracks WebGL context loss on the active canvas. While the context is lost,
 * gl.getContextAttributes() returns null, and postprocessing's
 * EffectComposer.addPass reads `.alpha` off it during React re-renders —
 * a hard crash. Returns true while the context is lost.
 *
 * Each loss steps the persistent graphics tier down so the next composer
 * mount (and next session) runs lighter and is less likely to TDR again.
 */
export function useWebGLContextLost(onDegrade?: (tier: GfxTier) => void): {
  lost: boolean;
  /** Bump this as a React key on children after restore so GPU resources re-init. */
  restoreGen: number;
} {
  const gl = useThree((state) => state.gl);
  const [lost, setLost] = useState(false);
  const [restoreGen, setRestoreGen] = useState(0);
  const onDegradeRef = useRef(onDegrade);
  onDegradeRef.current = onDegrade;

  useEffect(() => {
    const canvas = gl.domElement;
    // Three's WebGLRenderer already preventDefault()s contextlost, which is
    // what lets the browser attempt restoration; we only observe here.
    const onLost = () => {
      recordWebGLContextEvent('webglcontextlost');
      const next = degradeGfxTier();
      console.warn(`[ironhaven] WebGL context lost — graphics tier → ${next}`);
      onDegradeRef.current?.(next);
      setLost(true);
    };
    const onRestored = () => {
      recordWebGLContextEvent('webglcontextrestored');
      setLost(false);
      // Force EffectComposer (and any other children) to fully remount
      // against the fresh context — half-restored passes are a black screen.
      setRestoreGen((g) => g + 1);
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    };
  }, [gl]);

  return { lost, restoreGen };
}

/**
 * Unmounts children while the WebGL context is lost so they never touch a
 * null context, then remounts them against the restored context. Wrap
 * EffectComposer (and anything else that reads context attributes) in this.
 */
export default function ContextLossGuard({
  children,
  onDegrade,
}: {
  children: React.ReactNode;
  onDegrade?: (tier: GfxTier) => void;
}) {
  const { lost, restoreGen } = useWebGLContextLost(onDegrade);
  if (lost) return null;
  return <React.Fragment key={restoreGen}>{children}</React.Fragment>;
}
