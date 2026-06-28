import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

function HarnessProbe() {
  return <button type="button">React test ready</button>;
}

describe('React test harness', () => {
  it('renders a component in jsdom', () => {
    render(<HarnessProbe />);

    expect(screen.getByRole('button', { name: 'React test ready' })).toBeInTheDocument();
  });
});
