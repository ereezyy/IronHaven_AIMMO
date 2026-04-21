import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock Three.js and R3F
vi.mock('@react-three/fiber', () => ({
    Canvas: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'canvas' }, children),
    useFrame: vi.fn(),
    useThree: () => ({
        size: { width: 100, height: 100 },
        viewport: { width: 100, height: 100, factor: 1 },
        camera: { position: [0, 0, 0] },
        scene: { add: vi.fn(), remove: vi.fn() },
    }),
}));

vi.mock('@react-three/drei', () => ({
    Box: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
    Text: ({ children, children: text }: { children: React.ReactNode, text?: string }) => React.createElement('div', null, text || children),
    OrbitControls: () => null,
}));

// Mock Three.js objects
const THREE = {
  Vector3: vi.fn().mockImplementation(() => ({
    set: vi.fn(),
    lerp: vi.fn(),
    copy: vi.fn(),
  })),
  Color: vi.fn(),
  Mesh: vi.fn(),
  BoxGeometry: vi.fn(),
  MeshStandardMaterial: vi.fn(),
};

vi.mock('three', () => ({
  ...THREE,
  default: THREE,
}));

// Suppress Three.js related warnings in tests
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && (
    args[0].includes('incorrect casing') ||
    args[0].includes('unrecognized in this browser') ||
    args[0].includes('React does not recognize the')
  )) {
    return;
  }
  originalConsoleError(...args);
};
