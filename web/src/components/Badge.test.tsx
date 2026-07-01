import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeverityBadge, StatusBadge } from './Badge';

describe('SeverityBadge', () => {
  it('renders the severity label', () => {
    render(<SeverityBadge severity="Critical" />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });
});

describe('StatusBadge', () => {
  it('renders a human-readable label for InProgress', () => {
    render(<StatusBadge status="InProgress" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders the label as-is for single-word statuses', () => {
    render(<StatusBadge status="Closed" />);
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });
});
