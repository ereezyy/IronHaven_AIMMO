import React, { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { recordWebGLContextEvent } from '../lib/crashBreadcrumb';

/**
 * Tracks WebGL context loss on the active canvas. While the context is lost,
 * gl.getContextAttributes() returns null, and postprocessing's
 * EffectComposer.addPass reads `.alpha` off it during React re-renders —
 * a hard crash. Returns true while the context is lost.
 */
export function useWebGLContextLost(): boolean {
  const gl = useThree((state) => state.gl);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    const canvas = gl.domElement;
    // Three's WebGLRenderer already preventDefault()s contextlost, which is
    // what lets the browser attempt restoration; we only observe here.
    const onLost = () => {
      recordWebGLContextEvent('webglcontextlost');
      setLost(true);
    };
    const onRestored = () => {
      recordWebGLContextEvent('webglcontextrestored');
      setLost(false);
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    };
  }, [gl]);

  return lost;
}

/**
 * Unmounts children while the WebGL context is lost so they never touch a
 * null context, then remounts them against the restored context. Wrap
 * EffectComposer (and anything else that reads context attributes) in this.
 */
export default function ContextLossGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const lost = useWebGLContextLost();
  if (lost) return null;
  return <>{children}</>;
}
