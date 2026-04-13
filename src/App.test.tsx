import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from './App';

// Setup mock for Three.js which may have issues in JSDOM
import { vi } from 'vitest';
vi.mock('@react-three/fiber', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Canvas: ({ children }: any) => (
    <div data-testid="mock-canvas">{children}</div>
  ),
}));

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();
  });
});
