import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusTracker } from './StatusTracker';

describe('StatusTracker', () => {
  it('marks steps before the current status as completed', () => {
    render(<StatusTracker current="Resolved" />);
    expect(screen.getByTestId('status-step-Open')).toHaveAttribute('data-state', 'completed');
    expect(screen.getByTestId('status-step-InProgress')).toHaveAttribute('data-state', 'completed');
    expect(screen.getByTestId('status-step-Resolved')).toHaveAttribute('data-state', 'current');
    expect(screen.getByTestId('status-step-Closed')).toHaveAttribute('data-state', 'pending');
  });

  it('marks Open as current and every later step as pending for a new incident', () => {
    render(<StatusTracker current="Open" />);
    expect(screen.getByTestId('status-step-Open')).toHaveAttribute('data-state', 'current');
    expect(screen.getByTestId('status-step-InProgress')).toHaveAttribute('data-state', 'pending');
    expect(screen.getByTestId('status-step-Resolved')).toHaveAttribute('data-state', 'pending');
    expect(screen.getByTestId('status-step-Closed')).toHaveAttribute('data-state', 'pending');
  });

  it('renders all four step labels', () => {
    render(<StatusTracker current="InProgress" />);
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });
});
