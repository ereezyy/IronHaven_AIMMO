import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InstantAction from './InstantAction';

vi.mock('@react-three/fiber', () => ({
  Canvas: () => <div data-testid="mock-canvas" />,
  useFrame: () => {},
}));

describe('InstantAction', () => {
  it('shows one Enter District CTA and New runner, not fake demos', () => {
    const onEnterDistrict = vi.fn();
    const onNewRunner = vi.fn();

    render(
      <InstantAction
        onEnterDistrict={onEnterDistrict}
        onNewRunner={onNewRunner}
      />
    );

    expect(screen.getByText('Enter District 01')).toBeTruthy();
    expect(screen.getByText('New runner')).toBeTruthy();
    expect(screen.queryByText('Walk into a conversation')).toBeNull();
    expect(screen.queryByText('Join the live world')).toBeNull();
    expect(screen.queryByText('Pick a fight')).toBeNull();
    expect(
      screen.getByText(/One shared district\. Enter to create or continue/)
    ).toBeTruthy();

    fireEvent.click(screen.getByText('Enter District 01'));
    expect(onEnterDistrict).toHaveBeenCalledTimes(1);
  });
});
