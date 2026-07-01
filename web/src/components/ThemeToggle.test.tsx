import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  it('defaults to light mode', () => {
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('switches to dark mode and persists the choice on click', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByLabelText('Toggle theme'));

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('incidenthub-theme')).toBe('dark');
  });

  it('toggles back to light mode on a second click', () => {
    render(<ThemeToggle />);
    const button = screen.getByLabelText('Toggle theme');

    fireEvent.click(button);
    fireEvent.click(button);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('incidenthub-theme')).toBe('light');
  });
});
